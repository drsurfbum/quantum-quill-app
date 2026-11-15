# Write-sidebar Story Bible search

Change based on release `65483de7ad8a78ec5d81a46cb68f01f8ae318fa4`.

## Surface and findings

The inspected route is `/project/:id/write` → Writing context (Context button on smaller screens) → Story Bible → **Find**. `WritingReferencePane` opens `EntryPicker`; the same picker also serves relationship targets, scene links and the inline manuscript linker. The separate Story Bible library search filters its persistent library and is not this dialog.

The existing picker already rendered all eligible matches, without a suggestion cap. Its default search was blank. This change retains that behavior and makes the Write chooser include archived entries as readable reference cards, clearly labeled. Archived entries still cannot become new relationship/inline-link targets.

Reproduced on local Playwright WebKit 26.0:

- At a 1024 × 350 layout viewport, the old dialog extended from y=-9 to y=359, beyond both viewport edges.
- Selecting a result left focus on the document body because this programmatically opened dialog had no trigger to restore focus to.
- The shared dialog's duration also interpolated position/height during resizing. Find now disables its transform, animation and transition and uses visual-viewport coordinates directly.

The reported physical-iPad symptom of the caret being painted in the suggestion list was **not reproduced**. The implementation fixes demonstrated viewport/focus issues and keeps the caret's field separate from the scroll region. Confirmation of the original rendering symptom still needs the iPadOS version, Safari tab versus Home Screen launch, keyboard mode (docked/floating/hardware), and the exact opening steps or a brief recording. No physical iPad or Home Screen installation was tested.

## Behavior

- Find uses a bounded dialog within the visual viewport, responding to both resize and pan when the on-screen keyboard changes available space. The field and instructions stay outside the native scrolling list.
- Scrollbars are visually hidden. Native touch/wheel scrolling is retained; no touch handlers cancel scrolling or select items on touch-down. A count and short scrolling hint identify the browse list.
- DOM focus remains in the editable combobox. Options and the scroll container are excluded from Tab navigation. Arrow keys and Page Up/Down move the active option; Ctrl/Cmd+Home/End reach the first/last result. Ordinary Home/End remain text editing keys. Only the list scrolls to reveal keyboard-active options. IME composition does not trigger selection.
- Enter or a deliberate tap/click selects. Escape closes through Radix. Selection and Escape return focus to Find; Continue writing restores the manuscript selection.
- Only Write Find opts into ranking: exact title, title prefix, then other existing title substring matches; within each relevance tier, existing positive `priority` (Starred), local explicit selection count, title, then ID. Blank browse uses stars/count/title/ID. Shared relationship, scene and inline-link consumers retain their original eligible-entry order and archive restrictions.
- Frequency counts only deliberate Write Find selections, not hovering, scrolling, text matches, mentions, updates, or reading another view. Browser-local storage uses the existing account/project scoping pattern: `quantum-quill:bible-find-counts:v1:<account>:<project>`. It contains numeric entry IDs and counts only, is not uploaded, and does not sync across browsers. Removed IDs are pruned on the next selection; invalid/unavailable storage falls back to stars/name. No server schema, analytics or settings were added.

## Repeatable checks

Node 24; install locked dependencies, then run:

```sh
npm run check
npm test
npm run build
QQ_SHOWCASE_PORT=5079 NODE_ENV=test node --import tsx tests/showcase-server.ts
```

The showcase is a loopback-only in-memory app with original fictional Lantern Coast data. It never imports the database or a `.env` file. An optional dedicated port prevents interference with another task's fixture. Stop/restart to clear fixture data and its normal login rate limiter.

With Playwright and its WebKit/Chromium browsers installed separately:

```sh
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs \
QQ_SHOWCASE_PORT=5079 \
QQ_EVIDENCE_DIR=/absolute/path/to/evidence \
node tests/bible-picker-browser.mjs
```

`CHROMIUM_EXECUTABLE` may point to an existing Chrome for Testing binary. No browser dependency or lockfile change is required for the optional browser harness. Use only the showcase fixture, never a writing server.

The browser harness creates 313 fictional entries in project one plus an isolated second project and an empty third project. It covers 1024×1366, 1366×1024, 834×1194, 1194×834 and 390×844 in both engines, 350-pixel short viewports, separately simulated visualViewport resize/pan, all-list and filtered last-entry reachability, empty states, focus/selection/Escape, frequency ordering and project isolation. Desktop wheel scrolling is tested in both engines. Chromium additionally receives browser-native touch gestures, including a long swipe to the last filtered entry with the caret inside the query, followed by tap and manuscript-selection restoration. WebKit receives actual taps and wheel/keyboard input; physical iPad swiping and its real keyboard compositor remain unverified. The visualViewport override is explicitly a simulation, not an iPad keyboard capture.

The mounted/unit suite also checks 1,500 uncapped entries, relevance and stable ties, archive/source/type constraints, account/project count isolation, unavailable/corrupt storage, IME behavior, shared order/stub selection and visualViewport listener cleanup. No tests use real manuscripts or accounts.

## Original scroll/focus validation (November 14, 2026)

- TypeScript and production build passed; the existing large-bundle advisory remains.
- All **418 tests in 42 suites** passed, including 10 added picker regressions.
- All **14 real-browser cases** passed (five mobile viewport sizes, one desktop wheel case, and one shared-consumer smoke case per engine).
- Both engines passed the actual scene, inline-link and relationship picker smoke checks. Eligible source order, archive exclusions, selection callbacks and stub controls remain available.
- Baseline short-viewport bounds: y=-9, height=368 in 350 pixels. Final bounds: y=12, height=326. The independently simulated visual viewport at offsetTop=120/height=350 yields y=132/height=326.
- Physical iPad/Home Screen testing and the exact original caret-rendering reproduction remain outstanding; no claim of physical-device validation is made.

## Evidence

The task's sibling `evidence/` directory holds original PNG captures and machine-readable browser results. Baseline images use the original 11-entry showcase; final images use the larger 313-entry fixture. They are real application captures, not illustrations.

- `before-portrait.png`, `before-short.png`, `baseline-results.txt`: baseline WebKit.
- `webkit-portrait-browse.png`, `webkit-portrait-short.png`, `webkit-narrow-short.png`: current field/list layout, including caret-visible screenshots.
- `webkit-portrait-last.png`: last project entry visible with the field above it.
- `chromium-long-swipe-caret.png`: last filtered match after native touch scrolling, with insertion point at character 3.
- `*-visual-viewport.png`: explicitly simulated visual-viewport changes.
- `*-wheel-last.png`: native desktop wheel/trackpad-style scrolling.
- `browser-results.json`, `browser-run.log`: exact browser geometry and outcomes.

The implementation and evidence were initially prepared locally. Completed work now follows the user’s standing draft-PR rule. Merging, deployment, live-data access and shared-worktree modification remain outside this change.

## Boolean filtering follow-up

Only the Write → Writing context → Story Bible → Find chooser uses this syntax. It filters entry **titles only**, immediately as the writer types. The syntax example is visible in the Find dialog. Other shared pickers keep literal substring search and their existing order.

| Query | Meaning |
| --- | --- |
| `harbor old` | Title contains both partial words, in either order (implicit AND). |
| `harbor AND old` | Explicit AND; same match requirement. |
| `harbor OR lantern` | Either partial term matches. |
| `harbor NOT old` | Contains harbor, excludes old. |
| `"chart room"` | Contiguous phrase; still case-insensitive partial matching within the title. |
| `(harbor OR "chart room") NOT old` | Grouped alternatives, then exclusion. |

Precedence is **NOT > AND > OR**. Parentheses override it. Operators must be uppercase whole words; lowercase `and`, `or`, `not` remain ordinary name terms. Quote a literal operator name. Straight and smart double quotes work; inside a phrase, a backslash can escape its closing quote or a backslash. Regex punctuation such as `+`, `*`, brackets and periods stays literal. Quote parentheses when they are part of a name.

Unfinished operators/groups impose no constraint until their next operand arrives: `Mara OR (`, `Mara AND`, and `Mara OR NOT` retain Mara matches. Unclosed quotes already filter by the phrase typed so far. Empty groups/quotes and stray closing parentheses are tolerated without errors. A single unfinished name prefix such as `OR`, `AND` or `NOT` remains literal when typed alone without a following delimiter. When a final uppercase operator prefix after another term has no literal matches, the completed expression remains visible until typing continues; any literal partial-name matches take priority over this fallback. No query text is rewritten, and ordinary nonmatching completed searches still show the empty state.

Matching positive terms supply relevance before the existing star/frequency/name/ID ties: exact names, then name prefixes, then weaker matches. An ordinary multiword query also retains whole-name exact/prefix priority over disjoint word matches. Negation alone does not boost relevance. Blank browse order and private selection counts are unchanged.

The parser compiles and evaluates iteratively; it never executes a query as JavaScript or a regular expression. Current-project/type/archive eligibility is applied before Boolean filtering, including for negative-only queries. No server search endpoint, additional fields, analytics or settings are introduced.

Run `npm test` for the parser truth tables, type-ahead/phrase/escape cases, deep grouping, ranking, scope and mounted-field regressions. Run the original `tests/bible-picker-browser.mjs` first for the scrolling/shared-consumer matrix, then `tests/bible-query-browser.mjs` using the same environment variables and fictional showcase. The latter checks actual WebKit/Chromium portrait, landscape, narrow and short-viewport flows; it captures Boolean query, long-list and short-viewport PNGs. Its five extra fictional special-character names bring the combined fixture to 318 entries. Evidence for this follow-up is in the task's sibling `boolean-evidence/` directory.

Physical iPad Safari, Home Screen launch and the iPad software-keyboard compositor remain distinct from these desktop-engine checks and are not claimed as tested.

Follow-up validation: TypeScript and production build passed (the existing chunk-size advisory remains); **445 tests across 43 suites** passed. All **14 existing browser regression cases** and **6 additional Boolean browser cases** passed in WebKit 26.0 and Chromium 151.0.7922.34. The new cases exercise 17 query forms per viewport plus incremental typing, mid-query insertion/deletion, a 290-result filtered list through its final entry, short-viewport layout, selection and Escape. The six new viewport cases use 318 fictional entries; parser tests also cover 1,500 entries and 10,000 nested groups. No live manuscripts, browser tabs or persistent accounts were used.
