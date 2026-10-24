# Quantum Quill working policy

## Preserve writing and source history

Keep existing branches, worktrees, approved baselines and unrelated changes. Do not reset, rebase, force-push or merge as part of routine feature completion. Recovered sources, private story data, uploads, environment files and backup archives must remain private and outside new Git commits. Maintain account/project-scoped recovery and explicit revision/conflict handling.

## Push each completed feature

The user established this standing policy on October 23, 2026:

- Review the feature diff and run appropriate checks, then commit and push each completed feature to its existing feature branch in the private app repository. Do not leave completed features only on this Mac while waiting for merge review.
- Push without asking again for routine feature backup; merging is a separate decision. Do not push local `main` changes to remote `main` unless that integration is explicitly authorized.
- Preserve feature ownership and the current worktree/branch. Never force-push or silently overwrite remote changes; report a non-fast-forward conflict instead.
- Verify the remote head after pushing. Report the branch, commit and checks honestly. An implementation commit can be pushed with an explicitly reported failing check when needed to preserve work, but must not be marked validated or ready to merge.
- Update the roadmap for material feature completions. Distinguish pushed feature-branch work, reviewed integration and deployment. The public roadmap must not include private writing, account details or secrets.

Canonical app repository: `https://github.com/drsurfbum/quantum-quill-app` (private).
Public roadmap: `https://github.com/drsurfbum/quantum-quill-roadmap` (separate repository; publishing is authorized for the roadmap).
Future commit author: `DrSurfBum <80549907+drsurfbum@users.noreply.github.com>` (verified from GitHub settings). Use repository-local settings; do not change global Git configuration without approval. Preserve historical authors and source provenance.

See [development workflow](docs/DEVELOPMENT_WORKFLOW.md). Synthetic showcase data lives only in the disposable loopback fixture; never seed it into a recovered or working writing database.
