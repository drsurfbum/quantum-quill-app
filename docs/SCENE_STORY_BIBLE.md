# Scenes and Story Bible — October 13, 2026

Scene references are available in **Outline → Scenes**, beneath the selected scene's plan. In **Write**, open a scene chapter and choose **Show Story Bible**. The same reference editor serves both views. A chapter written as continuous prose can still be used without scenes or planning.

## Writer workflow

- Choose one optional viewpoint character, any cast members, locations, and references to any of the seven current Bible types. An omniscient or unspecified viewpoint can remain empty. Linking a viewpoint character does not silently add a second cast link.
- The searchable picker uses existing entries from the current project. Create new entries in Story Bible first; the scene picker does not yet create stubs. The existing Bible-to-Bible stub workflow is unchanged.
- Read a concise card beside prose, or expand **Scene-specific note** for why this entry matters in this particular scene. Card text is read-only; opening the Bible entry edits the source. IDs identify links; titles and descriptions come from the latest fetched Bible records. Another device's rename appears on refetch/window focus or reopening the panel, not through a live push channel.
- **Open [entry]** saves pending edits before navigating. Bible entries have **Used in scenes** with links to Write and the scene plan. A scene opened through its context card also has a **Return to scene** action. Navigation fetches the scene's current chapter so moved scenes continue to open correctly.
- On wide screens the panel has its own scroll area beside prose. On narrower screens it overlays the right edge with a visible close button, leaving the underlying editor dimensions unchanged. Save-status space stays reserved.
- Removing a scene reference retains both the scene and Bible entry. Archiving a Bible entry preserves existing scene references; it cannot be newly linked until restored. Deleting an entry used in scenes is blocked with an actionable message. Type conversion remains preview-only under the existing migration-review gate.

## Storage and writing protections

`scene_bible_contexts` is an additive table: explicit `scene_id`, `project_id`, its own `revision`, and a `links` array containing `entryId`, `role`, and `note`. The four roles are viewpoint, cast, location and reference. Scene IDs are never interpreted as Bible IDs. No names, summaries, prose, or legacy Bible payloads are copied into the links.

An old scene without a row reads as an empty revision-0 context document; reading never writes it. The first actual reference edit creates the row. Updates require a matching revision and reviewed field baseline. The project transaction/lock is shared with Bible deletion/archive validation. Only characters are valid viewpoint/cast targets; only locations are valid location targets; every target must belong to the same project. Duplicate entry/role pairs, multiple viewpoints, unknown fields and invalid IDs are rejected. Limits: 200 links per scene and 5,000 characters per note.

The existing serialized save queue journals reference edits synchronously before debounce. The journal explicitly permits `/api/scenes/:id/context`, remains account/project scoped, and participates in pending-save/export/navigation checks. Failed or conflicting writes retain their draft. Recovery presents current entry names and scene notes with explicit restore/discard choices. Restoring checks the revision reviewed by the writer again; another intervening write cannot be silently overwritten. Recovery does not provide offline application-shell caching.

References use their own revision, so saving links cannot overwrite scene prose, summary or beats. A conflicting link set is reviewed as a whole; automatic semantic merging of two devices' cast lists is not attempted. Existing prose save/recovery behavior is unchanged.

Outline exports include current linked names, roles and notes. Manuscript-only prose exports exclude this planning material. Original-record JSON exports include `sceneContexts` when manuscript, outline or Bible is selected. The complete database/uploads backup remains the full recovery source.

## Verification

- **347 tests / 30 suites passed**, including the existing writing/field suites; TypeScript and production build passed. The build retains its existing large-chunk advisory.
- New API coverage: empty compatibility reads without writes; create/edit/remove; all seven reference types; live backlinks after scene rename and move; ownership/account/same-project checks; invalid roles and duplicate/viewpoint limits; concurrent link conflicts alongside independent prose saves; failed-save retry; archive/delete races; and planning/JSON export separation.
- New mounted React coverage: rapid note changes, shared picker with overlapping scene/Bible integer IDs, renamed-target cards, account/project-scoped durable drafts, reviewed restore rejected after another change, moved-scene navigation, and legacy plain text/JSON/metadata cards without original mutation.
- Synthetic browser on port 5057: search/link Old Harbor; reload retains links; open Mara's Bible entry, rename it and follow its scene backlink; edit note and prose together then visit Outline; force a write outage; verify protected navigation; reload; compare readable recovered/server notes; explicitly restore after reconnect; confirm original prose remains; reopen Write. At 1024×768, closing the compact panel leaves the editor bounds unchanged; no horizontal page overflow. This is a focused desktop/compact walkthrough, not comprehensive mobile/IME certification.
- Disposable PostgreSQL restore: migration rollback and repeat application, concurrent link conflict, concurrent prose preservation, archive/delete guards and trigger-induced write rollback passed. After removing only synthetic fixtures, counts and complete row-value fingerprints matched across all **13 original non-session tables**. Removal of the unused additive table was rehearsed only in that disposable database.

## Local adoption and rollback

The migration has been applied to this Mac's working database and the app restarted at `http://127.0.0.1:5055`. A before/after fingerprint check confirmed all 13 original non-session tables unchanged and zero context rows created by migration. No recovered scene/Bible payloads were migrated. Original Replit/Antigravity data and recovered-data backups remain intact.

A fresh paired pre-change backup is `.local/backups/20261013T162244Z-local.xPO1tB/` (`database.dump`, `uploads.tar.gz`, verified `SHA256SUMS`). The private adoption evidence is `.local/backups/scene-context-adoption-20261013.json`. Neither is committed.

On another restored database, apply existing earlier migrations first, then run `npm run db:migrate:scene-context` with the intended `DATABASE_URL`. The script adds the table/index in one transaction. Rehearse on a disposable local restore with:

```sh
node --import tsx tests/postgres-scene-context.ts <backup.dump>
```

For application rollback, use the previous code and retain the additive table so newly written references remain recoverable. Never drop a working context table or restore an old backup over new writing. Restore backups into a separate database for inspection. This feature does not apply the gated Bible contract conversion and does not deploy to Render.

## Find missing connections — October 14, 2026

In **Write → Context → Story Bible**, choose **Find missing connections** to scan the current scene's live editor text, including unsaved writing. This review opens over the workspace; it does not remount or move the prose editor. Scanning and skipping are read-only. Nothing is sent to an external service, and the scan does not create new Bible entries.

Suggestions match this project's active Bible entries by title, quoted nicknames, explicit alias fields, and conservative name variations (for example, a character's surname or a ship name without its prefix). Matches respect Unicode word boundaries and can span formatting marks. Full names take precedence over contained fragments; shared names are flagged for review. Existing scene references and inline links are excluded. Up to three passages explain each suggestion. This is name matching, not a semantic assessment: pronouns, unnamed participants, implied settings, and names absent from the Bible are not detected.

Every suggestion defaults to **Reference · mentioned**. The writer can choose **Cast · participates** for a character or **Location · scene setting** for a location before adding it. Viewpoint remains an explicit decision in the existing scene editor. Adding preserves existing roles and notes, does not duplicate an already connected ID, and uses the existing revisioned, account/project-scoped draft queue. The manual context editor and scanner are never mounted simultaneously, so an older local form cannot replace a newly added connection. Offline additions remain recoverable; concurrent reference changes require review. A changed editor document requires a fresh scan before adding more suggestions.

The first version scans one scene at a time. It never inserts inline marks, changes prose or formatting, scans plan/beat text, or automatically applies suggestions. There is no database migration. Focused tests cover matching and ambiguity, scope/archive filtering, duplicate/role limits, pending manual notes, editor identity and HTML preservation, offline recovery, stale scans, account switches, and concurrent-tab conflicts.

Validation for this addition: **380 tests across 36 suites passed**, plus TypeScript and the production build. The existing bundle-size advisory is unchanged.
