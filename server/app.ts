import express, { type ErrorRequestHandler } from "express";
import { z } from "zod";
import { MulterError } from "multer";
import { registerRoutes } from "./routes";
import { setupAuth, type AuthOptions } from "./auth";
import type { IStorage } from "./storage";
import { boundRequestStructure } from "./request-limits";

export interface AppOptions extends AuthOptions {
  storage: IStorage;
  uploadDir?: string;
}

// Importing/creating an app never opens a database or a listening socket.
export function createApp(options: AppOptions) {
  const app = express();
  app.disable("x-powered-by");
  if (options.production) app.set("trust proxy", 1);
  app.use(express.json({ limit: "6mb", inflate: false }));
  app.use(express.urlencoded({ extended: false, limit: "6mb", inflate: false, parameterLimit: 1000 }));
  app.use(boundRequestStructure);
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "same-origin");
    res.setHeader("X-Frame-Options", "DENY");
    if (options.production) {
      res.setHeader("Strict-Transport-Security", "max-age=31536000");
      res.setHeader("Content-Security-Policy", [
        "default-src 'self'", "script-src 'self'", "script-src-attr 'none'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' data: https://fonts.gstatic.com", "img-src 'self' data: blob: https:",
        "connect-src 'self'", "frame-src 'self' blob:", "object-src 'none'",
        "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'",
      ].join("; "));
    }
    if (req.path.startsWith("/api/")) res.setHeader("Cache-Control", "no-store");
    // Session cookies must never authorize a cross-origin write.
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      const origin = req.get("origin");
      let foreignOrigin = false;
      if (origin) {
        try { foreignOrigin = new URL(origin).origin !== `${req.protocol}://${req.get("host")}`; }
        catch { foreignOrigin = true; }
      }
      if (foreignOrigin || req.get("sec-fetch-site") === "cross-site") {
        res.status(403).json({ message: "Cross-origin requests are not allowed" });
        return;
      }
    }
    next();
  });
  app.get("/healthz", async (_req,res) => {
    try { await options.storage.getProject(0); res.json({status:"ok"}); }
    catch { res.status(503).json({status:"unavailable"}); }
  });
  setupAuth(app, options.storage, options);
  registerRoutes(app, options.storage, options.uploadDir);
  app.use("/api", (_req, res) => res.status(404).json({ message: "Not found" }));
  app.use(errorHandler);
  return app;
}

export const errorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) return next(error);
  if (error instanceof z.ZodError) {
    res.status(400).json({ message: error.issues.map(issue => `${issue.path.join(".") || "request"}: ${issue.message}`).join("; "), code: "VALIDATION_ERROR", errors: error.issues.map(({ path, message }) => ({ path, message })) });
    return;
  }
  if (error instanceof MulterError) {
    res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ message: "Invalid upload (maximum image size is 5 MB)" });
    return;
  }
  const status = Number(error.status || error.statusCode) || 500;
  res.status(status >= 400 && status < 600 ? status : 500).json({
    message: status < 500 ? error.message : "Internal server error",
    ...(status < 500 && error.code ? { code: error.code } : {}),
  });
};
