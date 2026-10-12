# Shared Story Bible relationships

Implemented locally on October 11, 2026. The seven maintained entry types and the generic compatibility editor now use one searchable picker, one link contract, and one API. No graph visualization is included; backlinks and navigation are available first.

## What is available

| Entry | Shared relationship controls |
| --- | --- |
| Events | Participants (characters/groups), locations, consequences/follow-ups, research references, related entries |
| Groups & Races | Members, leaders, parent group, home locations, allies/rivals, historical events, references |
| Locations | Parent location, inhabitants, governance, historical events, nearby locations, references |
| World Elements | Users, affected locations, historical events, research references, associated entries, parent element |
| Characters | Affiliations, home locations, related entries, history and references |
| Details / Research | Applications to any maintained entry type, references and other connections |

Every editor has backlinks and an expandable list of all outgoing relationships. Following a name opens the current record after pending writing saves. Archive/restore is available in the shared connections panel for every type.

Event outcome type/tags are also editable; they remain narrative/classification information on the Event rather than links. Free-text alliance, rivalry, subgroup and world-element notes are retained as prose. They are not guessed into IDs.

## Link contract and direction

`shared/relationships.ts` is the definition and compatibility-reader source of truth. Each link has:

- `id`, `projectId`, `sourceId`, `targetId`, `relationshipType`.
- `role`, `context`, `startDate`, `endDate`; empty strings mean not supplied.
- An opaque `version` for mutation preconditions, and a numeric revision.
- Optional legacy provenance identifying the original owner and field.

A link points from source to target. Backlinks are derived, never separately copied. A Group's member link points to a Character; the Character sees that membership as a backlink. Parent links always point child → parent. Recovered `childElements` are inverted on read to follow the same rule.

Dates accept fictional calendars, eras, and approximate dates; the application does not infer Gregorian ordering. Display names always resolve from the current project entry list. Target titles are not saved in new link records. Returning to a browser tab refreshes that list, and same-tab rename saves update the cache.

## Persistence and compatibility

`migrations/0003_bible_relationships.sql` adds only `bible_relationships`, a table separate from entry prose/metadata. It does not rewrite any recovered entry. Relationship edits do not increment an entry's writing revision. Native link revisions are independent of prose autosaves; an unmodified recovered link initially uses its owning entry revision as a conservative precondition until its first overlay is saved.

The reader projects known ID links from both metadata and structured JSON, including Location controlling groups/notable characters, generic linked fields, and World Element child lists. Unknown fields and malformed payloads remain in their originals. No names are interpreted as IDs.

A recovered link has a deterministic ID based on its original owner, field, and target. Explicit editing creates a revised overlay; removal writes a tombstone. The original payload stays intact, but its old link is no longer active. Tombstones prevent old links from reappearing on reload or subsequent prose saves. The staged version-2 data-contract migration remains gated on review; it must consume this effective relationship view when eventually activated.

The local read-only audit found **47 entries and 8 known legacy links**, all with available same-project endpoints. Their types were 1 affiliation, 4 applications, 1 event location, 1 parent, and 1 related entry. The originals were not changed by this audit.

## Validation, concurrency and lifecycle

The project owner check precedes every list/mutation. Both endpoints must exist in the same project, match the allowed source/target types, and differ from each other. Inputs are strict; invalid fields/types return actionable 400 responses. Duplicate relationships with the same source, target, kind and date range return 409.

New and recovered hierarchy edges participate in one cycle check. A child has at most one distinct parent. Project advisory locks serialize validation, link changes, archival and deletion in PostgreSQL, including concurrent processes. Memory fixtures use the same project locking boundary.

Editing/removing a link requires its reviewed `_version`. A stale version returns 409 `REVISION_CONFLICT`; the form keeps its draft and displays the current server values. Adopting the reviewed version and then saving are explicit actions. No automatic merge or overwrite occurs.

Deletion blocks whenever an active incoming **or outgoing** link exists, with 409 `ENTRY_LINKED`. Remove links first, or archive the entry. Archive preserves links/backlinks and displays an Archived marker. New links to/from archived entries and edits involving them are rejected; unlink remains available. Restoring the entry makes it linkable again. Old broken links remain removable.

Stub creation and its link are one transaction. The picker restricts stub types, requires a name, and rejects an existing same-type/name entry. Request UUIDs plus payload fingerprints make retries safe after a lost response. A database failure after stub insertion rolls the entire operation back. Request IDs are project-scoped.

## Relationship drafts

Forms checkpoint locally on change, scoped by account, project, source entry, link/section and browser page. Another tab cannot replace or remove this page's recovery record. Reopening the same form offers explicit restore/discard choices. The reviewed link version is retained with the draft, so restoring it cannot silently overwrite a newer link.

Failed writes leave the form and recovery copy intact. Storage failures show an explicit copy/keep-open warning. This uses browser storage, not encryption or a full offline app shell. Clearing site data removes recovery copies. Relationship drafts are reviewed in the relationship dialog; they are not part of the existing prose-draft banner.

## API

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/projects/:projectId/relationships` | Effective outgoing links and backlinks for the project |
| POST | Same | Create a link using `requestId`, or create a typed `stub` and its link atomically |
| PUT | `.../relationships/:linkId` | Replace link values with `_version`; source ID stays fixed |
| DELETE | Same | Explicit unlink with `_version`; original legacy payload retained |

Legacy entry PUT formats remain compatibility inputs for older clients. Current editors write relationships exclusively through this API.

## Verification and rollback

- **293 tests in 19 suites passed**, including the 131-case field walkthrough. TypeScript and the production build passed. The suite covers create/edit/remove, target renames, role/context/date persistence, missing/wrong/cross-project targets, cycles, archive/delete guards, idempotent stubs, draft recovery, account scoping and explicit conflict review.
- The PostgreSQL scratch test verifies concurrent writes, hierarchy locking, exact preservation of original rows during the additive migration, stub rollback after an injected database failure, and removal of the new table without changing original entry rows.
- A synthetic browser walkthrough verified Event stub creation, role/date edits, following a target, backlinks and rename propagation.
- The working database received a fresh private dump before the additive table migration. The before/after comparison matched every original non-session table, including all 47 Story Bible entries. The new table was empty at adoption.

Private evidence is in `.local/relationships/`: the backup dump, `adoption-verification.json` (counts/hashes), `legacy-link-audit.json`, and walkthrough screenshots. Existing recovered-data backups remain intact.

For application rollback, preserve the new table and its latest dump before reverting code. Older code ignores the table, so overlay relationships will not appear there. Do not drop a populated relationship table in the working database: that would discard newly authored links. The destructive rollback rehearsal was performed only in an isolated disposable database. No Story Bible content migration or production deployment was performed.

## Write layout correction

The save indicator now occupies its own fixed-height row, independent of the wrapping formatting toolbar. It reserves space for retry/conflict actions. A browser check measured the same 48px row and identical position/width for Saved and Save failed with Retry visible. The selected chapter uses readable foreground/accent colors in dark mode. User writing was not edited during this verification.
