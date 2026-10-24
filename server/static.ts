import express, { type Express } from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function serveStatic(app: Express) {
  const distPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "public");
  if (!fs.existsSync(path.join(distPath, "index.html"))) throw new Error("Build the client before starting production");
  app.use(express.static(distPath));
  app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
}
