# Local MCP setup and field-guide delivery

Historical setup delivery receipt. Current integrated scope and verification are recorded in [MCP_RELEASE_0_1_0.md](MCP_RELEASE_0_1_0.md); the canonical field guide is now version 1.2.0 with 24 sections.

Historical local delivery record, November 14, 2026. The reconciled release candidate and current readiness status are documented in [MCP 0.1.0](MCP_RELEASE_0_1_0.md). The following describes the earlier isolated setup branch. Branch `codex/mcp-simple-setup-guide`, based only on writable Settings `fb4bea8`. The optional plot-review branch `39edbdd`, plot-video changes and later hosted tour are not merged here. Public GitHub publication remains on hold; no push, PR, merge or deployment accompanies this feature. Public roadmap publication is likewise deferred.

## What a writer does

1. In local QQ Settings → Agents, select a project, enable access and save. Start with editing/manuscript off.
2. Create a key and choose the client. Claude Desktop: download/install the local extension and enter its address/key privately. Local Codex: copy the ready-to-use config, add it once to private config, and privately replace the key placeholder. An environment-key option is available for a CLI started from that terminal.
3. Test local setup, then ask the actual client for the guide and permitted project titles. A local test is not external-client connection status. These are explicit setup actions, not silent installation or blanket approvals.

The extension's executable/dependencies/guide are self-contained. The canonical Markdown is also downloadable from Settings. `qq_get_guide` supplies a short first entry, section index and bounded pages; static MCP resources provide an alternative. No source checkout is needed by an agent reading the guide. Its 22 sections cover all eight current routes and all 19 current tools, with source coverage checks and explicit UI-only/optional limits.

## Evidence

- `npm run check:guide`: 22 bounded sections, eight routes, 19 exact tools; canonical version, source references and portable-content checks.
- `npm run check` and `npm run build`: pass. Existing Vite bundle-size advisory remains.
- `npm test`: 410 tests / 39 suites pass. An initial CommonJS harness incompatibility was fixed without weakening test configuration.
- Real SDK clients: 16 tests pass. Includes unpacking the actual extension into a fresh directory without a checkout/node_modules, initialization/discovery, guide/resources/section pagination, safe fictional reads, isolation, write/manuscript gates, invalid arguments, misconfiguration, revocation and shutdown. Existing versioned write/idempotency tests still pass.
- Actual Chrome UI fixture: narrow read-only scope; extension and Markdown downloads; Codex copy without key; CLI environment option; clipboard error; unsaved-permission gating; all projects plus independent write/manuscript controls; revoked-key test without logging out; keyboard focus and 390px/light/dark layouts. Nine screenshots use fictional projects only; no raw key or machine paths are displayed.
- No real database migration, manuscript access, account credentials or external model calls. New dependencies: none. Shared operation/schema permissions are unchanged.

## Remaining limits

Claude Desktop and Codex setup instructions follow current official documentation linked in the field guide. Actual vendor-host installation/login is not automated or claimed. Claude custom extensions can be blocked by organization policy. The CLI environment option requires launching from the same environment; a separate GUI may not inherit it. Moving the local QQ installation requires recopying Codex paths. Launch the local app from its checkout root, as the existing launcher does.

Web/mobile/remote clients cannot reach this local stdio bridge through this setup. No tunnel, hosted transport, OAuth, live client-presence monitor, provider selection or automatic plot-review run is added. Scope and revocation govern future calls, not content already returned to an assistant/provider.

The requested Library save was unavailable in this execution environment. Verified Markdown, screenshots and test receipts are retained in the local review package; no Library IDs were created. The implementation remains local while the repository destination/visibility decision is pending.
