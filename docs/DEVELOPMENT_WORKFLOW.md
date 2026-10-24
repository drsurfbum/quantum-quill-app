# Feature delivery and GitHub backup policy

Established by the user on October 23, 2026.

Each completed feature should reach GitHub promptly even when it is not merged. The normal sequence is: inspect the current branch and unrelated changes; finish a bounded feature; review its diff and run the relevant checks; commit only the intended files; push the existing feature branch; verify the remote commit; report its status and remaining limits. Preserve uncommitted work belonging to others.

Pushing a feature branch is standing authorization. Merging to main, rebasing/resetting existing branches, force-pushing, changing visibility, deploying the app, changing credentials/permissions and destructive data migrations remain separate actions. If checks fail, retain and describe the failure instead of weakening checks or representing the feature as validated.

The local active app is on `codex/writing-first-layout`; the managed integration worktree is on `codex/workspace-integration`. They contain equivalent adopted feature changes through October 14 with different commit histories. Preserve both branches and push each when it receives relevant work. Do not combine their histories just to make their hashes match. The existing local main commits are already ancestors of the active feature branch; preserve them there without moving remote main as an incidental backup step.

Use `https://github.com/drsurfbum/quantum-quill-app` for app work. It remains private. The separate `quantum-quill-roadmap` repository hosts only the public roadmap. Update the roadmap after accepted feature work, explicitly labeling local/pushed scope, limitations and the last real validation date. Publishing a roadmap does not deploy Quantum Quill or make the app ready for testers.

The verified future author is `DrSurfBum <80549907+drsurfbum@users.noreply.github.com>`. Apply identity changes locally to this repository, never globally without permission. Do not rewrite historical authors. Keep old recovery/audit repository names where they document provenance.

## Shareable demonstrations

Build the app, then run `NODE_ENV=test node --import tsx tests/showcase-server.ts` with Node 24. This starts the real app routes/UI at `http://127.0.0.1:5063` using only a synthetic in-memory story. Sign in as `demo-writer` with password `synthetic-showcase-only`. These are intentionally disposable local fixture credentials, not an app account. No `.env`, database connection, imported source, or real writing is loaded. Restarting clears demonstration edits.

Capture screenshots through the actual interface. Do not redraw controls, imply planned functionality already works, include private account information, or post to other people without explicit instruction. Sample story text is original demonstration material, not an excerpt from the user's novel.

## Later project-history work

Reconstruct QQ's long development history from preserved commits, Replit/Antigravity sources, dated planning notes and recovery receipts. Treat this as a separate future research/storytelling task. Retain uncertain dates as uncertain and separate planned concepts from features that actually existed. No history rewrite or source deletion is part of that work.
