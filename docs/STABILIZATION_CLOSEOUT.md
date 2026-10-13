# Local stabilization closeout — October 13, 2026

This is the current status report. It supersedes the remaining-work lists in the initial restart/stabilization reports where the items below are now implemented. The target is a reliable local single-writer workflow; public deployment has separate gates.

## Delivered

- Real Word (.docx), formatted HTML, plain text, EPUB, and original-record JSON exports. Preview displays the manuscript and supports the browser's Print / Save PDF flow. PDF is explicitly a print workflow, not a simulated server download. Optional outline/scene plans, plot points, and Story Bible fields/relationships are included when selected.
- Export uses a repeatable-read PostgreSQL snapshot, respects project ownership and the active account, saves pending edits first, and blocks on failed saves or unresolved project drafts. Chapter prose and scene prose appear in manuscript order. Summaries/beats stay out of manuscript prose unless planning is selected. Sanitized HTML preserves legacy plain text and whitespace; original rows are never normalized by exporting. Authorized local images are embedded; unavailable/external images have explicit placeholders and are never fetched by the server.
- Organize is available in Write's chapter drawer and Outline. Writers can reorder chapters, reorder scenes, and move scenes to other scene chapters. Apply validates that every record appears exactly once, rejects foreign targets and stale arrangements, and commits atomically under the project lock. Structure has its own snapshot; moves do not change prose revisions or touch content, summaries, beats, or source IDs. Retrying an already-applied arrangement is harmless.
- Chapter renames/completion now share the existing serialized prose save queue. Chapter deletion requires the revision reviewed in its confirmation and rejects intervening writing. Chapters containing scenes remain protected from deletion; scene deletion/converting prose chapters is not exposed.
- Preview buttons work. Unimplemented sharing is labeled and disabled. The project overview's dummy export/delete menu is removed. Word counts now count actual chapter/scene prose, and progress uses the project's word goal instead of assuming twelve chapters. Narrow headers wrap and closed chapter drawers no longer expose hidden controls.
- Uploads require an owned project and matching raster file signatures. A private per-file access index gates downloads by project ownership; URLs alone cannot grant access. New uploads retain their scope before responding. The legacy indexer is additive and has a dry run: one of seven original images has an existing project reference; six unassigned images remain preserved and unserved. Original file bytes and database rows are unchanged.
- Bounded login/registration throttling, a database-backed `/healthz`, configurable `UPLOAD_DIR`, a paired local backup script, and GitHub CI for install/typecheck/tests/build. Unused Auth.js, social-login, and Neon integrations are removed; compatible active/transitive dependency security updates are locked.

## Verification

- Main checkout: **331 tests passed across 28 suites**, TypeScript and production build passed. The previous intermittent auth/style failures did not recur in the successful full run; no existing assertions were weakened.
- New tests cover binary Word/EPUB contents, Unicode, formatting, manuscript order, legacy fields, ownership, unsafe markup, upload signatures/access, pending/recovered drafts and account changes, concurrent renames, stale deletion, structural conflicts, and login throttling. Existing field/save/recovery suites remain included.
- Clean source-only checkout: `npm ci --ignore-scripts`, TypeScript, **331 tests across 28 suites**, and the production build all passed. The initial clean run caught jsdom loading an optional unbuilt native canvas binary. The DOM fixture now explicitly excludes native canvas rendering; it continues testing real React/TipTap DOM and persistence. Native whiteboard rendering is outside that fixture's coverage.
- Browser fixture: immediate typing → export preview includes latest prose; downloaded Word ZIP contains that prose and Unicode; chapter reorder survives reload; scene move/reorder retains summary and prose and opens Write with the new chapter ID; preview follows the final manuscript order; its contents links stay within the exported document. The final browser check caught and fixed a blank Blob preview before adoption. Print invokes the browser flow; no physical print was sent and a saved PDF file was not inspected.
- Disposable PostgreSQL restore: forced mid-move failure rolls back all structure; concurrent prose survives movement; duplicate retries are safe; repeatable-read exports retain one snapshot; real Word generation passes. All **13 original non-session tables** match their pre-test counts and complete row-value fingerprints afterward.
- Paired backup checksums and uploads restore passed. Nine archived files (seven recovered images plus local metadata/access files) match byte for byte. Backups and `.env` remain private and ignored by Git.

## Rollback and local adoption

No schema/content migration is needed for this pass. The original recovered-data backups remain untouched. Additional rollback points:

- `.local/backups/pre-stabilization-closeout-20261013.dump`
- `.local/backups/20261013T151213Z-local.59mxwT/` — before the additive image access index
- `.local/backups/20261013T151214Z-local.jtUZbB/` — database plus uploads/access index, restored and verified

The working local app was rebuilt and restarted on `127.0.0.1:5055`; `/healthz` confirms database availability. Refresh the browser to load the current client. Local drafts remain account/project scoped; do not clear browser site data to update the app.

For another paired backup, stop the local app and run `bash scripts/backup-local.sh`. It refuses while port 5055 is listening. Restore into a disposable database first, never overwrite the working database as an experiment. Rehearse organization/export on a supplied dump with `node --import tsx tests/postgres-manuscript.ts <backup.dump>`.

## Explicit remaining boundaries

- Four ambiguous legacy Story Bible entries remain retained payloads pending classification review. All 31 orphan plot sections remain preserved; 3 have nonempty payloads (95 characters total), so no parent/ownership assignments or deletion were guessed. The reviewed versioned migration/conversion apply remains gated.
- This is not public deployment approval. The final dependency scan still reports 74 affected entries (1 critical, 9 high, 62 moderate, 2 low), including the optional legacy native-canvas installation chain (`tar`) and larger TipTap/Drizzle/Fabric/Tailwind/Vite upgrades. Counts include transitive/dev packages, not distinct confirmed exploits. Those upgrades need targeted compatibility work; no force-upgrade was applied to the writer.
- Before Render: dependency/security review, durable upload storage including `.access`, deployment-specific proxy/session verification, staging health/restore rehearsal, and operational monitoring. In-memory login throttling is suitable only for a single process; use shared limits before multiple instances.
- HTML/print best preserves editor CSS. Word supports native runs/paragraphs/lists/tables but is not a pixel-identical layout engine; complex/nested lists, merged tables and font availability require further publishing QA. EPUB container/contents are tested, but external EPUBCheck/reader certification has not been run. JSON exports retain selected original records, not the complete database or uploads backup.
- Broader browser/mobile/IME testing, offline application-shell caching, full version history, multiplayer, AI, timeline/graph views, and new Story Bible workbench features remain outside this local stabilization pass. Existing durable draft recovery does not replace backups.
