# Notion world-bible import

The local `Gamble of the Void` project was imported on October 14, 2026. The Notion workspace and existing QQ projects remain unchanged. No storyboard, outline, chapters, scenes, or manuscript prose were imported.

## Coverage

| Type | Active | Archived source examples/templates |
| --- | ---: | ---: |
| Characters | 8 | 4 |
| Groups & races | 5 | 1 |
| Locations | 9 | 1 |
| World elements | 2 | 3 |
| Events | 0 | 1 |
| Details | 0 | 3 |
| Research | 2 | 0 |
| Total | 26 | 13 |

All 39 rows in the seven source databases have separate QQ entries. Two research records are retained without assuming they belong to the novel. Obvious templates, the Walter White example, and three Harry Potter example details are archived, not deleted. The 25 ID-based relationships include five parent/child links. Reciprocal Notion properties are combined into one relationship with backlinks. Generic associations are not guessed into home, membership, or governance claims.

Twelve source images are copied without alteration and protected by the existing project/account upload access checks. Template placeholder images remain in the original export. Forty-four character-builder/calendar references remain with their owner’s source payload; they do not become fictional characters or events.

## Field mapping and retention

- Names become titles. Source page IDs are the import identity, including duplicate template titles.
- Character age, eye/hair color, build (labeled height/weight), origin, abilities, traits, goals/needs, beliefs/values, and conflicts map to existing editable fields. Unknown facts, filled questionnaires, and authored narrative remain in editable notes and the preserved source panel. Missing gender/species/roles are not inferred.
- Group classification, short notes, and ranks map to category, tagline, and leadership fields. Locations retain types, notes, descriptions, and hierarchy. Spaceship, Cult, Culture, Gang, and Institution are supported catalog choices.
- World-element descriptions and research URLs map to their structured narrative/reference fields. Fictional dates remain text.
- Each entry’s `metadata._notionImport` preserves the complete Markdown, its checksum, original properties, CSV row(s), extracted notes, and supporting page copies. Ambiguous duplicate template CSV rows are retained together rather than assigned guessed edit dates.
- The untouched Markdown/CSV/asset ZIP is the definitive source copy. Template guidance is omitted only from the editable working copy; the complete original remains downloadable from **Imported from Notion · Original preserved**. Source HTML is displayed as text, never executed.
- Search uses current QQ fields and omits retained import envelopes, so generic template examples do not cause false matches across every character.

## Validation and rollback

`tests/postgres-world-bible-import.ts` restores an explicitly supplied backup into an isolated temporary PostgreSQL cluster. It compares every imported working field and retained original, validates relationships and image hashes, tests idempotent retries, forces an attachment-stage failure, and rehearses removing only the scratch import. All 14 original table fingerprints match after rollback.

`scripts/import-world-bible.ts` consumes a reviewed JSON plan, verifies the existing owner’s username, and creates a new project inside one transaction. Source-ID, checksum, shared field, relationship, and cycle validation run before commit. A creation receipt prevents duplicate imports. Asset files use exclusive creation and project-specific access metadata. Existing rows and writing revisions are never updated.

The private source archive, plan, source-to-QQ ID map, and fresh pre-import dumps are stored locally under `.local/notion-import/`; story content is excluded from Git. To remove the imported copy during normal use, archive the new project. For full recovery use the pre-import database backup and its import asset manifest; do not restore an older whole-database snapshot over later writing without reviewing those newer changes.

Validation: 362 tests across 33 suites, TypeScript, production build, and the disposable PostgreSQL import/rollback rehearsal pass. The existing build-size advisory remains.
