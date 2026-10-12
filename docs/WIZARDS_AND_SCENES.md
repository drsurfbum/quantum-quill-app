# Wizard and scene restoration

October 11, 2026. Built on the stabilized current app; Antigravity remains reference material.

## Writer workflow

- Dashboard → **New Project** opens a three-step setup: title, author/pen name, genre, word goal, logline, and a choice of planning or writing first.
- Storyboard → choose a plot structure → **Blueprint Wizard**. Expand beats into scenes, add/remove/reorder planned scenes, insert chapter breaks, name the chapters, then review and build. Beat notes are read-only context; scene summaries are separate from prose.
- Blueprint now opens **Outline → Scenes**; see [the connected workflow](SCENE_OUTLINE_WORKFLOW.md).
- Write → chapters created by Blueprint expose a scene selector, an expandable scene plan, and the existing full formatting editor. The chapter-list **+** menu also offers **New scene chapter**. Add scenes manually within it.
- Existing chapters stay in chapter mode. Their text is neither split nor copied into scenes. Conversion of an existing chapter requires separate previewed work.
- Wizard drafts are saved in this browser by account and task scope. Reopen the appropriate wizard and choose **Restore draft** or **Discard draft**. Blueprint recovery is also scoped to project and plot; scene-creation recovery to project and chapter. Restore keeps a different plan already being edited as another recovery choice.

## Data and save contract

Additive migration `0004_wizards_and_scenes.sql` adds project settings, immutable chapter writing mode, scenes, and creation request receipts. Existing prose, JSON, metadata and relationships are untouched.

`projects.description` remains the logline/description. Settings hold author, canonical genre and target word count. Scene records contain project/chapter IDs, an optional plot-section ID, title, plain-text summary, rich-text prose, persisted integer order and revision. Displayed beat names are resolved from the section ID.

Scenes use the same serialized autosave, synchronous local draft journal, restore/discard review, account checks, revisions and conflict behavior as chapters. No second debounce or save system was imported. Scene titles/summaries share the scene's revision and queue with prose. Conflicts remain recoverable rather than silently rebasing an editor.

New-project, scene and Blueprint creation persist an exact request ID before submission. Retrying after a lost acknowledgment returns the original result. Reusing a successful ID with different contents fails. Blueprint builds run in one PostgreSQL transaction under the project lock; source/section/chapter revisions and order are checked against the reviewed snapshot. A stale preview asks for review of the latest source while keeping the scene plan. Foreign beats and duplicate chapter titles are rejected.

Scene chapters cannot also hold chapter prose. Deletion of a chapter containing scenes, or a plot beat linked to scenes, is blocked with an explanation; PostgreSQL foreign keys also prevent orphaning. Scene deletion and moving/reordering already-created scenes are not exposed in this first restoration. The wizard's planned order is persisted. No graph, timeline, automatic chapter conversion or destructive migration is included.

## Verification and adoption

Local adoption completed on October 11, 2026, on branch `codex/wizards-and-scenes`. Fresh backup: `.local/backups/pre-wizards-scenes-20261011-221706.dump`. The additive migration compared original row counts and field fingerprints across 11 tables inside its transaction; all matched. The original Replit dump and verified snapshot were not modified.


- Final validation: **310 tests in 21 suites passed**, TypeScript check passed, and production build passed. The build retains the existing bundle-size and stale Browserslist warnings. Intermediate test runs had intermittent loopback fixture socket/status failures; the final complete run passed without skipping assertions.
- Automated coverage includes metadata validation; retry/account isolation; stale Blueprint previews; duplicate requests; atomic failure rollback; foreign/missing beats; immutable writing mode; scene revisions and deletion guards; wizard reload/retry/restore/discard/account isolation; scene offline draft recovery; and real TipTap rapid typing/navigation tests for scenes alongside chapters and outline.
- Disposable PostgreSQL rehearsal restores a local pre-change dump, compares all original values, applies the migration twice, reverses the schema addition, compares again, and reapplies. It also injects failure into the second scene insert and checks whole-build rollback, concurrent retries, stale previews, scene conflicts, database integrity guards, and 12 competing API saves with a two-connection pool. Locked validation and writes use the same transaction connection. Run `tests/postgres-planning.ts` with a **pre-migration** local dump; it creates and drops only its uniquely named disposable database.
- Browser walkthrough verified setup-draft reload/restore, new-project creation, Blueprint review/build, scene title/summary/prose round trips, manual scene creation, and offline scene reload/recovery. It uses the isolated synthetic server at port 5057. No real project is used for editing tests.
- Before local adoption, save a fresh local database dump. Apply with `npm run db:migrate:wizards` against the restored local database, then restart the development server. The original Replit export and verified snapshot stay untouched.
- Reversing the additive schema is safe **only before new feature data is created**. After use, keep the new tables or restore a full backup into a separate database for comparison; dropping scenes would destroy new writing. Pre-migration backups remain a rollback reference, not a reason to discard newer work.

## Follow-up boundaries

Project metadata is collected and persisted by setup; a settings editor is still a separate addition. The dedicated scene outliner and scene story beats are now integrated; see [the connected workflow](SCENE_OUTLINE_WORKFLOW.md). Scene-to-Bible links and persisted moves/reordering of existing manuscript scenes remain follow-ups. The existing Export dialog still simulates success and produces no file; real manuscript export must cover both chapter prose and scene prose. This restoration does not claim to fix export.
