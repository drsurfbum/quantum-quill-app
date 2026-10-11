import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initPlotTemplates } from "./init-plot-templates";

export async function createApp() {
  const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  // Debug request basic info
  console.log(`
==== Request ====
Path: ${path}
Method: ${req.method}
Session ID: ${req.sessionID || "none"}
Headers: ${JSON.stringify({
  "user-agent": req.headers["user-agent"],
  "content-type": req.headers["content-type"],
  "cookie": req.headers["cookie"] ? "Present" : "None"
})}
================
  `);

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 300) {
        logLine = logLine.slice(0, 299) + "…";
      }

      log(logLine);
    }
  });

  next();
});

  // Initialize plot structure templates
  await initPlotTemplates();
  
  await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  return app;
}

(async () => {
  const app = await createApp();
  const server = await registerRoutes(app);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Serve the API and client together; the local launcher supplies host and port.
  const port = Number(process.env.PORT || 5000);
  server.listen({
    port,
    host: process.env.HOST || "127.0.0.1",
  }, () => {
    log(`serving on port ${port}`);
  });
})();
