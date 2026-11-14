import { readFile } from 'node:fs/promises';
import { build } from "esbuild";

// Compile out the development-only Vite integration so a production install
// can omit build tools and test dependencies entirely.
await build({
  entryPoints: ["server/index.ts"], platform: "node", packages: "external",
  bundle: true, format: "esm", outfile: "dist/index.js",
  define: { "process.env.NODE_ENV": '"production"', __QQ_FIELD_GUIDE__: JSON.stringify(await readFile('docs/QQ_FIELD_GUIDE.md','utf8')) },
});

await import("./build-mcp.mjs");
