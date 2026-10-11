# Durable drafts and Story Bible integrity

October 11, 2026. Follow-up to the field audit. This pass implements durable recovery first, then compatible schema handling and relationship integrity. No schema migration or recovered writing was changed.

## Writing recovery

Chapters, outlines, plot sections and all active Story Bible editors synchronously checkpoint unacknowledged edits in browser localStorage before the network debounce. Account, project (including plot-section ownership), resource and unique page identifiers separate drafts. Separate tabs have separate journal records. In-flight edits remain recoverable until their own server acknowledgment; newer edits cannot be erased by an older acknowledgment. Storage quota/unavailability is reported while the in-memory draft remains available.

After a reload, the account sees **Review saved drafts**. Recovery is explicit: inspect the current server fields, restore, discard, or download the draft as JSON. Restoring uses an atomic server comparison of the reviewed field values. A conflicting second write is rejected rather than silently replacing newer work. A missing/deleted record or failed request leaves the draft available. Account changes hide both the draft list and an already-open private preview. Existing edits to the same entry must be resolved before an older draft is restored.

Every active autosave sends the fields it originally loaded in a `_base` envelope. PostgreSQL compares and updates in one statement; unrelated top-level fields can change independently. The memory test implementation follows the same semantics. Incoming cache/render changes cannot silently rebase a stale open editor. An absent baseline is a visible save failure with a recoverable draft. Legacy API callers can still send ordinary PUT requests; this is not a full collaboration/version-history system.

Metadata and JSON content are compared as complete top-level fields. Conflicting nested edits require review; no speculative text merge is attempted. Browser storage is tied to the original origin/profile, and clearing site data removes its drafts. It is a recovery aid, not a database backup. Large/full or unavailable storage is explicitly reported. The legacy unrouted whiteboard is outside this text-editor recovery scope.

## Schema compatibility

`shared/story-bible.ts` provides shared readers, version-1 envelopes and known-field type validation for the seven maintained entry types. Both metadata and JSON-in-content formats remain supported. Unknown fields are retained, and converting legacy prose to a structured object retains `_legacyContent`. Scalar/array JSON is treated as legacy content rather than accidentally spread into form fields. Unchanged malformed legacy fields do not block repairs to other fields; newly malformed known fields are rejected. A future schema version cannot be silently downgraded.

For structured entries, tags and archive state are mirrored consistently when either representation is changed. These derived fields join the same atomic comparison as the source edit. There is no database DDL change, bulk rewrite, enum coercion or automatic reclassification.

Read-only rehearsal against `quantum_quill_verified_snapshot` found **47 entries across 17 type labels**. All 47 preserved their existing field values in the in-memory compatibility pass. No known-field validation issues or indexed relationship issues were found in this snapshot. Fifteen records use the seven current type labels; 32 use ten legacy labels. This check does not prove every historical field has a dedicated current editor control.

| Legacy type | Count | Migration consideration |
| --- | ---: | --- |
| character | 2 | Candidate alias for characters; inspect field layout before conversion |
| location | 5 | Candidate alias for locations |
| event | 2 | Candidate alias for events; preserve prose/metadata |
| world-element | 12 | Candidate alias for world_elements; review categories |
| lore | 2 | Decide between details and world elements |
| race | 2 | Likely groups/races with a species category; review old fields |
| government | 3 | Likely groups/races with a government category |
| group | 1 | Likely groups/races; retain its classification |
| timeline | 2 | Timeline container versus event semantics need review |
| magicSystem | 1 | Likely world element with a magic-system category |

These are migration candidates, not applied changes. A dry-run mapping, export comparison and rollback rehearsal should precede a real migration.

## Relationships

One relationship index reads existing top-level IDs, generic taxonomy links, specialized metadata parents/nearby locations, and structured content references. Free-text subgroup/alliance names remain text; they are not guessed into IDs.

New/changed links must reference an existing entry in the same project and the appropriate type. Self-links and parent cycles are rejected. Story Bible mutation validation and writes/deletes run under a project-scoped PostgreSQL transaction/advisory lock, preventing simultaneous parent changes from creating cycles. Deletion is refused while another entry references the target; the UI displays the actionable server message and users can archive instead. Historical broken references, if present later, remain repairable without blocking unrelated notes.

Details and Research now offer links to all seven types. Stored display names resolve through current IDs, so renaming a linked entry is reflected in the loaded project. The editor page exposes outgoing connections, incoming references and navigation to those entries. Existing Event/World relationship arrays are indexed and protected, but the unfinished participant/outcome/history editors have not been represented as completed features.

## Verification

- 201 tests across 14 Jest suites, including mounted recovery-dialog/account-switch tests, all 118 prior Story Bible field checks, stale render/save races, recovery after a fresh journal instance, quota failures and concurrent API writes.
- TypeScript check and production build pass. Existing large-bundle and old Browserslist-data warnings remain.
- A separate PostgreSQL script creates an empty uniquely named scratch database, exercises the production storage class and transactions, then drops only that scratch database. Atomic competing saves, JSON comparison, concurrent parent-cycle prevention, deletion guards and legacy normalization passed.
- The recovered-data audit uses a PostgreSQL READ ONLY transaction and prints only structural findings/counts. It does not export story prose or mutate records.
- The new interface was exercised in mounted React/Radix tests. A fresh end-to-end browser walkthrough of this pass is still outstanding; prior browser evidence should not be treated as verification of this new dialog.

Reproduce the checks with the commands in [README-Testing.md](../README-Testing.md). Replit, recovery backups, uploaded assets, both recovered databases and the 31 orphan plot sections remain intact. The tested local app was started at http://127.0.0.1:5055 using its eight existing plot templates. Changes are local; no GitHub push, PR or Render deployment was made in this pass.

## Next work

Rehearse the historical type/field migration and resolve the 31 orphan plot sections without guessing their parentage. Then complete one Event participant/location/follow-up workflow and extend typed roles/context to the other sections. Upload ownership/content validation, dependency review and production session/rate-limit checks remain deployment gates. See [the roadmap](STORY_BIBLE_ROADMAP.md).
