# Antigravity Story Bible: what to integrate

Source review, October 11, 2026. This supplements `ANTIGRAVITY_COMPARISON.md`; it does not migrate Antigravity records or change the current Bible contract.

The best part of Antigravity's Bible is how it helps a writer develop an idea. Our current version is the stronger place to store and protect that work. Integrate those presentation and prompting ideas into the seven current types and shared relationship model.

## 1. Character development workbench

Antigravity's `shared/enhanced-taxonomy.ts` groups character fields into Classification, General Information, Physical Appearance, Personality & Psychology, and Social & Background. Its `TraitConstellation.tsx` offers searchable catalog chips with short explanations; the selected traits are easier to scan than a long free-text list. `taxonomy-data.ts` provides 12 archetypes, five positive traits, five negative traits and eight wounds.

Useful additions are multiple narrative archetypes, positive/negative traits, a formative wound, the belief arising from that wound (“The Lie”), fears, desires and flaws. These are writing prompts and optional choices, not mandatory psychological labels. A compact Character Arc section could connect wound → belief → desire → conflict → change, with room for the writer's own language.

Proposed destinations, to add through the shared catalog and validation together:

| Antigravity concept | Current integration |
| --- | --- |
| `archetypes` | A new narrative-archetype field, distinct from the existing `archetype` profession/role list. Do not relabel Pilot/Scientist/etc. as psychological archetypes. |
| `positiveTraits`, `negativeTraits` | Optional arrays of stable catalog IDs, with descriptions from a shared catalog and custom entries supported. Keep `personalityTraits` prose intact. |
| `ghost` | A wound/past-experience field with suggestions and free text. Retain the original value if imported; labels and catalog IDs are not interchangeable. |
| `lie` | Optional mistaken-belief prose; do not replace the existing `beliefs` field automatically. |
| `fears`, `desires`, `flaws` | Optional development prose; motivations/conflicts remain separate existing fields. Map overlap only through a reviewed import. |
| `home`, `allegiance`, `race` | Use real current entry IDs and shared links to Locations and Groups/Races, with roles such as origin, membership or species. Preserve unresolved legacy text. |

Avoid a subtle defect in the old trait control: unknown selected IDs return `null` and disappear visually. Our version should show an “unrecognized saved value” chip and retain it until explicitly removed. Its remove buttons also become visible only on hover; accessible labeled controls should work with keyboard and touch.

The source defines Needs and Enneagram catalogs, but the reviewed active taxonomy fields do not use them. They are possible future material, not recovered working features.

## 2. Gallery and category board

`CodexGallery.tsx`, `EntityCard.tsx` and `WorldCodex.tsx` provide a more browsable overview: image cards, short descriptive text, category filters, density controls and a category board. This is a good optional view alongside the current list, especially for larger casts or locations.

Read cards through the current compatibility reader. Use canonical classification, tags, priority and archive fields. Card text must not depend on a second metadata copy. Category moves should be explicit, revision-checked updates; dragging must never change the entry's type. Keep type conversion as a previewed operation. Avoid carrying over the project's destructive sample-database seed control.

## 3. Shared field groups, not a wholesale generic-editor replacement

`universal-entry-editor.tsx` renders groups and common field controls from taxonomy definitions. That can reduce duplication for simple text, selections and trait chips in our editors. Our specialized Event, Location and World Element workflows still need to retain their richer nested data and relationship sections.

Antigravity defines nine taxonomy types but its ordinary Codex/create interface exposes four main types. The definitions alone do not establish working coverage. It splits Groups and Races, adds Items/Languages/Magic Systems, and lacks our Details/Research types. Its generic renderer does not consume all category-specific World Element definitions. No type-discriminator replacement is appropriate.

A safe first UI change is a shared collapsible field-group component, followed by the character development workbench. Each addition must use the current autosave and schema validation, retain unknown fields, and join the existing field-suite round trips.

## 4. Bring Bible context into Write

Antigravity's strongest architectural idea is the connection between a scene, its plot beat and its cast/location context. The restored scene IDs now provide a clean attachment point. Next, add a scene reference table or extend the relationship service with explicitly typed scene endpoints; do not pretend a scene ID is a Bible-entry ID.

Use the existing searchable picker and ownership checks. A writer could choose a scene's cast, viewpoint and location, then open concise Bible cards beside the manuscript. Names should resolve live from IDs, with backlinks from the Bible to the relevant scenes. Inline mentions can follow after that foundation. This should be manual and predictable before automatic entity scanning; name matching alone cannot safely distinguish aliases or two characters with the same name.

The old scanner/context paths mix real records with sample Star Wars IDs and some project-1 assumptions. Recover the experience, not those lookup shortcuts.

## 5. Timeline after scene references

Antigravity's Chronos view is useful for seeing story order separately from event chronology. Build it over current Bible Events and explicit scene links, retaining free-form fictional dates. Do not create a competing event store. Decide date ordering and uncertainty explicitly rather than copying fractional positions into an integer field.

## Recommended order

1. Character development fields and searchable trait choices, with custom/unknown value preservation.
2. Optional gallery/density view and reusable field groups.
3. Scene cast/location/viewpoint links, context cards and backlinks.
4. Inline references and a chronological Event view.

These can be integrated incrementally. The current seven types, original recovered payloads, writing recovery, server revisions and relationship integrity remain the foundation. Antigravity's per-form metadata replacement, duplicate archive locations, base64 image storage and incomplete authentication should not be imported.
