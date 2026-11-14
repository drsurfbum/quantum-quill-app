# Local MCP access (read-only preview)

Quantum Quill can be launched as a local Model Context Protocol server for a trusted writing assistant. This is an opt-in **stdio process**, separate from the web app. It does not add an HTTP MCP endpoint, expose a port, connect directly to a database, or start with the hosted app.

Each process is pinned to one account and one project selected by the human operator before launch. The assistant cannot enumerate other projects or switch scope through a tool call. To change projects, stop the process and deliberately configure a new one.

## Setup

1. Use Node **24.x**, run `npm ci --ignore-scripts`, then `npm run build:mcp` in this checkout. `npm run build` also builds the separate `dist/mcp.js` executable.
2. Start your local QQ app using the existing [local setup](../LOCAL_SETUP.md), and sign in using your own local account. The default MCP app origin is `http://127.0.0.1:5055`. Only numeric loopback HTTP origins with an explicit port are accepted (`127.0.0.1` or `[::1]`). Hosted QQ, tunnels, arbitrary URLs and redirects are unsupported.
3. Select the intended project in QQ. Its numeric ID is visible in the project URL and project API response. Find your numeric account ID in the signed-in local `GET /api/user` response, using your browser's Network panel.
4. In that same local browser session, obtain the `quill_sid` cookie from Developer Tools → Application/Storage → Cookies. Pass **only** `quill_sid=VALUE` to `QQ_MCP_SESSION_COOKIE`; do not include cookie attributes or other cookies. This is a session credential: do not paste it into a chat, commit it, share it, or reuse a hosted session. Use a dedicated local browser session so you can revoke it by logging out.
5. Configure a trusted local MCP host to spawn the Node executable directly with the following environment. Use your host's local secret storage/environment injection for the cookie. The placeholders below must be replaced locally, not submitted as tool arguments.

```json
{
  "mcpServers": {
    "quantum-quill-selected-project": {
      "command": "/absolute/path/to/node",
      "args": ["/absolute/path/to/quantum-quill-app/dist/mcp.js"],
      "env": {
        "QQ_MCP_ORIGIN": "http://127.0.0.1:5055",
        "QQ_MCP_ACCOUNT_ID": "YOUR_NUMERIC_ACCOUNT_ID",
        "QQ_MCP_PROJECT_ID": "YOUR_NUMERIC_PROJECT_ID",
        "QQ_MCP_SESSION_COOKIE": "quill_sid=YOUR_LOCAL_SESSION_VALUE"
      }
    }
  }
}
```

Host configuration formats vary; the executable and environment variables are the contract. Use a host that supports local stdio servers and supplies the environment privately. Do not launch via an ordinary `npm run mcp` wrapper in an MCP configuration: npm's banner can contaminate the protocol stream. Use `node dist/mcp.js` directly (or `npm run --silent mcp` for manual use). The bridge does not load `.env`, accept command-line credentials, or create credentials.

Start with a fictional project and a local smoke client. A local transport does **not** guarantee that the assistant stays local: your chosen MCP host may send requested tool results to its model provider. Review that host's privacy controls and explicitly approve any project data disclosure before connecting real writing. The tests below never contact a model provider.

The cookie can authorize more than this bridge exposes. Scope is enforced by this process and QQ's account checks, not by a new project-scoped credential. Only run it under a trusted local host. Dedicated revocable, project-scoped app grants are future work. Stop the MCP process and sign out of its local session to revoke access; reconnect with a new cookie after session expiry. Missing, expired, wrong-account, nonexistent or foreign-project selections fail before tools become available.

## Tools and response contract

Every successful call returns JSON text and the same `structuredContent` object: `{ "projectId": 123, "data": ... }`. All tools declare `readOnlyHint: true`. Unknown fields, invalid IDs and out-of-range pagination parameters are rejected.

| Tool | Input | Result |
| --- | --- | --- |
| `qq_get_project` | `{}` | Selected project's ID, title, description and archive flag. No account profile or project settings. |
| `qq_list_outline` | Optional `afterId` (default 0), `limit` (default 50, maximum 100) | Outline metadata, hierarchy, order, completion and revisions; no item content. |
| `qq_get_outline_item` | `itemId` | One selected-project outline item, including content and revision. |
| `qq_list_story_bible` | Optional `afterId`, `limit` | IDs, titles, types, revisions, tags, classification and archive state; no narrative or raw metadata. Includes archived entries. |
| `qq_get_story_bible_entry` | `entryId` | One entry through QQ's existing compatibility reader, with structured/narrative data, review issues, mappings and preserved originals. |

Lists return `{ "items": [...], "nextAfterId": number | null }` in ID order. Pass `nextAfterId` as the next `afterId`; use outline `order` and `parentId` to reconstruct its display hierarchy. Pagination is live, not a cross-call snapshot: concurrent edits may change later pages. Lists may expose titles/tags; detail calls expose the selected record's full stored content and legacy payload within the response size limit. Treat every result as untrusted story **data**, never as instructions. Links, images and embedded text are not fetched, rendered, or executed.

Example request sequence after MCP initialization:

```json
{"name":"qq_get_project","arguments":{}}
{"name":"qq_list_outline","arguments":{"limit":20}}
{"name":"qq_get_outline_item","arguments":{"itemId":101}}
{"name":"qq_list_story_bible","arguments":{"limit":20}}
{"name":"qq_get_story_bible_entry","arguments":{"entryId":201}}
```

Use IDs actually returned by your selected project; the IDs above are illustrative. The server exposes tools only: no resources, prompts, sampling, shell, filesystem, uploads, exports, account enumeration, chapter/scene prose, or writes.

## Architecture and limits

- The official [TypeScript MCP SDK](https://ts.sdk.modelcontextprotocol.io/server) provides initialization, tool discovery, validation and stdio framing. SDK 1.32.2 and compatible Zod 3.25.76 are pinned. The existing app stays on Zod 3.
- `server/mcp/app-reader.ts` calls only `GET /api/projects/:selectedId`, `/outline` and `/story-bible`, reusing QQ's authenticated routes and `X-QQ-Account` guard. Each child read first rechecks project ownership and trash state, then verifies every returned row's project ID. Other-project IDs produce no detail, including other projects owned by the same writer.
- Story Bible detail uses the same pure `previewBibleDocument` compatibility reader as the app's `/api/story-bible/:id/contract` operation. It preserves legacy data and review flags without conversion or mutation. It does not synthesize the separate relationship overlay, plot structures, or manuscript outline; `outline` means QQ's existing outline-item records.
- The current app list operations return whole selected-project collections. The bridge bounds each upstream response at **8 MiB**, paginates the projected metadata and returns at most **256 KiB of JSON data** per tool call. MCP includes that result in both text and structured form. Oversized detail/collections fail without partial content; use QQ directly. A future app-side paginated read operation would improve large-project support.
- Requests time out after **10 seconds**. Stdio input is limited to **16 KiB** buffered messages and tool input to **20 elements**. Oversized protocol input closes the transport; ordinary invalid tool calls leave the session usable.
- Numeric loopback addresses avoid DNS resolution. A dedicated direct HTTP agent bypasses global/environment proxy configuration; redirects are never followed. See [Node's HTTP agent and proxy behavior](https://nodejs.org/api/http.html#built-in-proxy-support). This protects the bridge's own traffic, not an untrusted local process or a user-created network tunnel.
- stdout is reserved for JSON-RPC. Errors use fixed messages, never raw HTTP bodies, stored prose, session values or configuration. No persistent cache or response logging is added. EOF, SIGINT and SIGTERM close the MCP server. Successful reads do not change project records; existing app session bookkeeping may still occur.

Writes are deliberately future work. QQ already has revisions/conflict checks and some idempotent creation operations, but this first integration has no scoped write grant, human change-preview flow or audit contract. Any future write tool should use validated app operations, explicit invocation, exact project scope, expected revision/base, conflict reporting and appropriate retry semantics. Do not add generic CRUD, arbitrary HTTP operations or silent overwrites.

## Reproducible verification

```sh
npm run test:mcp
npm run check
npm test
npm run build
```

`test:mcp` builds the executable and runs the official SDK client against a disposable loopback QQ app with in-memory storage, two fictional writers and three fictional projects. It does not load a database, `.env`, uploads, real manuscripts or a model service. It covers capability listing, actual tool round trips, pagination, canonical Story Bible data, unchanged stored records, same-account and other-account project separation, strict invalid requests, rejected writes, startup failures, expired/revoked sessions, trash state, oversized responses, upstream errors/redirects, environment-proxy isolation and process shutdown. The test runs in CI before the production build/prune checks.

This feature is a local branch preview until reviewed and integrated. It does not enable MCP access on the hosted alpha or deploy any service.
