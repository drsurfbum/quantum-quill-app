import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { AppReader, readConfig, ReadError } from "./app-reader";
import { createMcpServer } from "./server";

async function main() {
  const config = readConfig(process.env);
  delete process.env.QQ_MCP_TOKEN;
  const reader = new AppReader(config);
  // Tool metadata is discoverable; every actual call requires current app permission.
  const server = createMcpServer(reader);
  const transport = new StdioServerTransport(process.stdin, process.stdout, { maxBufferSize: 1024 * 1024 });
  let closing = false;
  const close = async () => {
    if (closing) return;
    closing = true;
    await server.close();
  };
  process.once("SIGINT", () => { void close(); });
  process.once("SIGTERM", () => { void close(); });
  process.stdin.once("end", () => { void close(); });
  await server.connect(transport);
}
main().catch(error => {
  // stdout belongs exclusively to MCP. Never include raw exceptions or configuration.
  process.stderr.write(`${error instanceof ReadError ? error.message : "QQ MCP startup failed."}\n`);
  process.exitCode = 1;
});
