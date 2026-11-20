# Duplicate Chapter and alternate drafts

This feature is a local review candidate, not a deployed release.

## Writer workflow

In Write, open a chapter's options menu and choose **Duplicate Chapter**. Review what will be copied, then choose **Create copy**. Quantum Quill saves pending writing first and opens a new draft chapter immediately after the source. Titles use “(copy)”, then “(copy 2)” when needed.

The original and copy are independent chapters. **Both appear in the manuscript and exports**, including when marked Draft. Duplication is useful for experimenting, but it does not create a hidden alternate version.

Chapter mode preserves rich-text prose. Scene mode preserves every scene's order, prose, summary, story beats and valid Story Bible references, including scene-specific notes. The copy gets fresh chapter, scene and beat identities and fresh revisions. Existing Story Bible entries remain shared project facts; editing those entries changes the same facts wherever referenced. Scene-specific context records are independent.

Plot-section links remain with the original. Duplication does not create plot points, outline notes or Story Bible entities, or reuse completion/history/approval metadata. Mixed chapter/scene ownership and invalid or archived references block the entire operation with an explanation rather than dropping content silently.

## Save and request safety

The existing manuscript save gate runs before copying and before selecting the result. Unresolved saves or recovery drafts prevent navigation. Project ownership and account guards apply to the new endpoints.

A project transaction validates a source fingerprint, inserts the independent records, places the chapter after its source and records the operation receipt. A stale source or order rejects the operation. Rapid repeated clicks are blocked immediately; retrying after a lost response reuses a persisted account/project/chapter-scoped request token. That token contains no prose. The server returns the same copy for the same request. Separate competing requests with the same source fingerprint cannot both create copies.

The memory fixture rolls back copied references and order along with inserted records. PostgreSQL uses the existing transaction and project advisory lock. No migration or dependency is added.

## What alternate drafts offer today

The current schema stores one canonical prose body per chapter or scene. Revision counters protect concurrent saves; they do not retain old prose bodies. Editor Undo/Redo is transient editing history. The local draft journal supports save recovery and conflicts. None provides named parallel drafts, switching or comparison. The chapter's Draft status is a completion flag, not an alternate-version selector.

Until intentional drafts exist, use clearly labeled duplicate chapters for experiments and resolve which copy belongs in the manuscript before exporting. If experiments must stay outside the export, keep them in a separate project or document for now.

The smallest follow-on is a named draft set attached to the canonical chapter or scene, with one explicitly designated manuscript draft. Start with **Save as alternate**, rename, copy, a save-gated switch and a read-only side-by-side comparison. Only the designated draft should feed normal writing, exports and assistant reads. Preserve scene/chapter ownership rather than duplicating planning containers. Reuse revision/conflict protection, but add explicit persisted draft bodies and identities; recovery storage is not an alternate-draft database. Test switching, exports and assistant ownership together before expanding comparison or merge features.

Code evidence: [canonical schema](../shared/schema.ts), [draft journal](../client/src/lib/draft-journal.ts), [save gate](../client/src/lib/manuscript-actions.ts), [export](../server/export.ts).

## Verification

Verified against release baseline `65483de7ad8a78ec5d81a46cb68f01f8ae318fa4` with fictional data only:

- Full Jest suite: 43 suites, 426 tests passed. Focused copy coverage includes both writing modes, formatting, source immutability, independent reopened edits, references, exports/order, stale input, authorization, rollback, rapid clicks, pending saves and lost-response retries.
- An intermediate full run had one existing relationship-fixture registration failure (401); its focused rerun and the subsequent full suite passed. No authentication or relationship code was changed.
- TypeScript check and production build passed. Vite reports the existing large-bundle advisory.
- A dedicated empty PostgreSQL database passed real rollback after a deliberately failed final receipt insert, same-request concurrency, competing-request exclusion, independent prose and fresh context checks. The disposable instance was stopped afterward.
- Real Chrome Write flow: keyboard menu/dialog activation, latest chapter edits copied, rich-text formatting retained, independent chapter and scene edits saved and reopened, source unchanged, copy placed after source, scene order and references preserved. Outline shows the copied plans with no inherited plot link. Screenshots were captured from the actual local preview.

The separately developed MCP implementation was not imported or tested here. Copies use ordinary canonical chapter/scene records and fresh revisions; an integration test with that separate branch remains necessary. No iPad sidebar search changes, publishing, merge or deployment are included.

The standalone PostgreSQL check is `tests/postgres-chapter-copy.ts`. It refuses a nonempty database and requires an explicitly disposable database named `qq_chapter_copy_test`, a matching `DATABASE_URL` and `QQ_DUPLICATE_TEST=disposable-only`. Initialize the schema using the project's normal schema tool before running it with Node 24 and `--import tsx`.
