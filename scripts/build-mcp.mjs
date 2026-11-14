import { build } from "esbuild";

// Separate opt-in executable; the web service never imports or starts MCP.
await build({
  entryPoints: ["server/mcp/index.ts"], platform: "node", packages: "external",
  bundle: true, format: "esm", outfile: "dist/mcp.js",
});
