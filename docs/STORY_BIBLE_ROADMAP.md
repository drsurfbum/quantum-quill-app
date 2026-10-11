# Story Bible completion roadmap

> Follow-up: [durable draft recovery and schema/relationship integrity](DRAFT_RECOVERY_AND_DATA_INTEGRITY.md) is implemented and verified locally. That report supersedes the memory-only/conflict and unchecked-relationship limitations below; migration and unfinished feature work remain.

October 11, 2026. Based on the active code and the recovered June 2025 specifications. See [field audit](STORY_BIBLE_FIELD_AUDIT.md) for repaired and verified controls.

## Recommendation

Keep React/TypeScript and the specialized forms. The late expansion is substantial and worth completing. Finish persistence and relationships before adding more categories, AI or visual polish. Avoid another independent form/schema system: the current split between metadata, JSON content and two taxonomies is the main source of future inconsistency.

## What the original sections still need

| Section | Already usable | Unfinished specification |
| --- | --- | --- |
| Characters | Profile, appearance/personality, abilities, backstory, generic relationships, images/tags | Dedicated research/reference controls; relationship types and roles; consistency with enhanced taxonomy fields such as affiliations/archetypes/importance |
| Groups & Races | Species/organization branches, hierarchy fields, leadership/culture/history, simple allies/rivals, links/notes | Member roles and biographies; typed parent/child relationships instead of child names; linked founding/history events; dependencies; relationship notes; world-element affiliations; suggested next entries |
| Locations | Planetary/structure branches, environment/features/history, parent creation, links and notes | Roles for residents/controllers; effective dates/ownership history; linked founding and historical events; typed world-element links; multi-biome support; sibling browsing and founding-event suggestions |
| Events | Dates/eras, locations, narrative/writer annotations, timeline flag | Participant editors with roles; consequences/outcomes and chained follow-up events; related world elements; actual timeline and character arcs; update notifications |
| World Elements | 16 category choices, category-specific or general details, origins/lore, images/tags/archive | Major historical events; users/affected locations; typed character/location/event links with context; research references; editable parent/child hierarchy; tailored fields beyond the current general fallback |
| Details | Content, usage, status/outcomes, links, tags/archive | Group linking; suggested relationships; apply-to-entry and convert-to-type workflows; actual collaborator permissions behind visibility labels |
| Research | Sources, references, summaries/notes, topics/tags, next steps, links | Rich notes; structured key points/quotes/data; attachments; reminders; broader links; applying research to entries; change notifications and collaboration |
| Shared creation/dashboard | Create blank entries and immediately edit; search/filter/category browsing; archive and priority | Category administration, guided/stub creation across types, safe conversions, bulk operations, accessibility/keyboard improvements, export/import and conflict recovery |

“Visibility,” “Include on timeline,” and team notes currently store intent/content; they do not implement publication permissions, a timeline screen, or collaboration.

## Proposed development sequence

### 1. Adopt the stabilization baseline and protect writing

Review the local diff and use the synthetic fixture for a writer walkthrough. Add durable, account/project-scoped draft recovery with explicit restore/discard choices. Add server revisions and conflict handling for concurrent tabs/devices. Add fixture-based validation for legacy plain text, JSON and metadata, without rewriting originals in place.

**Exit criteria:** offline edits survive reload; reconnect does not overwrite newer server writing silently; account switches cannot reveal another user's drafts; failed writes are recoverable; current field suite remains green. Existing recovered-data backups remain the rollback point.

### 2. Establish one data contract and migrate safely

Choose a versioned structured schema for all seven types. Keep narrative prose distinct from structured data. Reconcile `shared/taxonomy.ts`, `shared/enhanced-taxonomy.ts` and hard-coded editor choices. Define one source of truth for classification/tags/archive. Design compatibility readers first, then a dry-run migration report on a disposable restored database. Retain unknown legacy fields and original payloads. Treat entry-type changes as explicit conversions with previews, not a raw discriminator edit.

**Exit criteria:** every recovered field maps to a documented destination or retained legacy payload; before/after counts and field values match; rollback is rehearsed; type-specific API validation has actionable errors. No destructive production migration until reviewed.

### 3. Complete relationships as one shared capability

Introduce links with source ID, target ID, relationship type, role/context and optional dates. Reuse a searchable picker everywhere; support safe stub creation. Resolve display names from IDs. Enforce same-project access, hierarchy cycle checks and explicit deletion behavior (block, unlink, or archive). Build backlinks and navigation before a graph visualization.

Implement the missing Event participants/consequences first, followed by Group membership and Location governance/history, then World Element usage/history/references. This delivers the greatest increase in useful world-building without duplicating link logic.

**Exit criteria:** create/edit/remove and rename-target round trips work; no stale copied names; invalid targets/cycles rejected; deleting or archiving linked entries has predictable behavior; all sections use the same picker and link model.

### 4. Complete section workflows

Add the Event timeline with fictional-calendar and approximate-date rules. Then complete World Element hierarchy and tailored details. Add Research attachments and rich/structured notes, research application, reminders and dedicated Character references. Finish Detail group links and explicit apply/convert workflows. Follow with opt-in next-step suggestions (founding event, related location, character arc, linked research).

**Exit criteria:** each recovered specification has a corresponding working control/view or an explicitly deferred item; suggestions are reviewable actions; creating a linked stub keeps the current draft; attachment failures are visible and recoverable.

### 5. Prepare the private Render deployment

Use the existing GitHub workflow and the user's preferred Render account when deployment is requested. Plan PostgreSQL backups/restores, authenticated attachment ownership and storage, health checks, environment management, observability and a staging rehearsal. Decide single-instance persistent disk versus object storage based on actual usage and scaling needs at that time. Do not assume historical uploads are safe for a public multi-user service merely because they require login.

**Exit criteria:** a clean database restore and upload restore are rehearsed; authorization is verified for all records/files; staging passes creation/edit/reload and conflict/offline scenarios; operating costs and rollback are reviewed. Deployment is not part of this field-repair pass.

## Suggested delivery shape

Use small, reviewable increments with acceptance tests beside each change. Start with durable drafts, then the schema/compatibility layer, then one complete relationship workflow (an Event with participants, location and follow-up). Extend the proven relationship model to the other editors. Keep AI generation, multiplayer collaboration and advanced visual graphs behind the writing/data reliability milestones.

No language rewrite is needed for this plan. Most work is data modeling, state management and completion of UI workflows; moving to Rust would not address those gaps.

## Recovered specification sources

These local reference files remain unchanged under `attached_assets/`:

- Character/layout: `Pasted-2-2-Section-Grouping-Collapsible-Panels-Clear-Section-Headings-Divide-the-main-form-into-well--1750450935918_1750450935919.txt`
- Groups: `Pasted-1-Groups-Races-Example-Flow-for-Groups-Races-Page-1-Header-Area-Sticky-Title-Group-Rac-1750475810947_1750475810948.txt`
- Locations: `Pasted-2-Locations-Example-Flow-for-Locations-Page-1-Header-Area-Sticky-Title-Location-Name-e-g--1750476166608_1750476166609.txt`
- Events: `Pasted-3-Events-Example-Flow-for-Events-Page-1-Header-Area-Sticky-Title-Event-Name-e-g-Battle-1750478527594_1750478527595.txt`
- World Elements: `Pasted-4-World-Elements-Example-Flow-for-World-Elements-Page-1-Header-Area-Sticky-Title-Element-N-1750479752868_1750479752868.txt`
- Details: `Pasted-5-Details-Example-Flow-for-Details-Page-1-Header-Area-Sticky-Title-Detail-Title-or-autogen-1750524315728_1750524315728.txt`
- Research: `Pasted-6-Research-Example-Flow-for-Research-Page-1-Header-Area-Sticky-Title-Research-Title-e-g--1750526750530_1750526750531.txt`
