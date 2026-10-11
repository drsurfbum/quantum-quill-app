import express, { type ErrorRequestHandler } from "express";
import { z } from "zod";
import { MulterError } from "multer";
import { registerRoutes } from "./routes";
import { setupAuth, type AuthOptions } from "./auth";
import type { IStorage } from "./storage";

export interface AppOptions extends AuthOptions {
  storage: IStorage;
  uploadDir?: string;
}

// Importing/creating an app never opens a database or a listening socket.
export function createApp(options: AppOptions) {
  const app = express();
  app.disable("x-powered-by");
  if (options.production) app.set("trust proxy", 1);
  app.use(express.json({ limit: "6mb" }));
  app.use(express.urlencoded({ extended: false, limit: "6mb" }));
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
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
  setupAuth(app, options.storage, options);
  registerRoutes(app, options.storage, options.uploadDir);
  app.use("/api", (_req, res) => res.status(404).json({ message: "Not found" }));
  app.use(errorHandler);
  return app;
}

export const errorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) return next(error);
  if (error instanceof z.ZodError) {
    res.status(400).json({ message: "Invalid request data", errors: error.issues.map(({ path, message }) => ({ path, message })) });
    return;
  }
  if (error instanceof MulterError) {
    res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ message: "Invalid upload (maximum image size is 5 MB)" });
    return;
  }
  const status = Number(error.status || error.statusCode) || 500;
  res.status(status >= 400 && status < 600 ? status : 500).json({
    message: status < 500 ? error.message : "Internal server error",
  });
};
