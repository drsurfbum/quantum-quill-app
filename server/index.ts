import { configuredAssistant } from "./assistant/provider";
import { createServer } from "http";
import { pathToFileURL } from "url";
import { createApp, errorHandler } from "./app";
import { serveStatic } from "./static";
export { createApp } from "./app";

export async function startServer() {
  // Load database/runtime integrations only when explicitly starting the server.
  const [{ DatabaseStorage }, { initPlotTemplates }] = await Promise.all([
    import("./database-storage"), import("./init-plot-templates"),
  ]);
  const storage = new DatabaseStorage();
  // Refuse to serve writes before the separately reviewed history migration.
  await storage.listProseVersions(0,"chapters",0);
  const app = createApp({ storage, assistant:configuredAssistant(process.env), uploadDir: process.env.UPLOAD_DIR, secret: process.env.SESSION_SECRET, production: process.env.NODE_ENV === "production" });
  await initPlotTemplates();
  const server = createServer(app);
  if (process.env.NODE_ENV === "production") serveStatic(app);
  else await (await import("./vite")).setupVite(app, server);
  app.use(errorHandler);
  const port = Number(process.env.PORT || 5000);
  server.listen({ port, host: process.env.HOST || "127.0.0.1" }, () => console.log(`Quantum Quill listening on port ${port}`));
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer().catch(() => {
    console.error("Unable to start Quantum Quill. Check database and session configuration.");
    process.exitCode = 1;
  });
}
