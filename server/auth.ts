import { Passport } from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import type { Express, RequestHandler } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { z } from "zod";
import type { IStorage } from "./storage";
import type { User as UserType } from "@shared/schema";

declare global { namespace Express { interface User extends UserType {} } }
export interface AuthOptions { secret?: string; production?: boolean }
const scryptAsync = promisify(scrypt);
const credentialsSchema = z.object({ username: z.string().min(1).max(200), password: z.string().min(1).max(1024) }).strict();
const registrationSchema = credentialsSchema.extend({ email: z.string().email().max(320), password: z.string().min(8).max(1024) });
const publicUser = (user: UserType) => ({ id: user.id, username: user.username, email: user.email });

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}
export async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt, extra] = stored.split(".");
  if (extra || !/^[a-f0-9]{128}$/i.test(hashed || "") || !/^[a-f0-9]{32}$/i.test(salt || "")) return false;
  const suppliedBuf = await scryptAsync(supplied, salt, 64) as Buffer;
  return timingSafeEqual(Buffer.from(hashed, "hex"), suppliedBuf);
}

export const requireUser: RequestHandler = (req, res, next) => {
  if (!req.isAuthenticated() || !req.user) { res.status(401).json({ message: "Not authenticated" }); return; }
  const expectedAccount = req.get("X-QQ-Account");
  if (expectedAccount !== undefined && expectedAccount !== String(req.user.id)) {
    res.status(409).json({ code: "ACCOUNT_CHANGED", message: "The signed-in account changed in another tab. Sign in again to continue." });
    return;
  }
  next();
};

export function setupAuth(app: Express, storage: IStorage, options: AuthOptions) {
  if (!options.secret || options.secret.length < 32) throw new Error("SESSION_SECRET must contain at least 32 characters");
  const cookie = { secure: !!options.production, httpOnly: true, sameSite: "lax" as const, path: "/" };
  app.use(session({
    secret: options.secret, resave: false, saveUninitialized: false,
    store: storage.sessionStore, name: "quill_sid", cookie: { ...cookie, maxAge: 7 * 24 * 60 * 60 * 1000 },
  }));
  const passport = new Passport();
  passport.use(new LocalStrategy(async (username, password, done) => {
    try {
      const user = await storage.getUserByUsername(username);
      if (!user || !await comparePasswords(password, user.password)) return done(null, false);
      done(null, user);
    } catch (error) { done(error); }
  }));
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try { done(null, await storage.getUser(id) || false); } catch (error) { done(error); }
  });
  app.use(passport.initialize());
  app.use(passport.session());

  app.post("/api/register", async (req, res, next) => {
    try {
      const data = registrationSchema.parse(req.body);
      if (await storage.getUserByUsername(data.username)) { res.status(409).json({ message: "Username already exists" }); return; }
      const user = await storage.createUser({ ...data, password: await hashPassword(data.password) });
      req.login(user, (error) => {
        if (error) return next(error);
        req.session.save((error) => error ? next(error) : res.status(201).json(publicUser(user)));
      });
    } catch (error) { next(error); }
  });
  app.post("/api/login", (req, res, next) => {
    const result = credentialsSchema.safeParse(req.body);
    if (!result.success) { res.status(400).json({ message: "Username and password are required" }); return; }
    passport.authenticate("local", (error: unknown, user: UserType | false) => {
      if (error) return next(error);
      if (!user) { res.status(401).json({ message: "Invalid username or password" }); return; }
      req.login(user, (error) => {
        if (error) return next(error);
        req.session.save((error) => error ? next(error) : res.json(publicUser(user)));
      });
    })(req, res, next);
  });
  app.post("/api/logout", requireUser, (req, res, next) => {
    req.logout((error) => {
      if (error) return next(error);
      req.session.destroy((error) => {
        if (error) return next(error);
        res.clearCookie("quill_sid", cookie);
        res.json({ message: "Logged out" });
      });
    });
  });
  app.get("/api/user", requireUser, (req, res) => res.json(publicUser(req.user!)));
}
