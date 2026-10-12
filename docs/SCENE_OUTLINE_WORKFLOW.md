# Storyboard → Outline → scene beats → prose

October 11, 2026. Builds on the protected scene and Blueprint foundation.

## The restored path

1. In Storyboard, open a plot structure and choose **Send to Outline · Blueprint Wizard**.
2. Review the plot points, expand them into scenes, and choose chapter breaks. **Create scene outline** opens Outline with the first scene selected.
3. Outline's **Scenes** view shows manuscript chapters and their canonical scene records. Edit a scene's title/summary and optionally add, reorder, or remove its story beats.
4. **Write this scene** opens the same scene's prose editor. **Outline & beats** returns to its plan. The expandable scene plan in Write uses the same fields and save queue.

Planning is optional. Storyboard has **Write now**; Outline has **Skip planning · Write now**, and **Add scene** works without a plot structure. Creating a scene in a new chapter is one atomic, idempotent operation. The existing **Outline notes** view remains available with all original tree records. Chapter-mode prose opens in Write and is not split or converted.

## Antigravity source and repairs

The reference implementation is in `client/src/pages/NarrativeArchitectPage.tsx`, `components/plan/ColumnOutliner.tsx`, `SceneInspector.tsx`, `OutlineLaunchpad.tsx`, and `plan/wizard/BlueprintWizard.tsx` under the preserved Antigravity checkout. Its useful interaction was Send to Outline → scene inspector → Write Scene. Its scene updates do not inspect unsuccessful response status, chapter/scene reorder handlers only change local state, and wizard writes are separate unguarded requests. It has a source plot-beat link but no separate ordered scene-beat list.

This implementation reuses the protected Blueprint transaction, stable source IDs, account-scoped draft journal, revisions, and explicit conflict recovery. It does not port Antigravity's saving or local-only drag controls. Moving/reordering existing manuscript scenes between chapters remains a follow-up; Blueprint's reviewed order and scene-beat order persist today.

## Data contract and adoption

`scenes.story_beats` is an additive JSONB array, default `[]`, with a database array constraint. Each beat has a UUID `id` and plain-text `text`; array order is narrative order. API validation rejects duplicate IDs, unknown fields, more than 100 beats, and beat text over 10,000 characters. Scene title, summary, beats, and prose share the scene revision, while remaining distinct fields. Concurrent stale saves are rejected; offline beat edits use the existing durable account/project-scoped restore/discard flow.

Migration `0005_scene_story_beats.sql` adds only this column/constraint. `scripts/migrate-scene-story-beats.ts` compares counts and row-value fingerprints across 13 tables within a repeatable-read transaction, rolling back if any existing values differ. Keep the new column after writers begin using it; dropping it later would discard their beats.

Fresh local rollback reference: `.local/backups/pre-scene-outline-20261011.dump`. `tests/postgres-scene-outline.ts <backup>` restores only into a uniquely named disposable database, rehearses apply/apply/rollback/reapply, checks unchanged values, tests concurrent scene-beat writes and retry/rollback behavior, and drops only that disposable database. Original recovered/Replit backups remain intact. Local adoption completed after the rehearsal; the migration verified unchanged original values across all 13 tables before committing, and the app was rebuilt and restarted on port 5055.

## Validation

- Synthetic browser walkthrough: Storyboard → Blueprint → Outline → add/reorder beats → Write prose → immediate return → reload. Beat order, summary, and prose persist independently. Original outline notes remain visible. A second empty synthetic project can add a chapter/scene without a Storyboard.
- API tests cover new-chapter/scene atomic creation, duplicate retry, ownership, beat validation, ordered round trips, clearing, and concurrent revisions.
- Mounted editor tests cover batched title/summary/beat changes, reordering/removal/reopen, and offline draft/account/project isolation. Existing real TipTap and wizard recovery tests cover shared scene-plan/prose saves.
- PostgreSQL rehearsal passed across all 13 original tables, including rollback and atomic failure checks. TypeScript and production build passed; existing bundle-size/Browserslist warnings remain.
- Full suite initially passed 311/314 tests, with three unexpected responses in two older auth/style fixture suites. Both suites passed unchanged on focused rerun (6/6). No assertions or security behavior were relaxed.
