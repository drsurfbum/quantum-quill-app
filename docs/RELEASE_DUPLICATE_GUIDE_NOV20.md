# Duplicate Chapter and Home Screen guide — November 20, 2026

This release integrates the existing Duplicate Chapter (`c11753e`) and iPad/Android Home Screen guide (`b678b72`) branches onto the deployed writing-history/Word Finder baseline `ce88058`. The original branches and worktrees are preserved by normal merges. It does not include the separate local MCP candidate or plot-review experiments.

## Writer-facing behavior

- In Write, open a chapter's options menu → **Duplicate Chapter**. Pending writing saves first. The new draft appears directly after the original; chapter prose or all scenes, plans, beats and valid Bible references are copied. Both chapters appear in exports. Plot links stay with the original, and shared Bible entries remain shared.
- The copy has its own identity, revisions and saved history. Its first changed save captures the copied prose as a baseline. Undo/Redo and history restoration on the copy leave the original's prose and history unchanged.
- **Help → Add QQ to your Home Screen** opens the illustrated iPad Safari/Android Chrome guide in a separate tab. The same public guide is linked from Login at `/help/install`. It documents browser shortcuts; it does not add offline support, a native application or guaranteed installation metadata.

The combined browser review caught a menu/dialog handoff defect: a chapter action menu could leave page pointer events blocked after confirmation closed. The chapter options menu is now nonmodal, allowing the confirmation dialog to own its modal state. Keyboard dismissal and actual mouse interaction after copying are verified without force-clicking or stripping styles in the test.

## Verification

Only disposable fictional projects and test databases were used.

- TypeScript and production build pass; the existing large-bundle advisory remains.
- 527 tests in 50 suites pass, including account ownership, source snapshots, idempotent retries, failed-write recovery and copy rollback. Added assertions verify independent copy-history baselines and unchanged source history.
- PostgreSQL copy tests create their own random database, initialize the existing schema/history there, then remove it. Receipt failure rolls back insertions, copied references and order. Same-request races create one copy; competing stale snapshots fail. History baselines and source isolation pass.
- Existing PostgreSQL history/concurrency/rollback checks pass. Production startup, restart and synthetic paired database/upload restore pass across 19 tables.
- Existing combined Chromium/WebKit editor checks pass: formatting/inline links, Word Finder, visible Undo/Redo, history restoration, stale writes, pending/failed saves, reload recovery, navigation and narrow layouts. The separate Chromium saved-history walkthrough also passes.
- Home Screen guide checks pass for public/Login navigation, Help opening separately, all ten steps, keyboard controls, responsive desktop/tablet/narrow layouts, dark mode, reduced motion and image-independent instructions.
- The new Chromium/WebKit copy walkthrough verifies keyboard confirmation/dismissal, latest pending writing, copied formatting/links, independent history/restore, scene plans/context and Help opening while writing saves. Exact-head CI reruns it alongside the existing combined browser suites.

The browser workflow carries forward the independently validated tooling correction from MCP commit `7101b07`: official Playwright 1.65.1 container pinned by digest, avoiding the observed per-run operating-system dependency download timeout. No MCP application code is included. Node 24, browser coverage and existing test commands remain in place; copy and guide checks are added.

## Release and rollback boundaries

No schema change, migration, database backfill, dependency/lockfile change, retention deletion or upload relocation. The deployed migrations, alpha bootstrap, PostgreSQL storage implementation and editor/save/recovery implementation are unchanged. Normal existing initialization commands remain idempotent.

The owner authorized PR review, normal merge and deployment of these two features. Merge/deployment receipts belong in the PR and public roadmap; passing local checks alone does not mean this release is live. Render automatic deployment stays off, and the existing app/database/disk plans remain unchanged.

For an application rollback, redeploy `ce88058` without restoring an old database or deleting copies/history created afterward. Copies are ordinary chapters/scenes that the previous release can read. Preserve the existing private recovered-data and release-backup archives.

Physical iPad/Android Home Screen installation, software keyboards and native assistive-technology acceptance remain unverified. Local fixture checks are not edits to a hosted user's manuscript.
