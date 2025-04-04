import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as UserType } from "@shared/schema";

// Define user type for authentication
type AuthUser = {
  id: number;
  username: string;
  email: string;
  password: string;
  createdAt: Date | null;
};

declare global {
  namespace Express {
    interface User extends AuthUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  // Set up proxy for cookies to work correctly in Replit environment
  app.set('trust proxy', 1);
  
  // Set up session
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "quantum-quill-development-secret",
    resave: true, 
    saveUninitialized: true,
    store: storage.sessionStore,
    name: 'quill_sid', // Renamed to avoid potential name conflicts
    cookie: {
      // In Replit environment, secure must be false
      secure: false,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
      httpOnly: true,
      sameSite: 'lax', // Specific sameSite setting to ensure cookies work across sites
      path: '/'
    }
  };
  
  console.log("Session configuration:", {
    secret: process.env.SESSION_SECRET ? "From environment" : "Using default",
    resave: true,
    saveUninitialized: true,
    cookieSecure: false,
    cookieMaxAge: "7 days",
    trustProxy: true
  });

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure local strategy
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false, { message: "Invalid username or password" });
        }
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    })
  );

  // Serialize/deserialize user
  passport.serializeUser((user, done) => {
    console.log("Serializing user:", user.id);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    console.log("Deserializing user with ID:", id);
    try {
      const user = await storage.getUser(id);
      if (!user) {
        console.log("User not found during deserialization");
        return done(null, false);
      }
      console.log("User deserialized successfully:", user.username);
      done(null, user);
    } catch (error) {
      console.error("Error deserializing user:", error);
      done(error);
    }
  });

  // Authentication routes
  app.post("/api/register", async (req, res) => {
    try {
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Hash password and create user
      const hashedPassword = await hashPassword(req.body.password);
      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
      });

      // Log in the user automatically
      req.login(user, (err) => {
        if (err) return res.status(500).json({ message: "Login failed after registration" });
        return res.status(201).json({ id: user.id, username: user.username, email: user.email });
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/login", (req, res, next) => {
    console.log(`
===== Login Attempt =====
Username: ${req.body.username}
Session ID: ${req.sessionID}
Headers: ${JSON.stringify({
  "content-type": req.headers["content-type"],
  "cookie": req.headers["cookie"] ? "Present" : "None"
})}
========================
    `);
    
    passport.authenticate("local", (err: any, user: UserType | false, info: { message?: string }) => {
      if (err) {
        console.log("Login error:", err);
        return next(err);
      }
      
      if (!user) {
        console.log("Login failed - invalid credentials");
        return res.status(401).json({ message: info?.message || "Authentication failed" });
      }
      
      req.login(user, (loginErr) => {
        if (loginErr) {
          console.log("Login error after auth:", loginErr);
          return next(loginErr);
        }
        
        console.log(`
===== Login Success =====
User: ${user.username} (ID: ${user.id})
Session ID: ${req.sessionID}
Session: ${req.session ? "Exists" : "Missing"}
=======================
        `);
        
        // Add session cookie directly for clarity
        res.cookie('quill_sid', req.sessionID, {
          httpOnly: true,
          secure: false,
          maxAge: 1000 * 60 * 60 * 24 * 7,
          sameSite: 'lax',
          path: '/'
        });
        
        // Return the user info
        return res.json({ id: user.id, username: user.username, email: user.email });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) return res.status(500).json({ message: "Logout failed" });
      res.status(200).json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/user", (req, res) => {
    console.log("GET /api/user - Session ID:", req.sessionID, "Is authenticated:", req.isAuthenticated());
    
    // Check for token-based auth if session auth fails
    if (!req.isAuthenticated()) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        
        // Simple token validation 
        if (token && token.startsWith('user-')) {
          try {
            // Extract user ID from token - format is user-{userId}-{timestamp}
            const parts = token.split('-');
            if (parts.length >= 2) {
              const userId = parseInt(parts[1]);
              if (!isNaN(userId)) {
                // Get user from storage
                storage.getUser(userId).then(user => {
                  if (user) {
                    console.log("User authenticated via token:", user.username);
                    return res.json({ id: user.id, username: user.username, email: user.email });
                  } else {
                    console.log("Token user not found");
                    return res.status(401).json({ message: "Not authenticated" });
                  }
                }).catch(err => {
                  console.error("Error authenticating via token:", err);
                  return res.status(401).json({ message: "Not authenticated" });
                });
                return; // Early return to avoid the rest of the function
              }
            }
          } catch (error) {
            console.error("Token authentication error:", error);
          }
        }
      }
      
      console.log("User not authenticated");
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const user = req.user;
    console.log("User authenticated:", user.username);
    res.json({ id: user.id, username: user.username, email: user.email });
  });
}