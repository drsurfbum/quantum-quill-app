# Quantum Quill verification

Use Node 24. These checks do not require `.env` or PostgreSQL:

```sh
export PATH="/opt/homebrew/opt/node@24/bin:$PATH"
npm test
npm run check
npm run build
```

`node run-tests.js` is an equivalent test entry point and propagates Jest's exit code.

The fourteen Jest suites currently contain 201 tests:

- `auth.test.ts`: registration, password hashing, signed sessions, logout/replay, input validation, production cookies, secret requirements and cross-origin rejection.
- `token-validation.test.ts`: rejects fabricated identities and development bypasses; checks diagnostic routes are gone.
- `auth-integration.test.ts`: project/child ownership, writable fields, parent relationships, delete guards, orphan preservation and controlled server errors.
- `save-queue.test.ts`: debounce merging, serial writes, latest-edit ordering, failures/retries, empty content, continuous-typing checkpoints and switching between records.
- `save-session.test.ts`: pending drafts remain scoped to their user, expired sessions preserve drafts, and late responses cannot populate another user's cache; stale list reads cannot replace an acknowledged save.

- `editor-saving.test.ts`: all seven story-bible editors plus the generic fallback mounted in React Strict Mode; batched field/title changes, slow requests, unmount/reopen, lifecycle flushes and failed-save retry.
- `rich-editor-saving.test.ts`: real chapter/outline Tiptap instances and plot sections; burst editing, slow requests, stale renders, navigation, whitespace and empty documents.
- `story-bible-fields.test.ts`: 118 field, relationship, image/API and dashboard checks across all seven editors and every generic taxonomy branch.
- `story-bible-upload.test.ts`: upload success, failure/validation and cancellation/late responses.
- `protected-route-state.test.ts`: page and draft state survive authentication-context rerenders.
- `draft-recovery.test.ts`: durable journal reloads, separate tabs/accounts, quota/corruption retention, in-flight acknowledgment, explicit recovery, missing bases and stale-render conflicts.
- `draft-conflicts.test.ts`: competing API saves and field-level compare-and-set protection across active text resources.
- `story-bible-schema.test.ts`: legacy/unknown preservation, mirror consistency, schema versions, same-project typed links, cycles and deletion guards.
- `recovery-ui.test.ts`: mounted Radix review/restore/discard, late conflicts, account switching and ID-based backlink navigation.

Each API test injects a fresh `MemStorage` and memory session store. Real database modules are mocked to throw on import. No test reads `.env`, connects to the recovered databases, seeds a real account or touches existing uploads. The suite tests API behavior with the memory implementation, not PostgreSQL transactions or migrations.

## Manual browser fixture

After building, run:

```sh
NODE_ENV=test QQ_SMOKE_SAVE_DELAY_MS=2000 node --import tsx tests/smoke-server.ts
```

`QQ_SMOKE_SAVE_DELAY_MS` is optional (0–10000 milliseconds); 2000 makes navigation races easier to exercise.

Open http://localhost:5057 and sign in with `smoke-writer` / `synthetic-smoke-password`. These are disposable local fixture credentials. This server contains synthetic projects, chapters, story-bible entries, outlines, plot templates/sections and a whiteboard in memory. It binds only to loopback, writes any test uploads into a new OS temporary directory and never imports a database integration. Stop with Control-C; all writing in this fixture disappears when the process exits. Do not use it for real writing.

To test a failed save, send `SIGUSR2` to **the PID printed by this fixture**. Its next chapter update will fail once. Edit a chapter, verify `Save failed`, choose `Retry save`, then reload to confirm persistence. Do not send signals to the regular application process.

Browser checks performed in this round: session login; chapters, first outline edit and plot sections; switching before the debounce expires; failed save/manual retry; chapter-link reload; all seven story-bible editors and server readback of their edited fields. The whiteboard API is covered; its legacy canvas UI is not routed from the current Storyboard page and was not fully browser-tested.

The deeper typing/navigation audit is recorded in [docs/AUTOSAVE_AUDIT.md](docs/AUTOSAVE_AUDIT.md).

Do not run `db:push`, migration experiments or test writes against `quantum_quill`, `quantum_quill_verified_snapshot`, Replit or recovery backups. Database integrity work needs a separate disposable copy and reviewed migration.

## Story Bible field verification

`tests/story-bible-fields.test.ts` verifies the seven specialized editors and all generic taxonomy branches using fresh signed-session API records in MemStorage. It covers text clearing, dropdowns, links, collections, booleans, images, upload association and dashboard filters. `story-bible-upload.test.ts` covers failures/cancellation. `protected-route-state.test.ts` covers notification-related remounts. See [the field audit](docs/STORY_BIBLE_FIELD_AUDIT.md) for the explicit inventory and limits.

## Separate PostgreSQL and recovered-data checks

These scripts are intentionally outside Jest and require the local private PostgreSQL socket. They never use `.env` or a caller-provided production URL:

```sh
node --import tsx tests/postgres-stabilization.ts
node --import tsx tests/audit-story-bible.ts
```

The first creates a new, empty `qq_stabilization_<random ID>` database, verifies the actual PostgreSQL storage/CAS/project-lock implementation, and drops only that database in `finally`. The second reads `quantum_quill_verified_snapshot` in a READ ONLY transaction and rehearses normalization in memory. It prints structural counts/issues only. Both passed on October 11, 2026; the snapshot contained 47 entries with no indexed link or known-field issues. Neither runs a migration against a recovered database.

See [the recovery/integrity report](docs/DRAFT_RECOVERY_AND_DATA_INTEGRITY.md) for behavior and remaining boundaries. For a manual recovery walkthrough, use the same synthetic browser origin: edit while writes fail/offline, reload, reconnect, choose Review saved drafts, and inspect both versions before restoring. A second concurrent write after review must reject the restore and retain the draft. Test browser quota/private-mode behavior separately from the mounted DOM suite.
