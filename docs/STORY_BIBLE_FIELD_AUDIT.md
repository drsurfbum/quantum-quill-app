# Story Bible field audit

> October 11 follow-up: [shared relationships](SHARED_RELATIONSHIPS.md) now provide typed links, searchable pickers, stubs, backlinks, revision checks and archive/delete behavior. Original payloads remain intact; the content migration review gate is unchanged.

> Follow-up: [durable draft recovery and schema/relationship integrity](DRAFT_RECOVERY_AND_DATA_INTEGRITY.md) is implemented and verified locally. That report supersedes the memory-only/conflict and unchecked-relationship limitations below; migration and unfinished feature work remain.

October 11, 2026. Local working changes only. Read alongside [the restart audit](RESTART_AUDIT.md), [autosave audit](AUTOSAVE_AUDIT.md), and [development roadmap](STORY_BIBLE_ROADMAP.md).

## State of the recovered work

The June 20–26, 2025 expansion is present. The active Story Bible page dispatches to seven specialized editors, with a generic taxonomy editor as fallback. The recovery audit recorded 47 Story Bible records. The late work was not lost, but the historical “Story Bible Complete” description overstated completion. Several large sections exist as interfaces, unused state or placeholder prose rather than working forms.

The existing controls now have field-level persistence coverage. This is not a claim that all original specifications are implemented, that every imported record conforms to a schema, or that production deployment is ready.

## Repairs in this pass

- Connected Groups & Races internal notes and Locations development notes to `metadata.notes`; neither textarea previously saved anything.
- Connected the generic editor's archive and priority checkboxes to saving.
- Made parent-group selection controlled, restored its saved selection, and added clearing. Corrected the new parent-location flow to use the actual creation response (`result.data.id`).
- Made tags editable in Characters, Groups & Races and Locations. Structured editors now synchronize tags/archive changes with the corresponding top-level fields. Existing structured values are still read without a bulk migration.
- Fixed generic linked fields targeting `any`, which previously returned no entries; excluded the current entry from their choices.
- Stopped splitting linked entry names on `|`. Details and Research now select by ID and preserve full names.
- Changed event location addition to select a real entry instead of saving an ID-zero placeholder. Fictional-only dates now appear in Date Summary.
- Removed the delayed image callback; descriptions are controlled by the editor, removed captions do not reappear, and leaving an editor cancels its unfinished upload. A late response cannot change another editor. A file upload must finish before leaving to become associated with the entry.
- Repaired dashboard type filtering, metadata search, type display names, archive access and category browsing. Expanded browsing no longer silently stops after eight records. Removed an inert category-menu button; category administration remains planned.
- **Browser-discovered root cause:** notifications rerendered auth context, and the protected route supplied a new inline component each time. That remounted the page and closed a just-created editor. The route now preserves page identity. A focused test failed before this change and passed after it. The actual browser then stayed in the editor through creation notifications.

## Existing field inventory and verification

All rows below are exercised by `tests/story-bible-fields.test.ts` with real React/Radix controls, signed-session HTTP routes and fresh in-memory records. Text is written, independently read back from the API, remounted from that response, then cleared and read back again. Collections are added, deduplicated where supported, reopened and removed. Booleans are checked both ways. Dropdowns have selected-value/readback coverage; this does not mean every possible combination of dropdown choices was exhaustively tested.

| Editor | Persisted controls covered | Storage |
| --- | --- | --- |
| Common to all seven and fallback | Title; autosave status/flush path; generic related entries where exposed | Top-level fields; shared save queue |
| Characters | Age, gender, species, origin, primary role; category; eye/hair color, build, clothing, distinguishing features; personality, beliefs, motivations, conflicts; abilities; backstory; tags; related entries; priority/archive; image URL/caption/removal/upload | Structured values in metadata; content/category/tags/links/status at top level |
| Groups & Races | Category/type, status, tagline, category tag; parent group, child-group names, founding/dissolution eras; leadership structure, member links; species homeworld/physiology or organization purpose/ideology/resources; culture; history; alliances/rivalries; internal notes; home-location links; tags, priority/archive, image controls | Metadata plus top-level content/classification/links/status |
| Locations | Type, status, parent including create-new and clear; tagline/category; environment/coordinates; planetary size/gravity/atmosphere; structure capacity/layout; purpose/features; founding/status changes/history; controlling-group and character links; nearby locations, world-element names; development notes; tags, priority/archive, image controls | Metadata plus top-level content/classification/links/status |
| Events | Year/month/day/fictional date, approximation, era; summary/type; locations; narrative; writer notes, hidden details, alternatives, research reminders; status; tags; timeline inclusion; image controls | JSON content; tags mirrored at top level |
| World Elements | Category/status/summary; origin; lore hooks, idioms, rumors, niche facts; tags/archive; image URL/caption/removal | JSON content; tags/archive mirrored at top level. This editor currently has URL input, not file upload |
| Details | Title generation; character/location/event/world links; type/status/summary; content; usage explanation, visibility label, outcome notes; tags/archive; image controls | JSON content, with top-level tags/archive synchronization |
| Research | Source type/status/reference/summary; predefined/custom topics, tags; character/location/world links; detailed notes, next steps, incorporation plans, team notes; archive/image controls | JSON content, with top-level tags/archive synchronization |
| Generic fallback | Title/content/type/category/subcategory, suggested categories, tags, related IDs, priority/archive; every declared taxonomy field and category branch | Top-level classification/content/status plus metadata |

Specialized World Element detail coverage explicitly includes all 16 choices:

- Flora: habitat, growth behavior, uses, threats.
- Fauna: diet, behavior, lifecycle, domestication.
- Technology: inventor, power source, function, limitations.
- Religion/Ritual and Mythology: beliefs, ceremonies, origin stories.
- Magic System, Language, Currency, Art/Culture, Transportation, Weapon/Tool, Material/Resource, Food/Drink, Medicine, Architecture and Other: properties, appearance, rarity, significance.

The generic taxonomy suite iterates **all seven declarations and every declared category-specific branch**, exercising text, textarea, single-select, multi-select, checkbox, single-linked and multi-linked controls. It checks set/reopen/clear and preservation of an unrendered legacy metadata field. Those declarations differ from the specialized forms; see the roadmap before extending them.

Additional verification:

- Real API upload association and authenticated image readback for all six editors exposing file upload, using disposable PNGs outside the recovered uploads directory.
- Shared upload success, invalid type, over-size, server failure and late-response-after-unmount checks in `tests/story-bible-upload.test.ts`.
- Header star/archive controls; parent restore/clear; new parent creation; date summary; title generation; category/type/archive/search/browse integration including more than eight records.
- `tests/protected-route-state.test.ts` guards page identity across auth-context rerenders. Router integration is also checked in the production browser fixture.
- Existing autosave tests cover batching, continuous typing, slow requests, navigation, focus loss, failures/retry, cache races and account boundaries.

## Verification result

**178 tests pass across ten suites**, including 122 checks added in this pass. TypeScript, production build and `git diff --check` pass. The build retains its existing large-client-chunk warning. The final test process exits cleanly; isolated query caches use explicit teardown.

## Browser evidence and limits

The production build was exercised on the isolated loopback fixture with one-second artificial save latency. A fresh group was created through the dashboard, notes/tags/title were edited, the editor was left during saving, and the page was reloaded. Reopening showed the saved notes and tag. This browser sequence also reproduced and verified the notification/remount repair. A later attempt to refresh the final build and capture a screenshot was blocked by the automatic approval service after its connection failed; no screenshot is claimed. The final small changes (tag-control placement and legacy search/image URL normalization) are covered by the final passing test suite and build.

The tests use synthetic MemStorage, not PostgreSQL or the recovered 47 records. Original databases, uploads, backups and Replit were not changed. No migration, commit, push or deployment was performed. The regular local app has not been restarted onto these changes.

Remaining reliability boundaries: pending text is still memory-only; force-closing/crashing can lose an unacknowledged draft. Cross-tab/device revision conflicts, validation of legacy JSON shapes, ownership metadata for historical uploads, mobile suspension and IME/platform coverage remain future work. No round of automated checks proves absence of all bugs.
