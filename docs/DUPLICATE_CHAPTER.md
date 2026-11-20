# Duplicate Chapter and alternate drafts

Duplicate Chapter creates an independent chapter in the manuscript. See [November 20 release verification](RELEASE_DUPLICATE_GUIDE_NOV20.md) for integration and release evidence.

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

Each chapter or scene has one current prose body. Revision counters protect concurrent saves. Saved version history preserves earlier bodies and supports preview, comparison and deliberate restoration; editor Undo/Redo handles the current editing session. The local draft journal supports unsaved-work recovery and conflicts. These controls do not provide named parallel drafts or manuscript-draft selection. The chapter’s Draft status is a completion flag, not an alternate-version selector. A copy starts its own saved history on its first changed save, with the copied text retained as its baseline; it does not inherit the original’s history.

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

The PostgreSQL check is `tests/postgres-chapter-copy.ts`. Set `QQ_TEST_PG_ADMIN_URL` to a disposable PostgreSQL instance and run with Node 24 and `--import tsx`. The test creates and removes its own randomly named database, applies the existing alpha/history schema there, and tests copying plus independent history. It never uses a working database or a restored manuscript.
