# Data contract rehearsal — October 11, 2026

Result: **47 originals → 47 staged records; all 828 audited field paths preserved.** Forty-three records have a proposed v2 document. Four remain retained payloads pending a destination decision. No source row was rewritten.

The dump was restored into a disposable local database. Staging was committed and read back, rolled back by removing only the staging table, and every original table was compared again. The disposable database was then removed. Backup contents were hash-checked before and after.

## Counts and rollback proof

| Original table | Before | After staging | After rollback | Values match |
| --- | ---: | ---: | ---: | --- |
| chapters | 7 | 7 | 7 | Yes |
| outline_items | 19 | 19 | 19 | Yes |
| plot_structure_sections | 86 | 86 | 86 | Yes |
| plot_structure_templates | 8 | 8 | 8 | Yes |
| plot_structures | 6 | 6 | 6 | Yes |
| projects | 2 | 2 | 2 | Yes |
| session | 883 | 883 | 883 | Yes |
| story_bible_entries | 47 | 47 | 47 | Yes |
| users | 2 | 2 | 2 | Yes |
| whiteboards | 10 | 10 | 10 | Yes |

Complete rows were hashed with stable JSON key ordering; prose strings, spaces and values were not normalized for this comparison. The separate stage readback also matched every original payload and proposed document.

## Decisions needed before activation

| Entry IDs | Legacy type | Review |
| --- | --- | --- |
| 4, 26 | lore | Choose Details or World Elements based on the content. |
| 25, 27 | timeline | Decide whether these are event records or timeline containers. |
| 52 | groups_races | Top-level category differs from the specialized category. Both are retained. |
| 58 | locations | Top-level category differs from the specialized location type. Both are retained. |

Every proposed type change is additionally flagged for review, including obvious aliases; none has been applied.

| Proposed destination | Records |
| --- | ---: |
| characters | 7 |
| locations | 9 |
| retained pending review | 4 |
| groups_races | 7 |
| events | 3 |
| world_elements | 15 |
| details | 1 |
| research | 1 |

## Recovered field destinations

Array indexes are grouped as `[]` below. The private machine-readable report contains the per-entry/per-leaf mapping and original/staged hashes. `legacy.original` retains the full original row, including a content string even when individual parsed JSON fields have usable destinations.

| Source type | Source field | Destination |
| --- | --- | --- |
| `character` | `category` | `document.classification.category` |
| `character` | `content` | `document.legacy.original.content` |
| `character` | `content` | `document.narrative.biography` |
| `character` | `contentJSON.notes` | `document.narrative.notes` |
| `character` | `createdAt` | `document.legacy.original.createdAt` |
| `character` | `entryType` | `document.legacy.original.entryType` |
| `character` | `id` | `document.legacy.original.id` |
| `character` | `isArchived` | `document.archived` |
| `character` | `metadata` | `document.legacy.original.metadata` |
| `character` | `priority` | `document.legacy.original.priority` |
| `character` | `projectId` | `document.legacy.original.projectId` |
| `character` | `relatedEntryIds` | `document.legacy.original.relatedEntryIds` |
| `character` | `subcategory` | `document.classification.subcategory` |
| `character` | `tags` | `document.legacy.original.tags` |
| `character` | `title` | `document.title` |
| `character` | `updatedAt` | `document.legacy.original.updatedAt` |
| `characters` | `category` | `document.classification.category` |
| `characters` | `content` | `document.legacy.original.content` |
| `characters` | `content` | `document.narrative.biography` |
| `characters` | `contentJSON.abilities.powers[]` | `document.legacy.original.content (JSON)` |
| `characters` | `contentJSON.age` | `document.fields.age` |
| `characters` | `contentJSON.appearance.build` | `document.legacy.original.content (JSON)` |
| `characters` | `contentJSON.appearance.clothingStyle` | `document.legacy.original.content (JSON)` |
| `characters` | `contentJSON.appearance.distinguishingFeatures` | `document.legacy.original.content (JSON)` |
| `characters` | `contentJSON.appearance.eyeColor` | `document.legacy.original.content (JSON)` |
| `characters` | `contentJSON.appearance.hairColor` | `document.legacy.original.content (JSON)` |
| `characters` | `contentJSON.appearance.height` | `document.legacy.original.content (JSON)` |
| `characters` | `contentJSON.gender` | `document.fields.gender` |
| `characters` | `contentJSON.notes` | `document.narrative.notes` |
| `characters` | `contentJSON.origin` | `document.fields.origin` |
| `characters` | `contentJSON.species` | `document.fields.species` |
| `characters` | `createdAt` | `document.legacy.original.createdAt` |
| `characters` | `entryType` | `document.legacy.original.entryType` |
| `characters` | `id` | `document.legacy.original.id` |
| `characters` | `isArchived` | `document.archived` |
| `characters` | `metadata` | `document.legacy.original.metadata` |
| `characters` | `metadata.affiliation[]` | `document.legacy.original.metadata.affiliation[]` |
| `characters` | `metadata.age` | `document.fields.age` |
| `characters` | `metadata.archetype[]` | `document.legacy.original.metadata.archetype[]` |
| `characters` | `metadata.build` | `document.fields.build` |
| `characters` | `metadata.clothingStyle` | `document.narrative.clothingStyle` |
| `characters` | `metadata.conflicts` | `document.narrative.conflicts` |
| `characters` | `metadata.distinguishingFeatures` | `document.narrative.distinguishingFeatures` |
| `characters` | `metadata.era` | `document.fields.era` |
| `characters` | `metadata.eyeColor` | `document.fields.eyeColor` |
| `characters` | `metadata.gender` | `document.fields.gender` |
| `characters` | `metadata.hairColor` | `document.fields.hairColor` |
| `characters` | `metadata.imageDescription` | `document.fields.imageDescription` |
| `characters` | `metadata.imageUrl` | `document.fields.imageUrl` |
| `characters` | `metadata.importance` | `document.fields.importance` |
| `characters` | `metadata.motivations` | `document.narrative.motivations` |
| `characters` | `metadata.origin` | `document.fields.origin` |
| `characters` | `metadata.personalityTraits` | `document.narrative.personalityTraits` |
| `characters` | `metadata.primaryRole` | `document.fields.primaryRole` |
| `characters` | `metadata.species` | `document.fields.species` |
| `characters` | `metadata.status` | `document.classification.status` |
| `characters` | `priority` | `document.legacy.original.priority` |
| `characters` | `projectId` | `document.legacy.original.projectId` |
| `characters` | `relatedEntryIds` | `document.legacy.original.relatedEntryIds` |
| `characters` | `subcategory` | `document.classification.subcategory` |
| `characters` | `tags` | `document.legacy.original.tags` |
| `characters` | `tags[]` | `document.tags[]` |
| `characters` | `title` | `document.title` |
| `characters` | `updatedAt` | `document.legacy.original.updatedAt` |
| `details` | `category` | `document.classification.category` |
| `details` | `content` | `document.legacy.original.content` |
| `details` | `contentJSON.content` | `document.narrative.content` |
| `details` | `contentJSON.isArchived` | `document.legacy.original.content (JSON)` |
| `details` | `contentJSON.linkedElements[].id` | `document.fields.linkedElements[].id` |
| `details` | `contentJSON.linkedElements[].name` | `document.fields.linkedElements[].name` |
| `details` | `contentJSON.linkedElements[].type` | `document.fields.linkedElements[].type` |
| `details` | `contentJSON.shortSummary` | `document.narrative.shortSummary` |
| `details` | `contentJSON.status` | `document.classification.status` |
| `details` | `contentJSON.tags` | `document.legacy.original.content (JSON)` |
| `details` | `contentJSON.type` | `document.classification.type` |
| `details` | `contentJSON.visibility` | `document.classification.visibility` |
| `details` | `createdAt` | `document.legacy.original.createdAt` |
| `details` | `entryType` | `document.legacy.original.entryType` |
| `details` | `id` | `document.legacy.original.id` |
| `details` | `isArchived` | `document.archived` |
| `details` | `metadata` | `document.legacy.original.metadata` |
| `details` | `priority` | `document.legacy.original.priority` |
| `details` | `projectId` | `document.legacy.original.projectId` |
| `details` | `relatedEntryIds` | `document.legacy.original.relatedEntryIds` |
| `details` | `subcategory` | `document.classification.subcategory` |
| `details` | `tags` | `document.legacy.original.tags` |
| `details` | `title` | `document.title` |
| `details` | `updatedAt` | `document.legacy.original.updatedAt` |
| `event` | `category` | `document.classification.category` |
| `event` | `content` | `document.legacy.original.content` |
| `event` | `contentJSON.charactersInvolved` | `document.fields.charactersInvolved` |
| `event` | `contentJSON.date.isApproximate` | `document.fields.date.isApproximate` |
| `event` | `contentJSON.date.year` | `document.fields.date.year` |
| `event` | `contentJSON.groupsFactions` | `document.fields.groupsRacesInvolved` |
| `event` | `contentJSON.includeOnTimeline` | `document.fields.includeOnTimeline` |
| `event` | `contentJSON.locations` | `document.fields.locations` |
| `event` | `contentJSON.narrativeContext` | `document.narrative.narrativeContext` |
| `event` | `contentJSON.tags` | `document.legacy.original.content (JSON)` |
| `event` | `contentJSON.worldElements` | `document.fields.worldElements` |
| `event` | `createdAt` | `document.legacy.original.createdAt` |
| `event` | `entryType` | `document.legacy.original.entryType` |
| `event` | `id` | `document.legacy.original.id` |
| `event` | `isArchived` | `document.archived` |
| `event` | `metadata` | `document.legacy.original.metadata` |
| `event` | `priority` | `document.legacy.original.priority` |
| `event` | `projectId` | `document.legacy.original.projectId` |
| `event` | `relatedEntryIds` | `document.legacy.original.relatedEntryIds` |
| `event` | `subcategory` | `document.classification.subcategory` |
| `event` | `tags` | `document.legacy.original.tags` |
| `event` | `title` | `document.title` |
| `event` | `updatedAt` | `document.legacy.original.updatedAt` |
| `events` | `category` | `document.classification.category` |
| `events` | `content` | `document.legacy.original.content` |
| `events` | `contentJSON.charactersInvolved` | `document.fields.charactersInvolved` |
| `events` | `contentJSON.date.isApproximate` | `document.fields.date.isApproximate` |
| `events` | `contentJSON.date.year` | `document.fields.date.year` |
| `events` | `contentJSON.eventType` | `document.classification.type` |
| `events` | `contentJSON.groupsRacesInvolved` | `document.fields.groupsRacesInvolved` |
| `events` | `contentJSON.includeOnTimeline` | `document.fields.includeOnTimeline` |
| `events` | `contentJSON.locations[].context` | `document.fields.locations[].context` |
| `events` | `contentJSON.locations[].id` | `document.fields.locations[].id` |
| `events` | `contentJSON.locations[].name` | `document.fields.locations[].name` |
| `events` | `contentJSON.narrativeContext` | `document.narrative.narrativeContext` |
| `events` | `contentJSON.shortSummary` | `document.narrative.shortSummary` |
| `events` | `contentJSON.status` | `document.classification.status` |
| `events` | `contentJSON.tags` | `document.legacy.original.content (JSON)` |
| `events` | `contentJSON.worldElements` | `document.fields.worldElements` |
| `events` | `createdAt` | `document.legacy.original.createdAt` |
| `events` | `entryType` | `document.legacy.original.entryType` |
| `events` | `id` | `document.legacy.original.id` |
| `events` | `isArchived` | `document.archived` |
| `events` | `metadata` | `document.legacy.original.metadata` |
| `events` | `priority` | `document.legacy.original.priority` |
| `events` | `projectId` | `document.legacy.original.projectId` |
| `events` | `relatedEntryIds` | `document.legacy.original.relatedEntryIds` |
| `events` | `subcategory` | `document.classification.subcategory` |
| `events` | `tags` | `document.legacy.original.tags` |
| `events` | `title` | `document.title` |
| `events` | `updatedAt` | `document.legacy.original.updatedAt` |
| `government` | `category` | `document.legacy.original.category` |
| `government` | `content` | `document.narrative.history` |
| `government` | `createdAt` | `document.legacy.original.createdAt` |
| `government` | `entryType` | `document.legacy.original.entryType` |
| `government` | `id` | `document.legacy.original.id` |
| `government` | `isArchived` | `document.archived` |
| `government` | `metadata` | `document.legacy.original.metadata` |
| `government` | `priority` | `document.legacy.original.priority` |
| `government` | `projectId` | `document.legacy.original.projectId` |
| `government` | `relatedEntryIds` | `document.legacy.original.relatedEntryIds` |
| `government` | `subcategory` | `document.classification.subcategory` |
| `government` | `tags` | `document.legacy.original.tags` |
| `government` | `title` | `document.title` |
| `government` | `updatedAt` | `document.legacy.original.updatedAt` |
| `group` | `category` | `document.classification.category` |
| `group` | `content` | `document.narrative.history` |
| `group` | `createdAt` | `document.legacy.original.createdAt` |
| `group` | `entryType` | `document.legacy.original.entryType` |
| `group` | `id` | `document.legacy.original.id` |
| `group` | `isArchived` | `document.archived` |
| `group` | `metadata` | `document.legacy.original.metadata` |
| `group` | `priority` | `document.legacy.original.priority` |
| `group` | `projectId` | `document.legacy.original.projectId` |
| `group` | `relatedEntryIds` | `document.legacy.original.relatedEntryIds` |
| `group` | `subcategory` | `document.classification.subcategory` |
| `group` | `tags` | `document.legacy.original.tags` |
| `group` | `title` | `document.title` |
| `group` | `updatedAt` | `document.legacy.original.updatedAt` |
| `groups_races` | `category` | `document.legacy.original.category` |
| `groups_races` | `content` | `document.narrative.history` |
| `groups_races` | `createdAt` | `document.legacy.original.createdAt` |
| `groups_races` | `entryType` | `document.legacy.original.entryType` |
| `groups_races` | `id` | `document.legacy.original.id` |
| `groups_races` | `isArchived` | `document.archived` |
| `groups_races` | `metadata.foundingDate` | `document.fields.eraEstablished` |
| `groups_races` | `metadata.groupCategory` | `document.classification.category` |
| `groups_races` | `metadata.imageDescription` | `document.fields.imageDescription` |
| `groups_races` | `metadata.imageUrl` | `document.fields.imageUrl` |
| `groups_races` | `metadata.tagline` | `document.narrative.tagline` |
| `groups_races` | `priority` | `document.legacy.original.priority` |
| `groups_races` | `projectId` | `document.legacy.original.projectId` |
| `groups_races` | `relatedEntryIds[]` | `document.relatedEntryIds[]` |
| `groups_races` | `subcategory` | `document.classification.subcategory` |
| `groups_races` | `tags` | `document.legacy.original.tags` |
| `groups_races` | `title` | `document.title` |
| `groups_races` | `updatedAt` | `document.legacy.original.updatedAt` |
| `location` | `category` | `document.classification.category` |
| `location` | `category` | `document.legacy.original.category` |
| `location` | `content` | `document.legacy.original.content` |
| `location` | `content` | `document.narrative.description` |
| `location` | `contentJSON.events` | `document.legacy.original.content (JSON)` |
| `location` | `contentJSON.linkedCharacters` | `document.legacy.original.content (JSON)` |
| `location` | `contentJSON.locationType` | `document.classification.category` |
| `location` | `contentJSON.research[].notesTaken` | `document.legacy.original.content (JSON)` |
| `location` | `contentJSON.research[].title` | `document.legacy.original.content (JSON)` |
| `location` | `contentJSON.research[].type` | `document.legacy.original.content (JSON)` |
| `location` | `contentJSON.research[].url` | `document.legacy.original.content (JSON)` |
| `location` | `createdAt` | `document.legacy.original.createdAt` |
| `location` | `entryType` | `document.legacy.original.entryType` |
| `location` | `id` | `document.legacy.original.id` |
| `location` | `isArchived` | `document.archived` |
| `location` | `metadata` | `document.legacy.original.metadata` |
| `location` | `priority` | `document.legacy.original.priority` |
| `location` | `projectId` | `document.legacy.original.projectId` |
| `location` | `relatedEntryIds` | `document.legacy.original.relatedEntryIds` |
| `location` | `subcategory` | `document.classification.subcategory` |
| `location` | `tags` | `document.legacy.original.tags` |
| `location` | `title` | `document.title` |
| `location` | `updatedAt` | `document.legacy.original.updatedAt` |
| `locations` | `category` | `document.classification.category` |
| `locations` | `category` | `document.legacy.original.category` |
| `locations` | `content` | `document.narrative.description` |
| `locations` | `createdAt` | `document.legacy.original.createdAt` |
| `locations` | `entryType` | `document.legacy.original.entryType` |
| `locations` | `id` | `document.legacy.original.id` |
| `locations` | `isArchived` | `document.archived` |
| `locations` | `metadata` | `document.legacy.original.metadata` |
| `locations` | `metadata.atmosphere` | `document.fields.atmosphere` |
| `locations` | `metadata.coordinates` | `document.fields.coordinates` |
| `locations` | `metadata.environment` | `document.fields.environment` |
| `locations` | `metadata.gravity` | `document.fields.gravity` |
| `locations` | `metadata.locationType` | `document.classification.category` |
| `locations` | `metadata.parentLocation` | `document.fields.parentLocation` |
| `locations` | `metadata.size` | `document.fields.size` |
| `locations` | `metadata.tagline` | `document.narrative.tagline` |
| `locations` | `priority` | `document.legacy.original.priority` |
| `locations` | `projectId` | `document.legacy.original.projectId` |
| `locations` | `relatedEntryIds` | `document.legacy.original.relatedEntryIds` |
| `locations` | `relatedEntryIds` | `document.relatedEntryIds` |
| `locations` | `subcategory` | `document.classification.subcategory` |
| `locations` | `tags` | `document.legacy.original.tags` |
| `locations` | `title` | `document.title` |
| `locations` | `updatedAt` | `document.legacy.original.updatedAt` |
| `lore` | `category` | `original.category` |
| `lore` | `content` | `original.content` |
| `lore` | `createdAt` | `original.createdAt` |
| `lore` | `entryType` | `original.entryType` |
| `lore` | `id` | `original.id` |
| `lore` | `isArchived` | `original.isArchived` |
| `lore` | `metadata` | `original.metadata` |
| `lore` | `priority` | `original.priority` |
| `lore` | `projectId` | `original.projectId` |
| `lore` | `relatedEntryIds` | `original.relatedEntryIds` |
| `lore` | `subcategory` | `original.subcategory` |
| `lore` | `tags` | `original.tags` |
| `lore` | `title` | `original.title` |
| `lore` | `updatedAt` | `original.updatedAt` |
| `magicSystem` | `category` | `document.legacy.original.category` |
| `magicSystem` | `content` | `document.narrative.description` |
| `magicSystem` | `createdAt` | `document.legacy.original.createdAt` |
| `magicSystem` | `entryType` | `document.legacy.original.entryType` |
| `magicSystem` | `id` | `document.legacy.original.id` |
| `magicSystem` | `isArchived` | `document.archived` |
| `magicSystem` | `metadata` | `document.legacy.original.metadata` |
| `magicSystem` | `priority` | `document.legacy.original.priority` |
| `magicSystem` | `projectId` | `document.legacy.original.projectId` |
| `magicSystem` | `relatedEntryIds` | `document.legacy.original.relatedEntryIds` |
| `magicSystem` | `subcategory` | `document.classification.subcategory` |
| `magicSystem` | `tags` | `document.legacy.original.tags` |
| `magicSystem` | `title` | `document.title` |
| `magicSystem` | `updatedAt` | `document.legacy.original.updatedAt` |
| `race` | `category` | `document.legacy.original.category` |
| `race` | `content` | `document.narrative.history` |
| `race` | `createdAt` | `document.legacy.original.createdAt` |
| `race` | `entryType` | `document.legacy.original.entryType` |
| `race` | `id` | `document.legacy.original.id` |
| `race` | `isArchived` | `document.archived` |
| `race` | `metadata` | `document.legacy.original.metadata` |
| `race` | `priority` | `document.legacy.original.priority` |
| `race` | `projectId` | `document.legacy.original.projectId` |
| `race` | `relatedEntryIds` | `document.legacy.original.relatedEntryIds` |
| `race` | `subcategory` | `document.classification.subcategory` |
| `race` | `tags` | `document.legacy.original.tags` |
| `race` | `title` | `document.title` |
| `race` | `updatedAt` | `document.legacy.original.updatedAt` |
| `research` | `category` | `document.classification.category` |
| `research` | `content` | `document.legacy.original.content` |
| `research` | `contentJSON.detailedNotes` | `document.narrative.detailedNotes` |
| `research` | `contentJSON.isArchived` | `document.legacy.original.content (JSON)` |
| `research` | `contentJSON.linkedElements` | `document.fields.linkedElements` |
| `research` | `contentJSON.shortSummary` | `document.narrative.shortSummary` |
| `research` | `contentJSON.sourceType` | `document.classification.type` |
| `research` | `contentJSON.status` | `document.classification.status` |
| `research` | `contentJSON.tags` | `document.legacy.original.content (JSON)` |
| `research` | `contentJSON.topics` | `document.fields.topics` |
| `research` | `contentJSON.urlOrReference` | `document.fields.urlOrReference` |
| `research` | `createdAt` | `document.legacy.original.createdAt` |
| `research` | `entryType` | `document.legacy.original.entryType` |
| `research` | `id` | `document.legacy.original.id` |
| `research` | `isArchived` | `document.archived` |
| `research` | `metadata` | `document.legacy.original.metadata` |
| `research` | `priority` | `document.legacy.original.priority` |
| `research` | `projectId` | `document.legacy.original.projectId` |
| `research` | `relatedEntryIds` | `document.legacy.original.relatedEntryIds` |
| `research` | `subcategory` | `document.classification.subcategory` |
| `research` | `tags` | `document.legacy.original.tags` |
| `research` | `title` | `document.title` |
| `research` | `updatedAt` | `document.legacy.original.updatedAt` |
| `timeline` | `category` | `original.category` |
| `timeline` | `content` | `original.content` |
| `timeline` | `createdAt` | `original.createdAt` |
| `timeline` | `entryType` | `original.entryType` |
| `timeline` | `id` | `original.id` |
| `timeline` | `isArchived` | `original.isArchived` |
| `timeline` | `metadata` | `original.metadata` |
| `timeline` | `priority` | `original.priority` |
| `timeline` | `projectId` | `original.projectId` |
| `timeline` | `relatedEntryIds` | `original.relatedEntryIds` |
| `timeline` | `subcategory` | `original.subcategory` |
| `timeline` | `tags` | `original.tags` |
| `timeline` | `title` | `original.title` |
| `timeline` | `updatedAt` | `original.updatedAt` |
| `world-element` | `category` | `document.classification.category` |
| `world-element` | `category` | `document.legacy.original.category` |
| `world-element` | `content` | `document.legacy.original.content` |
| `world-element` | `content` | `document.narrative.description` |
| `world-element` | `contentJSON.category` | `document.classification.category` |
| `world-element` | `contentJSON.categorySpecific` | `document.fields.categoryDetails` |
| `world-element` | `contentJSON.details` | `document.legacy.original.content (JSON)` |
| `world-element` | `contentJSON.events` | `document.legacy.original.content (JSON)` |
| `world-element` | `contentJSON.groupsRaces` | `document.legacy.original.content (JSON)` |
| `world-element` | `contentJSON.linkedCharacters` | `document.fields.linkedCharacters` |
| `world-element` | `contentJSON.locations` | `document.legacy.original.content (JSON)` |
| `world-element` | `contentJSON.research` | `document.legacy.original.content (JSON)` |
| `world-element` | `createdAt` | `document.legacy.original.createdAt` |
| `world-element` | `entryType` | `document.legacy.original.entryType` |
| `world-element` | `id` | `document.legacy.original.id` |
| `world-element` | `isArchived` | `document.archived` |
| `world-element` | `metadata` | `document.legacy.original.metadata` |
| `world-element` | `priority` | `document.legacy.original.priority` |
| `world-element` | `projectId` | `document.legacy.original.projectId` |
| `world-element` | `relatedEntryIds` | `document.legacy.original.relatedEntryIds` |
| `world-element` | `subcategory` | `document.classification.subcategory` |
| `world-element` | `tags` | `document.legacy.original.tags` |
| `world-element` | `title` | `document.title` |
| `world-element` | `updatedAt` | `document.legacy.original.updatedAt` |
| `world_elements` | `category` | `document.legacy.original.category` |
| `world_elements` | `content` | `document.legacy.original.content` |
| `world_elements` | `contentJSON.affectedLocations` | `document.fields.affectedLocations` |
| `world_elements` | `contentJSON.category` | `document.classification.category` |
| `world_elements` | `contentJSON.categoryDetails` | `document.fields.categoryDetails` |
| `world_elements` | `contentJSON.categoryDetails.rarity` | `document.fields.categoryDetails.rarity` |
| `world_elements` | `contentJSON.childElements` | `document.fields.childElements` |
| `world_elements` | `contentJSON.isArchived` | `document.legacy.original.content (JSON)` |
| `world_elements` | `contentJSON.linkedCharacters` | `document.fields.linkedCharacters` |
| `world_elements` | `contentJSON.linkedEvents` | `document.fields.linkedEvents` |
| `world_elements` | `contentJSON.linkedLocations` | `document.fields.linkedLocations` |
| `world_elements` | `contentJSON.majorEvents` | `document.fields.majorEvents` |
| `world_elements` | `contentJSON.researchReferences` | `document.fields.researchReferences` |
| `world_elements` | `contentJSON.shortNotes` | `document.narrative.shortNotes` |
| `world_elements` | `contentJSON.status` | `document.classification.status` |
| `world_elements` | `contentJSON.tags` | `document.legacy.original.content (JSON)` |
| `world_elements` | `contentJSON.users` | `document.fields.users` |
| `world_elements` | `createdAt` | `document.legacy.original.createdAt` |
| `world_elements` | `entryType` | `document.legacy.original.entryType` |
| `world_elements` | `id` | `document.legacy.original.id` |
| `world_elements` | `isArchived` | `document.archived` |
| `world_elements` | `metadata` | `document.legacy.original.metadata` |
| `world_elements` | `priority` | `document.legacy.original.priority` |
| `world_elements` | `projectId` | `document.legacy.original.projectId` |
| `world_elements` | `relatedEntryIds` | `document.legacy.original.relatedEntryIds` |
| `world_elements` | `subcategory` | `document.classification.subcategory` |
| `world_elements` | `tags` | `document.legacy.original.tags` |
| `world_elements` | `title` | `document.title` |
| `world_elements` | `updatedAt` | `document.legacy.original.updatedAt` |

Reproduce with [the rehearsal script](../scripts/rehearse-bible-contract.ts). Format and precedence decisions are documented in [DATA_CONTRACT.md](DATA_CONTRACT.md). No production migration or conversion has been authorized by this rehearsal.
