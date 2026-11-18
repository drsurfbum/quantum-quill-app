# Quantum Quill local MCP 0.1.0 — release candidate

This is the independently versioned **local MCP bridge**, not a downgrade of the QQ app. The app package remains `1.0.0`; the extension and MCP handshake share `0.1.0`. Earlier `0.3.0` values were unpublished development placeholders, not published releases. `manifest_version: 0.3` is the MCPB file format and remains unchanged. The field guide has its own content version, `1.2.0`.

The candidate is reconciled onto reviewed release branch `codex/writing-first-layout` at `ce88058`. That baseline includes the interface tour, plot-structure videos, tablet Bible search, guided Bible, saved writing history and Word Finder. The release was merged into the existing MCP feature branch, preserving its local desktop-acceptance commit `0dea149`; no reset, rebase or force-push was used. This change adds neither the separate Home Screen guide nor plot-hole review. The other owner's local app `1.0.1` bump and README task are excluded. The original MCP feature branches and a pre-reconciliation backup remain intact.

## Proposed release notes

- Opt-in Settings → Agents with selected-project or all-owned-project scope, independent editing/manuscript permissions, revocable hashed keys, and permissions rechecked on every operation.
- Nineteen tools: bounded guide discovery plus project, outline, Story Bible, chapter and scene reads and explicitly invoked edits. Updates require expected revisions; creation uses idempotency IDs. No deletion, shell, unrestricted filesystem, permission administration or automatic edits.
- Copyable Codex setup with resolved local paths and a key placeholder or environment-key option. Actual connection readiness is determined in the client; QQ's local test is labeled as a bridge test only.
- Portable Claude Desktop extension **preview**, with private key configuration and packaged dependencies/licenses. Its transport/package tests do not certify installation inside Claude Desktop.
- One canonical Markdown field guide, embedded into both builds, downloadable in Settings and discoverable through a bounded tool and MCP resources. Coverage checks track routes, exact tool names and source references.

## Client acceptance boundary

| Client | Actual evidence | Remaining limit |
| --- | --- | --- |
| Installed Codex `0.169.0-alpha.11.1` | Fresh disposable configuration and ephemeral app-server thread; all 19 tools discovered; bounded guide, safe project read, sibling denial, independent permission changes, revision-checked outline/manuscript edits, stale revision rejection, all/selected scope changes and live revocation | Direct calls through the installed client engine, no model turn. Interactive chat/IDE approval presentation and other versions are not certified. |
| ChatGPT Desktop local Work | Installed Codex engine preflight only; disposable desktop fixture prepared | **Pending:** actual desktop setup, model conversation, approval presentation and same-session revocation. Engine RPC tests do not certify the desktop conversation. |
| Installed Claude Code `2.1.319` | Separate temporary configuration; real MCP handshake reported Connected; no account or model used | Health/discovery check only, no data tool calls. This is not Claude Desktop. |
| Claude Desktop on macOS | Current official custom-extension instructions, validated portable package and fresh SDK round trip | **Preview/unsupported for first-release acceptance:** actual `.mcpb` installation, private settings entry, in-chat tool call and revocation have not been tested in an isolated Desktop profile. |
| Web, mobile, hosted or remote execution | None | Unsupported by this local stdio transport. No tunnel, OAuth or public gateway. |

This is a **local integration candidate**, not completed Claude/ChatGPT desktop conversational acceptance. The installed Codex engine is verified by direct tool calls, not a user chat. No normal client configuration, credentials, installed extensions or real writing were changed. Tests use fictional projects and do not make model/provider calls. Provider use during a writer's normal assistant session is controlled by their chosen client; requested content can leave the Mac through that client.

To close Claude Desktop acceptance, use an explicitly approved disposable macOS user/profile with Claude Desktop, or have the writer perform the installation knowingly. Run a disposable QQ fixture, install the built extension, privately enter a narrow read-only fixture key, request the guide and permitted project titles, verify manuscript/edit denial, revoke in QQ and confirm the next project read fails. Remove the test extension and revoke the fixture key afterward. Do not install into the writer's ordinary client silently or call that flow verified from a download/SDK test.

## Local and hosted boundary

QQ must already run locally, with the additive `0009_agent_access.sql` migration applied explicitly to that local installation. The previously undeployed MCP migration was renumbered from 0007 to avoid the deployed history migrations 0007/0008. Those deployed files and the immutable alpha bootstrap remain byte-for-byte unchanged. The guarded migration uses the existing feature ledger/checksum/advisory lock, requires initialized alpha plus history/retention markers, accepts only loopback database URLs without host overrides, and refuses an untracked prior agent table. Legacy local databases and experimental untracked MCP installations require explicit adoption review, not fabricated markers. Run `QQ_AGENT_ACCESS_MIGRATION=apply-local-agent-access-v1 npm run db:migrate:agents` only against a separately approved local target. No real database is migrated by this work. The bridge accepts only numeric loopback HTTP origins with explicit ports. The app rejects agent endpoints in production, including behind a loopback proxy. A hosted QQ login does not authorize or enable local MCP access, and a remote model execution environment's localhost is not the writer's Mac.

Read-only scope is the initial setup. Manuscript permission covers chapter/scene metadata and prose; editing manuscript requires both switches. All-project access includes the account's current/future non-trashed projects, but every data call still specifies one project. Revocation cannot erase content already returned to a client. The documentation-only guide remains readable without data access.

## Reproducible verification

Use Node 24 and locked dependencies. `npm run check`, `npm test`, `npm run test:mcp`, `npm run build`, and the disposable PostgreSQL tests are the release checks. `tests/browser-mcp-setup.mts` verifies real Settings using synthetic memory-only projects. Optional installed-client checks require explicit paths to existing executables and do not install clients:

```sh
QQ_CODEX_BIN='<installed Codex executable>' node --import tsx tests/codex-mcp-client.mts
QQ_CLAUDE_BIN='<installed Claude Code executable>' node --import tsx tests/claude-mcp-health.mts
```

The Codex check isolates its configuration root, blocks inference at an unused loopback provider address, invokes actual client RPC methods, checks state through QQ, and removes its temporary configuration on exit. The Claude Code check uses a syntactically valid fictional key with no backing account and tests the handshake only. Neither script loads `.env`, a writing database or normal client configuration. SDK tests separately cover unpacked-extension portability, malformed requests, per-account isolation, protocol startup/shutdown, bounded results and invalid setup.

## Integration verification — November 18, 2026

- TypeScript/build, 509 regression tests in 48 suites, 16 MCP protocol/package tests, and the 24-section/19-tool guide coverage check pass.
- MCP writes retain the release's unchanged shared `updateProse` transaction path. PostgreSQL tests verify chapter/scene history baseline/save, mixed ordinary-app/MCP concurrent writes (one success, one conflict), failed history inserts rolling back both prose and history, exact rich-text/reference preservation, foreign-link rejection, permission/revision/idempotency guards and revocation.
- Migration checks cover explicit purpose, prerequisites, loopback restriction, concurrent/repeated application, rollback, checksum mismatch and untracked-table refusal. Prior feature-ledger rows are unchanged. Disposable production-mode bootstrap/restart and paired restore cover 20 tables, including a nonempty synthetic MCP grant, history/protection metadata and uploaded files; agent endpoints still reject production requests.
- Real Chromium checks cover Settings permissions/setup/revocation and guided Bible. Chromium and WebKit both pass combined Word Finder/history/focus/formatting/navigation/conflict/recovery checks. A real stdio MCP edit appears in the history UI; a subsequent MCP edit blocks stale UI restoration and revocation blocks the next read. This is local app integration testing, not hosted/browser-client MCP support.
- Installed Codex app-server preflight and isolated Claude Code handshake pass again. Both use fictional data and temporary configs; no model calls or normal client changes.

The first two hosted history-browser CI attempts timed out downloading Ubuntu packages before any app tests ran. The workflow now uses the official Playwright 1.65.1 Noble image, pinned by digest, with the same npm version. Chromium, WebKit, all test commands, artifacts and the 12-minute job limit are unchanged. This follows Playwright's [documented container approach](https://playwright.dev/docs/docker); final-head results belong to the PR checks, not the earlier setup failures.

The actual Claude Desktop extension installation/private setup/model conversation and ChatGPT Desktop local Work conversation remain incomplete. PR #2 stays draft for this acceptance gate, not merely for later deployment review. The full matrix and exact user handoff are in [MCP_DESKTOP_ACCEPTANCE.md](MCP_DESKTOP_ACCEPTANCE.md). No hosted transport, live migration, merge, tag or deployment is part of this integration.

## Earlier candidate checks — November 14, 2026

TypeScript and production build pass (existing bundle-size advisory). All 408 app tests / 41 suites and 16 MCP protocol/package tests pass. Disposable PostgreSQL migration/rollback, permission durability/concurrency and idempotency pass. Production-mode fresh bootstrap, account isolation, stale writes, restart/session/uploads and paired restore pass. Real Chrome Settings tests pass with nine fictional screenshots, including narrow read-only scope, independent permissions, Claude preview, Codex setup, downloads, revocation, light/dark and narrow layout. Installed-client evidence is bounded by the table above. No actual account configuration or real data was used.

## Publication and release gate

The user authorized the audited MCP feature branch and draft PR in the known public app repository. That does not authorize merge, Render deployment, a live writing connection, or publication of other feature branches. A draft PR presents this client matrix for review. No `0.1.0` Git tag or GitHub Release should be created from an unmerged branch. After review/merge, a future explicitly approved release can use the scoped name **Quantum Quill MCP 0.1.0** (for example `mcp-v0.1.0`), independently of the app's version.

Official Claude instructions checked November 14, 2026: [custom desktop extensions](https://support.claude.com/en/articles/10949351-getting-started-with-local-mcp-servers-on-claude-desktop), [Claude Code settings isolation](https://code.claude.com/docs/en/settings), and [MCP server management](https://code.claude.com/docs/en/mcp). Codex acceptance uses the installed executable's generated RPC schema and documented configuration output, rather than assuming a different client version.
