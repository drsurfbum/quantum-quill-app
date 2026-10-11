# Editor and autosave follow-up audit

> Follow-up: [durable draft recovery and schema/relationship integrity](DRAFT_RECOVERY_AND_DATA_INTEGRITY.md) is implemented and verified locally. That report supersedes the memory-only/conflict and unchecked-relationship limitations below; migration and unfinished feature work remain.

October 11, 2026. Local, uncommitted changes; no recovered database writes, migrations, GitHub pushes or deployments.

## Finding

The concern about fragile fixes was justified. The first stabilization pass fixed the shared request ordering and several editor defects, but its initial browser checks and queue tests did not cover React batching, sustained typing or all lifecycle boundaries deeply enough. This audit added mounted-editor regressions and reproduced additional failures before repairing them.

## Reproduced and repaired

1. **Story-bible fields could overwrite one another.** Events, world elements, details and research serialized an entire document along with a title change using an older render's state. A content-field change followed by a title change in one React batch lost the first change. Character metadata also lost the first of two fields changed in one batch; groups/locations used the same vulnerable pattern. Draft changes now update a synchronous current value, and title writes contain only the title. Saves run outside React state updaters, which Strict Mode can replay. Dynamic fallback fields now send individual field patches.
2. **Continuous typing postponed all writes.** A 750 ms debounce alone can be reset indefinitely. The shared queue now starts a checkpoint within five seconds of continued typing, or after a 750 ms pause. This bounds the scheduling delay, not server/network completion time. Only one write per record runs at a time.
3. **Leaving the browser had no explicit flush trigger.** Editor unmount already flushed, but browser blur, hidden-document and page-hide events did not. They now start a flush immediately, alongside reconnect and the existing before-unload warning. Browser termination still cannot guarantee an asynchronous request finishes.
4. **Reopening rich text stripped spaces.** Chapter and outline HTML parsing normalized repeated/trailing spaces. Their initial load and reset paths now preserve whitespace. Regression tests compare the complete HTML before and after unmount/reopen, including whitespace and intentionally empty documents.
5. **An older fetch could replace an acknowledged save in the cache.** The writer now cancels outstanding detail/list reads before publishing its successful result. A delayed-read regression verifies that old query data cannot replace the new writing.

## Coverage

| Editor | Mounted regression coverage |
| --- | --- |
| Chapters | Real Tiptap instance, burst of 100 insertions, delayed save, stale parent render, leave/reopen, exact HTML preservation, empty document |
| Outline | Same rich-text scenarios, including the first update and save status |
| Plot sections / Storyboard | Independent sections, rapid switching, delayed writes, leaving and reopening |
| Characters | Rapid field/title changes, two metadata fields in one batch, slow request and remount |
| Groups & Races | Rapid field/title changes, slow request and remount |
| Locations | Rapid field/title changes, slow request and remount |
| Events | Rapid field/title changes, three nested date fields in one batch, slow request and remount |
| World Elements | Rapid field/title changes, slow request and remount |
| Details | Rapid field/title changes, slow request and remount, network failure and visible retry, focus/page lifecycle events |
| Research | Rapid field/title changes, two content fields in one batch, slow request and remount |
| Generic story-bible fallback | Rapid text/title changes, slow request and remount |

The mounted tests use React Strict Mode, the real editor components, synthetic records and a controlled fake network. They inspect both the reopened input and the persisted request result. This complements the existing API, save-queue and account-boundary tests; it does not substitute for testing a real PostgreSQL deployment.

**Verification:** 56 tests pass across seven suites (29 added in this audit); TypeScript and production build pass. No dependency versions changed. The already-installed jsdom 20.0.3 is now an explicit development dependency so mounted tests do not depend on Fabric's optional install.

A separate browser session used the production build with two-second synthetic save latency. A burst of chapter text followed immediately by a chapter switch preserved the complete text. Editing the second chapter and navigating to Story Bible retained each chapter's own text. Editing a detail summary and body, immediately leaving, then reloading preserved both fields. No JavaScript errors were captured. These browser checks were representative; all active editor variants received the mounted regression coverage above.

## Remaining boundaries

- Pending drafts are in memory. Network failure is visible and retryable while the tab stays open, but forcing it closed, an OS termination, or a crash can still lose unsaved writing. Durable local draft recovery is the next meaningful reliability improvement.
- Ordering is enforced within one tab. Concurrent tabs/devices have no server revision conflict detection yet.
- Browser timing/focus behavior, mobile suspension and input-method composition have not been verified on every platform. DOM tests verify the flush handlers; they cannot guarantee an operating system delivers a lifecycle event.
- The legacy whiteboard canvas is not routed from the current Storyboard page. It is not included in the claim that active text editors are covered and should be audited before it is re-enabled.
- The regular local app was not restarted onto these fixes. Verification used the isolated fixture; restart the regular app only when the local diff is ready to adopt.

See [README-Testing.md](../README-Testing.md) for repeatable commands and the slow-save fixture. Original data, uploads, environment files, backups and Replit remain untouched.
