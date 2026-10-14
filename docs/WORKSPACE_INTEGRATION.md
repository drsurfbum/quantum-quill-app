# Writing workspace integration — October 13, 2026

The approved workspace study is now implemented with the existing Tiptap editor, account style library, durable draft journal and revision-checked save queues. No manuscript or Story Bible migration is required.

## Writer workflow

- Overview, Storyboard, Outline, Write and Story Bible share the horizontal workspace header. Projects, theme, export and preview remain available; mobile preview is also in Export.
- Write has a compact chapter/scene manuscript list, including organization, chapter rename/completion, chapter creation and scene creation. Chapter-only writing remains supported.
- The formatting bar remains one row. Font/size/paragraph/emphasis controls move into More formatting at smaller editor widths. All prior paragraph, list, table, image, URL, find/replace, Quill preset and saved-style commands are retained.
- Type `@`, or select words and click the `@` button, to choose a Story Bible element. Search supports arrows, Enter and Escape. Email addresses and active composition are not treated as triggers. Cancel keeps the literal text; the same canceled trigger does not immediately reopen.
- Inline text is an ordinary editable phrase marked with an entry ID. Renaming an element updates its card, not manuscript wording. Undo/redo, typography changes, clearing formatting, autosave and recovery preserve these references.
- Click a mention (or use Command/Control+Enter inside it) to open its reference card. Facts, relationships and scene notes stay in Write. Related cards open in the same pane. Find in prose, link at cursor, unlink the selected mention and continue writing are available.
- Edit entry here opens the existing complete editor in a dialog, with its existing autosave/recovery behavior. All seven entry types keep their fields. Open full entry is the deliberate navigation action and flushes/checks pending drafts first.
- Scene plans are compact references with an in-place plan/beat editor. Scene-specific notes use the existing separate context document and its guarded save queue. Pins and inline mentions are independent.
- New minimal entries reuse an exact existing active name/type under a project lock. Ambiguous duplicates and archived names require choosing/restoring an existing entry. Creation errors leave prose unchanged.

## Data and protection

`span[data-qq-entry]` carries a positive entry ID, never a copied card or an internal URL. Chapter/scene writes validate targets in the same project, under the same project lock as entry deletion/archive. Retained archived references remain editable and readable; new archived targets are rejected. Deletion is blocked while any saved prose or scene pin references the entry.

Backlinks are derived from committed chapter/scene content on demand, separately from scene pins. No index table or destructive backfill is introduced. Manuscript HTML, Word, plain-text and EPUB exports keep visible words/formatting without internal reference attributes or private card notes. Original-record JSON keeps the exact source markup.

The existing account/project-scoped draft journal, explicit restore/discard review, server revision checks, save-failure recovery and export guards remain in use. Toggling panels or editing a reference does not remount the prose editor or discard its undo history. The save status retains fixed space.

## Verification

- Full suite: **361 tests across 33 suites passed**.
- TypeScript check and production build passed. The existing bundle-size advisory remains.
- New real-Tiptap tests cover alias preservation, undo/redo, @/email/composition detection, HTML reload, typography/clear formatting and journal scope.
- Mounted workspace tests cover linking, independent card/prose saves, scene-specific notes, panel toggles without remounting, and conflict recovery.
- API tests cover ownership, cross-project/missing/archived targets, revisions, deletion races, stub retry behavior, backlinks and export privacy.
- `tests/postgres-writing-links.ts` restored the existing backup into a temporary, isolated PostgreSQL cluster. Concurrent prose revisions, stub reuse, archived/renamed references and deletion locking passed. Fingerprints of all **13 original data tables** matched after removing synthetic test records. The temporary cluster was stopped and removed.
- Browser walkthrough used only the disposable fixture: linked prose; renamed a card without changing its alias; edited scene notes and continued writing; reloaded saved content; tested 900px and 390px widths and the overflow formatting controls. Opening cards/notes left the prose rectangle unchanged.
- A fixture write outage followed by reload retained the inline-linked draft. A newer simulated device write was shown separately during recovery; explicit restore recovered the draft and its link. Reconnect did not silently overwrite the newer version.

## Rollback and boundaries

The recovered-data backups remain unchanged. Pre-integration source is commit `84022d1938dfe63c55ebb95224d9b331c2b2a46d`. No new database migration or dependency installation is required. If reverting to an older editor after new inline links have been used, preserve a current database/uploads backup: older editor versions do not understand the new semantic mark, even though its visible words are ordinary text.

This is a local app integration, not a Render deployment. Full offline app loading, multiplayer collaboration, a graph view and a project-wide search index remain outside this change. Reference-card editing uses the existing full editor dialog; it is not a second, simplified field storage system.
