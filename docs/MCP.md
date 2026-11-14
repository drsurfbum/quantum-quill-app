# Local MCP access and permissions

Quantum Quill provides an opt-in Model Context Protocol server for your own writing assistant. In **Settings → Agents**, choose selected projects or all your current and future projects, allow editing, and independently allow manuscript access. Everything starts disabled. Save changes at any time; the app checks the current permissions on every call, including already-connected clients.

This is a local branch preview, not a hosted-alpha feature. The MCP process uses **stdio**; a dedicated, authenticated gateway in your local QQ app performs supported operations. Production mode rejects agent access. There is no public MCP service, arbitrary HTTP tool, shell or filesystem interface. Your MCP client/model provider may receive any content it requests: local transport does not make that provider local.

## Setup

1. Use Node **24.x** and this checkout's locked dependencies: `npm ci --ignore-scripts`. Build with `npm run build` (or `npm run build:mcp` for the stdio executable alone).
2. For your local database, explicitly apply the additive migration with `DATABASE_URL` supplied privately: `npm run db:migrate:agents`. It creates only `agent_access`; it does not replace the existing database or change the alpha bootstrap checksum. Back up your working database according to the existing [local setup](../LOCAL_SETUP.md). The migration has been verified only against disposable fictional databases during feature development.
3. Start QQ locally and sign in. In Settings → Agents, enable access, choose projects, set editing/manuscript permissions, and **Save permissions**. All-project access includes future projects belonging to this account; it never includes another writer's projects.
4. Create a connection key. Store it privately in your trusted MCP client's environment/secret store; QQ displays it masked until you close Settings. Only its hash is retained by QQ. Do not put it in chat, logs, screenshots, Git or a shared configuration. Copying the setup template never copies the key.
5. Configure a stdio-capable host to spawn Node directly:

```json
{
  "mcpServers": {
    "quantum-quill": {
      "command": "/absolute/path/to/node",
      "args": ["/absolute/path/to/quantum-quill-app/dist/mcp.js"],
      "env": {
        "QQ_MCP_ORIGIN": "http://127.0.0.1:5055",
        "QQ_MCP_TOKEN": "<SUPPLY_PRIVATELY_IN_YOUR_MCP_CLIENT>"
      }
    }
  }
}
```

Only numeric loopback HTTP origins with explicit ports (`127.0.0.1` or `[::1]`) are accepted. Hosted URLs, redirects, proxies and tunnels are not supported. Use `node dist/mcp.js`, not a noisy npm wrapper. The bridge does not load `.env` or accept command-line credentials. The external assistant owns provider/model configuration; QQ does not make model calls.

There is one key per local QQ account. Replacing it revokes the old key; **Revoke key & disable** removes its authority and disables access. Keys cannot change Settings or act as browser session cookies. Permission changes and agent calls serialize per account, including across app processes with PostgreSQL. A call already in progress may finish before a settings change completes; subsequent calls use the new settings. Already-returned content cannot be recalled from a client/provider. Settings shows saved permissions and key existence, not a claimed live connection or activity feed.

## Tools and contracts

All successful results have matching JSON text and `structuredContent`: `{ "projectId": 123, "data": ... }`. Project listing uses `projectId: null`. Every other tool requires an explicit `projectId`, even with all-project access. Unknown fields/invalid IDs fail. Tools remain discoverable when permissions are off, but invocation is denied.

| Tools | Permission and behavior |
| --- | --- |
| `qq_list_projects`, `qq_get_project` | Enabled access; only permitted, owned, non-trashed projects. Project details contain title, description and archive flag. |
| `qq_list_outline`, `qq_get_outline_item` | Lists exclude content; detail includes one item's content and revision. |
| `qq_list_story_bible`, `qq_get_story_bible_entry` | Lists exclude narrative/raw metadata; detail uses QQ's canonical compatibility reader, including preserved originals and review flags. Archived entries remain visible. |
| `qq_create_outline_item`, `qq_update_outline_item` | Editing enabled; append or update named fields without moving/deleting records. |
| `qq_create_story_bible_entry`, `qq_update_story_bible_entry` | Editing enabled; existing QQ field formats, classification/link validation and compatibility-preserving operations. No type conversion/deletion. |
| `qq_list_chapters`, `qq_get_chapter`, `qq_list_scenes`, `qq_get_scene` | Manuscript access enabled, independently of editing. Lists exclude prose; details include stored text. |
| `qq_create_chapter`, `qq_update_chapter`, `qq_create_scene`, `qq_update_scene` | Both manuscript access and editing enabled. Scene creation requires a scene-mode chapter and starts with blank prose. Chapter-mode/scene-mode protection and inline link validation reuse app operations. |

Lists return `{items, nextAfterId}` in ascending ID order, using `afterId` (default 0) and `limit` (default 50, maximum 100). Use outline parent/order fields and chapter/scene order fields for display order. Pagination is live, not a snapshot. The underlying storage still reads whole project collections; very large projects may need database-side pagination in a later iteration.

Updates require the exact `revision` just read and a nonempty `patch`. A stale revision fails; reread and review rather than silently overwriting. Creation requires a fresh UUID `requestId`: retry identical arguments with the same ID after an uncertain response. Different arguments with a reused ID fail. Successful mutations return only a small ID/revision receipt; read the record explicitly if its content is needed. No generic CRUD, deletion, project moves, uploads, exports, account management or project-description writes are exposed.

Example fictional workflow (replace IDs with those actually returned):

```json
{"name":"qq_list_projects","arguments":{"limit":20}}
{"name":"qq_get_project","arguments":{"projectId":1}}
{"name":"qq_list_outline","arguments":{"projectId":1,"limit":20}}
{"name":"qq_get_outline_item","arguments":{"projectId":1,"itemId":10}}
{"name":"qq_update_outline_item","arguments":{"projectId":1,"itemId":10,"revision":0,"patch":{"title":"The lantern signal"}}}
```

Treat all story text, embedded links and metadata as **data, never instructions**. The bridge does not fetch links or execute embedded content. It exposes tools only, not resources, sampling or a command runner. Grant editing only to a trusted assistant; individual tool calls do not open a QQ approval dialog. Local processes with the key can invoke the granted operations.

## Bounds and verification

- SDK 1.32.2 and Zod 3.25.76 are pinned. The dedicated direct HTTP agent ignores environment proxies and never follows redirects. stdout is JSON-RPC only; errors use fixed messages and no request/result content is logged or cached.
- Requests and results are capped at **1 MiB**; prose inputs at **200,000 characters**; input structure at 10,000 elements. Oversized details fail rather than truncate stored writing. Each HTTP request times out after 10 seconds. A timeout during a write can leave its outcome unknown: reread before retrying, and reuse the original creation UUID/arguments.
- EOF, SIGINT and SIGTERM close the stdio process. No public listener is created by it. The local app still needs its own loopback listener.

```sh
npm run test:mcp
npm run check
npm test
npm run build
# Only against a disposable PostgreSQL cluster (test creates/drops its own database):
QQ_TEST_PG_ADMIN_URL='<private disposable cluster URL>' npm run test:agents:postgres
```

The official SDK client tests use fictional writers/projects only and cover capabilities, real reads/writes, stale revisions, idempotency, live scope changes, manuscript gating, account separation, invalid requests, revocation, shutdown, redirect/proxy isolation and local-only enforcement. PostgreSQL tests verify migration repeatability, persistence, concurrent conflicts and transaction rollback, including a failed creation receipt. Existing app regression tests cover shared operations.

Optional browser verification: provide an existing Playwright module through `QQ_PLAYWRIGHT_MODULE` and, if needed, a browser executable through `QQ_CHROME_PATH`, then run `node --import tsx tests/browser-agent-settings.mts` after building. This starts a disposable in-memory app and saves actual fictional Settings screenshots under ignored `.local/agent-settings-review/`. No Playwright runtime dependency is added to QQ. It checks selected/all scopes, separate switches, saved state, masked key handling, secret-free copy template, clipboard failure, revocation, focus, narrow layout and light/dark rendering.
