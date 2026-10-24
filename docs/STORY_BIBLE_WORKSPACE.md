# Story Bible workspace

The Story Bible uses the approved Workspace direction: a searchable library of actual entries, with a focused detail pane. It replaces the oversized category tiles and duplicate recent-activity lists.

- Library: all seven types, category and archive filters, starred entries, alphabetical/recent sorting, image thumbnails, and short previews. Filters remain in place when opening or returning from an entry.
- Overview: readable story notes, an image, relevant facts, tags, and live ID-based connections.
- Develop: every existing type-specific field, image upload, classification, archive/delete controls, and conversion preview. Short guidance explains each type's purpose. Starring lives in the workspace header.
- Connections: shared relationship picker and editing, backlinks, scene uses, and inline writing mentions.
- Source: imported Notion notes, character-building references, the complete original page, and download/original-page links. Appears only for imported entries.

Desktop keeps a compact library alongside the entry. Narrow screens use one pane with an explicit Library button. Scroll surfaces are bounded by the viewport, and autosave status reserves a fixed amount of space.

QQ-14 adds shared optional guidance, examples, stable field-group disclosures, type explanations and suggested starting points in the existing connection picker. See [guided Story Bible](GUIDED_STORY_BIBLE.md) for feature-branch scope and current validation. The original validation snapshot below predates QQ-14.

## Writing protections

Tab changes keep the same editors mounted; they do not discard local fields, recreate editors, or write data. Entry navigation and creation pass through the existing pending-save/recovery guard. Existing account/project draft journals, revision checks, upload access, relationship validation, and original import payloads are unchanged. Archive remains with the specialized editing form to avoid two independently mounted copies of structured archive state.

## Validation

- Full suite: 367 tests pass across 34 suites.
- Added mounted-editor coverage for tab switching, conflicted drafts, source retention, starring, all-type filtering, and library navigation.
- Existing full field suite, writing protections, relationships, and manuscript tests remain green.
- TypeScript and production build pass (existing bundle-size advisory remains).
- Browser walkthrough uses the isolated synthetic server before read-only review of the imported project. No story data migration is required.
