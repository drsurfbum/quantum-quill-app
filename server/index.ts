import { createServer } from "http";
import { pathToFileURL } from "url";
import { createApp, errorHandler } from "./app";
export { createApp } from "./app";

export async function startServer() {
  // Load database/runtime integrations only when explicitly starting the server.
  const [{ DatabaseStorage }, { initPlotTemplates }, { setupVite, serveStatic, log }] = await Promise.all([
    import("./database-storage"), import("./init-plot-templates"), import("./vite"),
  ]);
  const storage = new DatabaseStorage();
  const app = createApp({ storage, secret: process.env.SESSION_SECRET, production: process.env.NODE_ENV === "production" });
  await initPlotTemplates();
  const server = createServer(app);
  if (app.get("env") === "development") await setupVite(app, server);
  else serveStatic(app);
  app.use(errorHandler);
  const port = Number(process.env.PORT || 5000);
  server.listen({ port, host: process.env.HOST || "127.0.0.1" }, () => log(`serving on port ${port}`));
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer().catch(() => {
    console.error("Unable to start Quantum Quill. Check database and session configuration.");
    process.exitCode = 1;
  });
}
