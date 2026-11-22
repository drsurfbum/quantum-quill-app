# QQ-33 · Workspace assistant

This opt-in panel supports Write, Outline, Storyboard, Story Bible and Overview. In Write it occupies the existing context pane on a wide screen. When that space is unavailable it opens in a dismissible dialog. The dialog follows the visible viewport and keeps the question field outside its scrolling content.

## What a writer shares

Each Send includes the workspace name, the question and up to four explicitly selected sources. Begin with no sources. The picker can include a saved project description, scene plan and beats, plot point, outline note or Bible summary. Sources show the exact text to be shared, capped at 2,400 characters each. A changed saved source requires a new preview. Title searches return up to 40 matches and disclose titles only to the signed-in writer.

In Write, **Include manuscript text** unlocks a saved excerpt or the current editor selection. Send reads the selected passage directly from the editor and labels it as potentially unsaved. The assistant never flushes autosave or reads local recovery journals. Numbered citations open the corresponding supplied snapshots in place. The writer can compare an assistant suggestion with the exact version that informed it.

The current workspace keeps up to 12 exchanges in tab memory. Closing the panel keeps the conversation and composer. **New chat** clears both and aborts an active reply. Leaving that workspace or writing document, changing accounts or projects, or reloading clears the chat. A retry replaces the failed turn and uses its original source selection. Writers can quote an earlier reply into the next question and edit or remove the quote before sending.

## Server boundary

All assistant routes require the normal authenticated session and check project ownership inside PostgreSQL's existing read-only, repeatable-read transaction. Record and plot-parent membership are checked there. Saved content is read again and compared with the preview fingerprint. Strict request schemas admit only source reads and questions. The provider receives plain source data through a fixed HTTPS endpoint. There is no command dispatcher, browsing or story-write capability. The client renders output as text. Only citation numbers that correspond to supplied snapshots open cards.

## Provider and usage

The server adapter streams the OpenAI Responses API using the pinned `gpt-5.4-mini-2026-03-17` model, `store: false`, no tools and up to 800 output tokens. A question is capped at 1,500 characters and the visible reply at 6,000 characters. Requests time out after 60 seconds. Leaving the project or stopping a reply aborts the upstream fetch. QQ sends no story content until a writer presses Send.

The release can start with the assistant unconfigured. Live generation requires all four server settings below. Provision the key through QQ’s private service environment.

| Setting | Purpose |
| --- | --- |
| `QQ_ASSISTANT_OPENAI_KEY` | Dedicated QQ provider project key |
| `QQ_ASSISTANT_USAGE_DB` | Absolute SQLite filename on QQ’s persistent disk, for example `/var/data/assistant/usage.sqlite`. Create the private parent directory first, outside the upload and web roots. |
| `QQ_ASSISTANT_DAILY_CALLS` | Total allowed provider attempts per UTC day |
| `QQ_ASSISTANT_ACCOUNT_DAILY_CALLS` | Allowed provider attempts per writer per UTC day |

The allowance is a hard call count. A transaction reserves each attempt before provider dispatch. Cancellations, errors and retries each consume an attempt once dispatched. Each account may have one active call and start up to four per minute. Reservations survive restarts. An abandoned concurrency lease expires after 90 seconds. These controls assume QQ's existing single service instance with a persistent disk. Multiple independent disks would require a shared usage store.

SQLite contains only an account ID, time, reservation ID and active flag. New reservations prune rows older than the previous UTC day. QQ writes no conversations to PostgreSQL, disk or browser storage. The app schema, migration sequence and existing bootstrap checksums are unchanged. Disabling generation requires clearing the provider setting and restarting the service. An application rollback can leave the separate usage file in place.

**Owner decision for a pilot.** The proposed starting allowance is 20 calls per UTC day across QQ, with at most four per writer. At 2,000 input tokens and 400 output tokens per call, 20 calls would cost about $0.066 at standard rates. Actual charges vary with token use. No provider provision or charge is part of this PR. [Model and pricing](https://developers.openai.com/api/docs/models/gpt-5.4-mini)

## Review evidence

The feature branch is `codex/qq-33-workspace-assistant`. Its integration base is the verified November 20 release `0e5f7b2dd3a5feb779494eefa98422effd28403c` on `codex/writing-first-layout`. The PR carries the check results for the candidate commit.

The browser fixture uses the fictional Lantern Coast project and visibly identifies its deterministic provider as **Test fixture**. The production entry point has no fixture mode. To preview locally with Node 24, build the app and run the showcase in an unused loopback port.

```sh
npm run build
NODE_ENV=test QQ_SHOWCASE_PORT=57993 QQ_DEMO_ASSISTANT=1 node --import tsx tests/showcase-server.ts
```

Use the showcase credentials in `docs/DEVELOPMENT_WORKFLOW.md`. The screenshots show the actual application. [Write](images/assistant/write-desktop.png) · [Outline](images/assistant/outline-desktop.png) · [Storyboard](images/assistant/storyboard-desktop.png) · [Story Bible](images/assistant/story-bible-desktop.png) · [Overview](images/assistant/overview-desktop.png) · [Phone](images/assistant/write-phone.png) · [Tablet](images/assistant/write-tablet.png)

- `tests/workspace-assistant.test.ts` exercises authorization, explicit manuscript consent, unsupported fields, stale revisions, untrusted source data, provider framing, interrupted streams, durable allowances and byte-for-byte story equality.
- `tests/postgres-assistant.ts` exercises the real storage reader on a fresh synthetic database, verifies PostgreSQL rejects an attempted write inside its read-only snapshot, and compares all 18 PostgreSQL tables before and after.
- `tests/browser-workspace-assistant.mjs` runs against Chromium and WebKit. It covers all workspaces, citation cards, retries, cancellation, account and project changes, rapid typing, the 820/390/320-pixel layouts, editor identity, focus, selection and geometry. History, Word Finder, duplication, guided Bible and existing recovery tests continue in CI.
- Physical iPad typing, software-keyboard positioning on hardware, live model quality and the QQ provider account remain unverified. Use a fictional question for the first provider smoke test after configuration.

PM coordinates PR review, merge and release. The local MCP feature and its reserved migration stay on their own branch.
