# Plot structure guides

Draft feature; not merged or deployed. Base: `codex/writing-first-layout` at `301d05c77e64f3045e9918f891e938ceca0f83a7`, the verified release-source head. Main remains `883942b`. Existing checkouts and unfinished Story Bible work were left untouched.

## Placement and behavior

Storyboard → New Structure (also Create Your First Structure) is the existing selection point for all eight defaults in `server/data/plot-templates.ts`, served by `/api/plot-templates`. The project setup wizard already directs planning writers here. Each card has best-fit guidance, a prominent Watch video button, teacher/channel attribution, approximate duration, and relevant qualifications. No project/wizard persistence, template sections, API, database, or dependency changes.

Guides use stable `templateType` values, independent of database IDs and renamed titles. An unfamiliar/custom template explicitly says there is no verified guide and remains selectable. Tests compare guide keys against the actual shipped catalog.

Native labeled radios provide keyboard controls; card clicks, Use This Template, Apply Template, and Cancel retain their existing behavior. Watch video opens a nested, labeled dialog without selecting or applying the card. The player mounts only while that dialog is open; closing removes it and returns focus to the trigger. There is no autoplay or playback requirement. The dialog always offers a canonical Watch on YouTube fallback in a new tab with `noopener noreferrer`, including when embedding is blocked.

Embeds use YouTube's [privacy-enhanced host](https://support.google.com/youtube/answer/171780?hl=en) (`www.youtube-nocookie.com`). No player or thumbnail loads before a request. Once opened, the player contacts YouTube; this is not a claim of zero third-party data collection. Production CSP permits only that added frame origin. The iframe sends an origin-only cross-origin referrer using `strict-origin-when-cross-origin`, as recommended for embedded playback, while the app's default referrer policy stays unchanged. No YouTube API script or dependency is added.

## Editorial choices and provenance

Austin's preferred channel was verified as **StudioBinder**. Expertise and framework fit take precedence over channel uniformity. These are editorial recommendations, not endorsements by the speakers. Titles, channels, descriptions/chapter lists, and availability were checked directly with YouTube on November 14, 2026. This is not a claim of end-to-end viewing.

| QQ choice | Video / teacher | Rationale and qualifications |
| --- | --- | --- |
| Freytag's Pyramid | [Plotting a Novel with Freytag's Pyramid](https://www.youtube.com/watch?v=Xi-gjqz-4eA), Reedsy, 7 min | Credible publishing/writing educator, with concise novel-focused instruction and a why-use-it section. Teaches the original tragic arc; QQ's resolution is broader. That distinction is explicit on the card. [Publisher companion guide](https://reedsy.com/blog/guide/story-structure/freytags-pyramid/). |
| The Hero's Journey | [12 Stages Of The Hero's Journey - Christopher Vogler](https://www.youtube.com/watch?v=oNNaMuBOxv4), Film Courage, 23 min | Vogler himself, author of The Writer's Journey and working story consultant, teaches the 12-stage adaptation used by QQ, rather than Campbell's broader 17-stage model. Chapters run from Ordinary World to Return With Elixir. |
| Three Act Structure | [Three Act Structure Explained — The Secret to Telling a Great Story](https://www.youtube.com/watch?v=tvqjp1CxxD8), K.M. Weiland / StudioBinder, 27 min | Established novelist/craft author explains setup, turning points, midpoint, and climax through Jurassic Park. Strong expert teaching within Austin's preferred channel. |
| Dan Harmon's Story Circle | [Dan Harmon Story Circle: 8 Proven Steps to Better Stories](https://www.youtube.com/watch?v=-XGUVkOmPTA), StudioBinder, 9 min | Austin's exact requested reference. Verified eight-step Dark Knight explanation matches You/Need/Go/Search/Find/Take/Return/Change. Narrated by Brian L. Tan; not represented as Harmon speaking. |
| Fichtean Curve | [How to Structure a Book with the Fichtean Curve](https://www.youtube.com/watch?v=EyO6E1ggR2o), Reedsy, 8 min | Clear novel-focused education with chapters for escalating crises, climax, falling action, and why to use this structure. [Publisher companion guide](https://reedsy.com/blog/guide/story-structure/fichtean-curve/). |
| Save the Cat Beat Sheet | [How to Write a Novel in 15 Steps with the Save the Cat! Beat Sheet](https://www.youtube.com/watch?v=k8EfEEjbwGk), Jessica Brody, 11 min | The author of Save the Cat! Writes a Novel teaches the method on her own channel. Directly relevant to QQ's 15 beats and novel audience. |
| Seven-Point Story Structure | [Dan Wells on Story Structure](https://www.youtube.com/watch?v=iCfd8K5PAnc), Dan Wells / NarraVerso com Felipe Rocha, 46 min | Wells teaches all seven points, ending-first planning, genre examples, and subplots. Explicitly credited compilation of the [original five-part 2010 recording](https://www.youtube.com/watch?v=KcmiqQ9NpPE), not Wells's own upload. Part 1 alone stops before explaining every point. Older audio/music at joins is disclosed on the card. |
| Freeform Structure | [Planners & Pantsers (Gardener & Architect)](https://www.youtube.com/watch?v=2EwI90ZOGRk), Brandon Sanderson, 8 min | Direct excerpt from his BYU creative-writing lectures on his own channel. A related writing-process lesson for weighing discovery writing against outlining. Freeform has no fixed beats; this is explicitly not a QQ walkthrough or named Freeform framework. |

## Verification

[Video receipt](verification/plot-structure-videos.json): all eight selected URLs returned HTTP 200 from YouTube oEmbed and watch pages, matching titles/channels, and player status `OK`. Availability can vary by region or change later. No media was downloaded. Links use canonical watch URLs without tracking parameters.

The original direct-link revision passed exact-commit CI (408 tests / 41 suites) and a real-browser project → structure → Blueprint → outline → writing walkthrough. Its dark-theme contrast defect was repaired in local commit `b2d6ae9`.

Embedded-viewer regression checks cover all eight destinations, no iframe before opening, iframe removal on close, no autoplay permission, safe fallback links, selection preservation, and Apply/direct-use/Cancel. Production-header tests cover the narrow frame origin allowance. Browser testing confirmed embedded Freytag playback and selection/focus preservation on return. The preferred Story Circle video reported unavailable in the embed in the test browser, while its external YouTube fallback played correctly; the original preferred source is retained. Embed availability can vary by viewer, region, or publisher settings, so the fallback always remains visible.

November 14 local validation: all 408 tests / 41 suites, TypeScript, production build, and diff checks passed. The build retains its existing large-chunk advisory. Chrome checks passed for light/dark buttons and viewer, keyboard opening, Escape and Back focus restoration, player removal on close, separate-tab fallback without changing selection, and applying a template after viewing. The 390×844 phone layout has no horizontal overflow and keeps a 340×200 player plus return/fallback controls visible. The disposable fixture was stopped. These changes remain local under the publishing pause; no PR update, push, or deployment was performed.

Commands: `npm test -- --runTestsByPath tests/plot-structure-guides.test.ts`, `npm run check`, `npm test`, `npm run build` with Node 24.
