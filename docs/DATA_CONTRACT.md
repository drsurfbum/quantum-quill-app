# Story Bible data contract — version 2

Status: implemented as a pure compatibility reader, validated document format and conversion preview. The restored-database rehearsal is complete. **The working/recovered databases still use their original storage layout. No production content migration or entry conversion has been applied.**

## One contract for seven types

`shared/bible-contract.ts` defines `schemaVersion: 2` and exactly seven `type` values: `characters`, `groups_races`, `locations`, `events`, `world_elements`, `details`, `research`. Documents have:

| Namespace | Meaning |
| --- | --- |
| `title` | Entry title, separate from typed facts and narrative |
| `narrative` | Named prose sections; strings retain exact text/HTML, whitespace and Unicode |
| `fields` | Type-specific facts, dates, lists and references, checked by shared field schemas |
| `classification` | The single category/subcategory/type/status/visibility namespace |
| `tags` | The single list of tags; empty means explicitly empty |
| `archived` | The single archive flag; workflow status text never implicitly archives an entry |
| `relatedEntryIds` | Existing general links, preserving IDs |
| `legacy.original` | Complete original payload including content string, metadata, IDs, timestamps and original type |
| `legacy.unmapped` | Unknown or malformed values without a safe typed destination |
| `legacy.conflicts` | Source paths whose competing values require review |

Narrative/classification/tags/archive cannot also be supplied inside `fields`. Unknown structured keys are rejected by the v2 reader and must be retained in `legacy`. Unknown nested data already inside supported JSON structures is preserved. Future legacy schema versions require review; the code does not downgrade them.

Existing drafts may be incomplete. The API validates the shape of changed known fields rather than requiring every optional form field to be filled. Errors identify type, field path and expected shape. Unchanged malformed historical values remain repairable beside other edits. Newly invalid values, contradictory tag/archive updates, destructive `metadata: null`, and replacing a structured object with raw prose are rejected.

## Catalog and choice reconciliation

`shared/bible-catalog.ts` is the live source for the seven types, generic fields and all specialized dropdown choices. Both old taxonomy modules are compatibility exports of the **same object**. Specialized editor constant arrays and literal option groups now read this catalog. Historical options missing from newer editors are retained in the shared choice set; semantically ambiguous labels remain separate choices rather than being guessed equivalent.

Stable values used by current specialized editors remain stable (for example `protagonist` with the label “Protagonist”). Labels and aliases from the older generic taxonomy remain readable. The rehearsal does not rewrite stored labels. New entry creation accepts only the seven maintained types; existing legacy entries remain readable and editable in their compatibility editor.

Field schemas live in `shared/bible-field-schemas.ts`. They include the existing specialized fields and fields previously declared only by the generic taxonomy. Metadata link-ID controls and structured JSON reference objects have separate compatibility validators; both feed the same v2 preview. Generic “required” labels are presentation hints for unfinished drafts, not a new mandatory-field migration.

## Compatibility and mapping rules

Readers run before migration and never mutate an input. A candidate is stored beside its original in rehearsal; it never replaces the source row.

- Plain prose and scalar/array/broken JSON stay literal prose. Default sections are `biography` for Characters, `history` for Groups/Races, `description` for Locations/World Elements, `narrativeContext` for Events, `content` for Details, and `detailedNotes` for Research.
- JSON objects and metadata are inspected field by field. Known prose maps into `narrative`; typed facts and references map into `fields`. Unknown keys and incompatible shapes map to retained legacy data. Exact JSON source strings always remain in `legacy.original.content`.
- Metadata takes precedence for the three metadata editors; object content takes precedence for the four structured-content editors. Competing values are flagged, not erased. Every lower-priority value remains in the original payload.
- Compatibility tags/archive preserve the embedded value displayed by structured editors, otherwise the top-level value, otherwise metadata. New v2 documents have only the top-level contract fields. Legacy writes mirror explicit tag/archive edits consistently and reject disagreeing values sent together.
- Category candidates consider structured category, specialized metadata category/type, generic metadata category, then the top-level category. All disagreements are flagged. Subcategory prefers the top-level value. `groupCategory`/`locationType` map to classification category; `eventType`/`sourceType`/detail `type` map to classification type. `status` and `visibility` remain explicit separate classification fields.
- `foundingDate` proposes `eraEstablished`; `groupsFactions` proposes `groupsRacesInvolved`; `categorySpecific` proposes `categoryDetails`. Each proposal is shape-checked, with the original retained even when the proposal is valid.
- General relationship IDs are retained. Unsupported old relationship shapes/names are retained as legacy; no names are guessed into IDs and no record is attached to an inferred parent.

The detailed rehearsal report lists a destination for every recovered source leaf, including empty objects/arrays, plus parsed JSON fields. It also compares complete original payloads and every original database table. Thus a field need not have a present-day editor control to remain recoverable.

## Conversion is an explicit review

Ordinary Story Bible PUT requests cannot change `entryType`; they return `CONVERSION_REQUIRED`. Each editor page offers **Preview entry conversion** with a target selector and source/destination mapping. Preview checks ownership, the server revision and pending drafts. The original remains unchanged.

`POST /api/story-bible/:id/conversion-preview` accepts a target type and `_revision`; it returns a proposal, retained fields, conflicts and `canApply: false`. `GET /api/story-bible/:id/contract` returns the compatibility proposal without mutation. Applying conversions is deliberately unavailable until the migration design and flagged mappings are reviewed. A preview is not authorization to migrate.

Historical aliases propose Characters, Locations, Events and World Elements; group/race/government propose Groups/Races, and magicSystem proposes World Elements. All type changes remain marked for review. `lore` and `timeline` have no automatic target because their meanings are ambiguous.

## Rehearsal and rollback

Run with Node 24:

```sh
npx tsx scripts/rehearse-bible-contract.ts /absolute/path/recovery.dump .local/contract-review
```

The script accepts a dump path, not a database URL. It creates a uniquely named `qq_contract_rehearsal_<uuid>` database, restores the dump with no owner/privilege changes, stages proposed documents in a separate table, verifies all original values and field mappings, commits and verifies staging, drops staging as a rollback rehearsal, compares all original tables again, and drops only its own disposable database. It verifies the backup file's SHA-256 before and after. Reports contain field paths/counts/hashes, not story prose, account credentials or original JSON payloads.

The verified recovery backups remain the rollback point. Before activation, review the four ambiguous records and two classification conflicts identified in [the rehearsal report](DATA_CONTRACT_REHEARSAL.md). Production rollout must be additive with retained originals, explicit approval of mappings, version-aware writes and a reviewed rollback path. Do not use `db:push` or bulk discriminator updates to activate this contract.

## Verified implementation

- 260 tests across 18 suites pass, including all 118 existing Story Bible field cases (the former raw type-change case now verifies the conversion gate).
- TypeScript and production build pass; the existing bundle-size and Browserslist-age warnings remain.
- PostgreSQL scratch integration passes revisions, concurrency, legacy handling and account isolation.
- Browser walkthrough verifies durable reload recovery, conflict restore/discard and cross-tab account isolation. A separate final walkthrough shows a legacy prose entry, previews Details → Research, displays its retained payload/field mappings and leaves the original editor unchanged.
- Baseline code checkpoint: `b8719f0`; writing-safety checkpoint: `823aa98`. Code is adopted locally; no GitHub push or Render deployment is part of this phase.
