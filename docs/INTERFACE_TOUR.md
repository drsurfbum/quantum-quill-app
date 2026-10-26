# First-use interface tour

Validated October 26, 2026 on `codex/first-use-tour`, isolated from guided Story Bible work. This is an interface introduction, separate from the New Project, Blueprint and guided element-creation workflows. It is not merged or deployed.

## Experience

A small welcome invitation appears after sign-in and project loading. Starting the tour dims the rest of the screen and highlights the relevant workspace control. Ten short steps cover projects, workspace navigation, Storyboard, Outline, manuscript navigation, the writing desk, Story Bible, returning to Write, context cards, and Help/export/feedback. Starting inside a project skips the dashboard step. The intended duration is 2–3 minutes.

Navigation steps wait for the requested workspace to mount and advance once. Back restores the preceding route. Hidden manuscript/context panels can be opened through their highlighted controls; compact layouts also ask the writer to close the manuscript drawer before introducing prose. Missing targets have a Continue without this fallback. Skip tour and Escape exit immediately. Help → Replay tour is available on the dashboard and in project headers; the account menu also offers replay.

For an account without projects, Continue later ends the overlay and allows the existing New Project wizard to run independently. A continuation invitation appears once the first project opens. Visiting an empty manuscript during the tour does not automatically create a chapter, including when the tour ends on that page. The existing explicit chapter controls remain available afterward.

## Writing and account boundaries

- No prose, formatting, story facts, links or project records are written by tour steps. No schema migration, AI service or hosted configuration is involved.
- Pending saves, recoverable drafts and blocking dialogs pause the tour. Their existing controls keep ownership of focus. Back uses the existing manuscript navigation guard; the tour never dismisses a recovery/conflict dialog or reports a save as successful.
- Unrelated controls are inert while a step is active. Keyboard navigation cycles between the tour card and the highlighted action; exit restores focus. The overlay never moves the editor DOM. Spotlight transitions respect reduced-motion CSS preferences.
- Dismissal, completion and deferred continuation use account-scoped, versioned local browser preferences. They are not synchronized across devices. No manuscript content is stored in these preferences. Blocked browser storage falls back to session memory. Reload does not force an interrupted overlay to resume, and a version bump alone does not force a repeat tour.

## Disposable preview

Use Node 24. Build with `npm run build`, then run `NODE_ENV=test node --import tsx tests/tour-server.ts` from the repository root. Open <http://127.0.0.1:5067>.

- `tour-writer` / `synthetic-tour-only`: populated original sample story, an empty manuscript and an empty scene chapter.
- `tour-new` / `synthetic-tour-only`: starts with no projects.

These credentials are intentionally public fixture values. The server binds to loopback, uses in-memory storage and a temporary uploads directory, and never loads environment files, a database, private writing or recovered sources. Restarting discards fixture edits; browser tour preferences remain until cleared or replayed.

## Verification

- Full regression suite: **403 tests across 40 suites passed**.
- TypeScript and production build passed. The existing large-bundle size advisory remains.
- Mounted tests cover single advancement after delayed navigation, Back routes, completion/replay, save/draft/dialog pauses, unchanged editor identity/content, missing targets, rejected navigation guards, empty-account continuation, account separation, and keyboard exit/focus cleanup.
- Browser walkthroughs at desktop and 390×740 compact width covered real workspace navigation, Back, completion across reload, replay, account switching, first-project creation/continuation, empty manuscript fallback, manuscript/context drawers and the unchanged synthetic sample prose. Browser console reported no warnings or errors at the end of the walkthrough.
- Walkthrough fixes: prevent a mutation observer from advancing twice; remeasure removed tour targets; keep pause notices clear of recovery retry controls; use an opaque compact manuscript drawer and explicitly close it before the prose step.

Screenshots are retained in the task's `verification/first-use-tour/` folder. The walkthrough uses the actual production build and synthetic data. It is not a hosted-alpha verification or a full native screen-reader, cross-browser, input-method or device certification. Save-failure and conflict behavior was exercised by the existing regression suite and mounted pause tests, not by inducing failures in the hosted alpha.
