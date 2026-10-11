# Quantum Quill local stabilization

> Follow-up: [durable draft recovery and schema/relationship integrity](DRAFT_RECOVERY_AND_DATA_INTEGRITY.md) is implemented and verified locally. That report supersedes the memory-only/conflict and unchecked-relationship limitations below; migration and unfinished feature work remain.

October 11, 2026 — local working changes based on `883942b69e12ebe499e113ee095b4e29f60c44ca`.

The scoped source-code stabilization round is complete. The app keeps its existing TypeScript/React/Express/PostgreSQL architecture. Changes remain a local, uncommitted diff for review. No branch was pushed, pull request created, migration run or deployment performed.

See [the follow-up editor/autosave audit](AUTOSAVE_AUDIT.md) for additional defects found and repaired after this first pass. Its mounted-editor tests expand the verification to rapid field updates, slow requests, browser focus changes and whitespace preservation.

## Repaired

- Authentication uses signed, server-backed sessions. Fabricated bearer identities, browser-generated identity tokens and automatic development login are removed. The server validates registration/login input, requires a private session secret, uses secure production cookies and destroys sessions on logout. Client logout reports failure honestly.
- A shared owner check protects project child reads, lists, creates, edits and deletes, including plot sections through their parent structure. Strict update schemas reject ownership, record-ID and timestamp reassignment. Cross-project parent/related-entry links and new hierarchy cycles are rejected.
- App creation no longer starts a listener, connects to PostgreSQL, initializes templates or registers routes twice. Database construction and template initialization happen only during explicit server startup. Async route errors return controlled responses instead of throwing after a response. Sensitive authentication/API-body debug logging and diagnostic endpoints are removed.
- All 26 original TypeScript errors are repaired. Story-bible imports and data typing are corrected. Inactive outline/bible entry points reuse the maintained editors. The Fabric image loader uses the current promise API.
- Chapters, outlines, plot sections and all active story-bible editors use a per-record serialized save queue. It coalesces rapid changes, preserves changes to separate fields, saves empty content, keeps later edits behind in-flight writes and retains failed drafts for retry. Switching/unmounting flushes pending work without losing the record's identity. Save status reflects the result rather than reporting success after a failure.
- A persistent in-app failure notice offers retry. Closing/reloading with pending writes triggers the browser's unsaved-change warning. Logout waits for current-account saves. Expired sessions return to login while retaining pending drafts in memory, and account changes cannot send or display another account's pending writing.
- Chapter links now honor their chapter query parameter after reload. The first outline edit is no longer skipped. Plot editing no longer replaces the shared query client's invalidation function. Deferred story-bible cache updates no longer reintroduce older responses.
- Failed outline/plot deletion no longer removes records from the interface as if it succeeded. Server guards reject deleting projects with content, outlines with children, or plots with sections/nested structures. This conservative behavior preserves writing while deletion/relationship migrations remain out of scope.

## Evidence

| Check | Result |
| --- | --- |
| Full TypeScript check | Pass; original 26 errors cleared |
| Jest regression tests | 56 pass across 7 suites, including follow-up editor regressions |
| Production build | Pass |
| Import built server without DATABASE_URL | Pass; no database initialization or listener |
| Synthetic browser session | Login works with signed session cookies |
| Chapter editing | Rapid switch preserves edits; simulated failure reports `Save failed`; manual retry and reload preserve the content |
| Chapter navigation | Reload of `?chapter=2` opens Chapter 2 |
| Outline editing | First edit and immediate switch/reopen preserve content |
| Plot editing | Rapid changes to two sections remain independent and persist |
| Story bible | All seven specialized editors open; edits to every type verified by server readback |
| Browser console during smoke checks | No captured JavaScript errors |
| Whitespace check | Pass |

The API tests use fresh in-memory fixtures with real database imports blocked. Browser checks used a separate loopback server on port 5057, with synthetic accounts/writing and temporary upload storage. No test connected to the recovered application databases. Database-driver behavior, database migration behavior and all mobile/browser combinations have not been verified by this round.

## Preserved

The original Replit project, old GitHub repositories, private GitHub remote, recovered databases, 31 orphan plot sections, uploaded files, `.env` and original recovery backups were not modified by this work. No external account/service settings were changed. The pre-existing regular app process on port 5055 was not restarted during verification; review the diff and restart it to load the new backend.

## Remaining work before deployment

1. Review the 31 orphaned plot sections and decide how to recover them without guessing their parent or ownership. Add database constraints and transactional deletion behavior in a separately reviewed migration. The current guards do not replace foreign keys and cannot eliminate all concurrent database races.
2. Triage dependencies. No dependency versions were changed in this round; the restart audit's advisory findings still need focused review. The build also warns about the large bundle and stale browser compatibility data.
3. Finish upload privacy and validation. Uploaded files now require login, but historical uploads have no owner metadata; authenticated access is not yet per-project. Content-signature validation and durable storage need further work before a public deployment.
4. Add login abuse/rate limiting and verify the production proxy/session configuration on the eventual host. This is not a completed penetration test or deployment approval.
5. Autosave ordering is within one browser tab. Drafts waiting on failed writes are retained in memory, not durable offline storage; forcing the tab closed or a browser crash can lose unsaved work. Cross-tab simultaneous editing/conflict detection remains unimplemented.
6. Export remains a placeholder; AI and collaboration remain future features. The legacy whiteboard canvas is not exposed by the current Storyboard page; its API is tested, but the whole canvas workflow remains to be audited before re-enabling it.

The next useful step is review of this local diff, followed by data-integrity and dependency work. Keep deployment and feature development separate from those remaining stabilization decisions.

## Story Bible completion audit

The field-by-field follow-up adds 122 regressions (178 total across ten suites), repairs unsaved notes and status fields, relationship/image controls, dashboard discovery, and a browser-reproduced notification-triggered page remount. Type checking and production build pass. See [the explicit field inventory](STORY_BIBLE_FIELD_AUDIT.md) and [completion roadmap](STORY_BIBLE_ROADMAP.md). These remain local working changes.
