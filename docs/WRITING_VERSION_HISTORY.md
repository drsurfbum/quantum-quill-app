# Write: Undo/Redo and saved version history

Review candidate for QQ-31, based on release `d610409`. No live migration or deployment is part of this feature. Named alternate drafts remain separate.

## Writer behavior

Undo, Redo, and Version history are visible in the fixed-height Write toolbar. Undo/redo uses the native editor history, retains selection/focus, and continues across normal autosave acknowledgments. Cmd/Ctrl+Z undoes; Cmd/Ctrl+Shift+Z and Ctrl+Y redo. Commands apply to the focused editor, not text fields in a dialog. Navigation/reload and explicit saved-version restoration start a new undo session. Undoing an edit itself autosaves normally.

History belongs to one chapter's prose or one scene's prose. It lists timestamped checkpoints, newest first, with pagination. Select a version for a formatted read-only preview; Compare shows it beside current saved prose. Narrow screens switch between the two panes. This is visual comparison, not a word-level or formatting-difference algorithm.

**Restore as current version** explicitly replaces only the prose and increments the current revision. The selected version, the previous current text, and all other saved versions remain intact. Titles are recorded for context but are not restored. Scene plans, order, chapter writing mode, status, scene contexts, and shared Story Bible facts are unchanged. Exports read only canonical current prose, never the history table.

Opening history first saves pending writing through the existing manuscript action gate; unresolved errors, conflicts, or recovered drafts block restoration. The editor is read-only while the dialog is open. If another device saves after comparison, restoration is refused until the writer reviews again. Closing returns focus without moving or remounting the writing surface. No automatic text merge occurs.

![Desktop comparison using fictional writing](images/prose-history-desktop.png)

[320px comparison](images/prose-history-narrow.png) and [320px lost-response retry](images/prose-history-retry.png). Preview and notices have separate scroll boundaries so longer recovery messages cannot overlap the text. Screenshots show only the original synthetic Lantern Coast fixture.

## Storage and recovery contract

`prose_versions` is an additive table. Existing manuscripts are not rewritten or bulk-read. On the first successful prose-changing save, storage preserves the outgoing original, then stores the new prose. Subsequent content-changing saves append a checkpoint in the same transaction as the current-row update. There is no earlier-history reconstruction. Identical consecutive prose and metadata-only updates do not add checkpoints; explicit restorations always do, even if the prose is identical. A→B→A remains three chronological states. Revision gaps are expected because metadata saves also advance the canonical record revision.

The authoritative payload is the original stored text/HTML, including whitespace, formatting, hyperlinks, and inline reference identities; preview sanitization never replaces the stored payload. A baseline's timestamp is the source row's last update, and `captured_at` records when it entered history. This is prose history, not a full document or project snapshot. Image bytes and prior shared Story Bible facts are not copied.

Every list/detail/restore checks the current record's project ownership. History lookup additionally scopes project, resource type, and document ID. Responses are private/no-store. Preview frames are sandboxed, sanitize rich text, disable links, and load no external resources; images are represented by placeholders. Archived references already in an original may be restored; missing, invalid, or cross-project reference targets block restoration without silently stripping the original. Restore unavailable reference targets separately before retrying.

Restoration atomically records a unique request token and source-version ID with the new current revision. The browser persists only that request metadata before sending. A lost response/reload can retry the same request without another write. If newer writing follows a completed restore, its retry is refused with an explicit review message. Storage failure before dispatch prevents restoration. Other save failures retain the existing browser draft/crash-recovery behavior. Browser drafts remain origin/profile-specific and are not the version database.

Snapshots and revision updates use a row lock and one database transaction, including when called within existing project transactions. A snapshot insertion failure rolls back the prose write. Memory fixtures mirror successful capture; production rollback/concurrency is tested against PostgreSQL. Startup refuses to serve this release if the history schema is absent.

## Storage measurement and retention decision

The current candidate has **no automatic expiry or pruning**. Every changed acknowledged prose body is stored in full, with unchanged-body saves skipped. There is no cross-version blob deduplication or delta encoding. PostgreSQL's normal TOAST storage is used; compression is not assumed as a capacity guarantee.

PostgreSQL 16.15 rehearsal: 120 incremental changed saves per document, generated synthetic vocabulary with deliberately low local repetition, plus one initial checkpoint. Physical growth includes table, indexes, and TOAST allocation; it excludes WAL, backups, replicas, and existing manuscript storage.

| Document body | Saved versions | Logical prose | Physical table growth | Approx. growth / changed save |
| --- | ---: | ---: | ---: | ---: |
| 10 KB | 121 | 1.20 MB | 1.56 MB | 13 KB |
| 50 KB | 121 | 6.00 MB | 6.51 MB | 54 KB |
| 200 KB | 121 | 24.00 MB | 24.86 MB | 207 KB |

These are decimal units and conservative synthetic measurements, not predictions from private manuscripts. At the existing five-second continuous-typing checkpoint interval, 720 changed saves/hour would add approximately 39 MB/hour for the 50 KB sample or 149 MB/hour for the 200 KB sample, before backups/WAL. Actual typing pauses, document sizes, and compression change this substantially. The full measured receipt is [prose-history-storage.json](verification/prose-history-storage.json).

**Release decision:** confirm a storage budget and monitoring threshold before deployment, or separately approve a checkpoint/retention design. The existing small alpha database cannot be treated as unlimited. This PR does not increase a plan or silently remove old versions. Do not add a storage cap that quietly skips history or silently loses writing. An approved future retention policy must clearly distinguish automatic checkpoints from protected/restored versions and provide a deliberate preservation path.

Document deletion/recovery is not added here. History is accessible only while its canonical chapter/scene exists. Rows remain after chapter deletion; deleting an empty project permanently cascades its history. Project trash retains it. Historical image files still depend on the normal upload lifecycle and paired backups.

## Migration and rollout (separate authorization required)

Do not edit the immutable `deployment/alpha-schema.sql` checksum or use `db:push` on hosted/recovered writing. The new migration script requires an already initialized alpha database, takes the existing migration advisory lock, checks a feature checksum, and refuses an untracked history table. It creates only the table/indexes and feature marker; it does not backfill manuscripts. It is safe to rerun after success.

After a reviewed paired database/upload backup, on the separately approved target:

```sh
QQ_PROSE_HISTORY_MIGRATION=apply-prose-history-v1 node scripts/migrate-prose-history.mjs
```

`DATABASE_URL` must already point to that approved target; do not print it. Apply the additive migration before deploying this code. No automatic Render/build-time migration is added. For a fresh installation, run the existing fresh-alpha bootstrap and feedback migration first, then this migration. Legacy local databases without the alpha marker require a separately reviewed adoption plan; do not create that marker to bypass the guard.

Deploy only after release approval and capacity review. Verify history/restore with fictional writing, authentication boundaries, pending-save recovery, and paired backup restoration. A code rollback to `d610409` can leave the additive table intact, but that older code does not capture new history. Existing saved versions remain preserved; do not drop the table to roll back code. History coverage during an older-code interval is incomplete.

## Validation and feature coordination

Validation uses fictional in-memory records and newly created disposable databases only. No working story, account, database, backup, or browser profile is used.

- TypeScript and production build pass. Existing bundle-size advisory remains; no dependencies or lockfile changed.
- Full Jest suite: **473 tests / 45 suites passed**. Coverage includes history authorization, pagination, exact body preservation, stale and competing saves/restores, retry idempotency, exports, absent/archived references, safe previews, visible undo/redo across autosave and navigation, and existing writing/recovery regressions.
- PostgreSQL rehearsal covers migration rollback/concurrency/idempotency, unchanged original fields, competing writes, failed snapshot atomic rollback, outer transaction rollback, scenes, isolation, and physical storage growth.
- Production build passes fresh/concurrent bootstrap, refusal of an unrelated database, restart/session/upload preservation, and paired restore of all 19 tables including history.
- Actual Chrome with the production CSP passes toolbar/keyboard/focus, read-only preview/compare, stale restore rejection, explicit restoration, undo reset, lost response/reload retry, 320px/390px layout, dark mode, and failed-save/crash recovery. [Browser receipt](verification/prose-history-browser.json). Physical iPad/software-keyboard and assistive-technology testing remain unverified.

Repeatable checks:

```sh
npm run check
npm test
npm run build
# Explicit disposable PostgreSQL server only:
node --import tsx tests/postgres-prose-history.ts
node tests/hosted-alpha.mjs
# Disposable Playwright installation, without app dependency/lockfile edits:
node tests/browser-prose-history.mjs
```

Database tests require `QQ_TEST_PG_ADMIN_URL`; hosted restore also accepts `PG_BIN`. Browser tests support `PLAYWRIGHT_MODULE`, `CHROME_EXECUTABLE`, and a dedicated `QQ_HISTORY_BROWSER_PORT`; they start and stop their own synthetic fixture. CI runs the server/storage and browser regressions.

Duplicate Chapter remains owned by the existing feature chat and local `duplicate-chapter-app` candidate `c11753e`. Its original/copy remain independent canonical documents and both export. This feature does not copy parent history or add alternate-draft selection; each copied document would start its own history on its first changed save. Combined integration with that unpublished candidate and the separate MCP candidate remains a later release check. All original branches/worktrees are preserved. Roadmap/PM updates remain with the PM chat; this candidate is a draft PR, not a deployed feature.
