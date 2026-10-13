# Writing workspace layout

The Write page follows the writing-first wireframe: a large prose page under a single formatting row, with scene planning above Story Bible references in a right sidebar. Chapter and scene selection share one compact header. Continuous chapters use the same expanded prose surface without scene-only panels.

- The right sidebar opens by default at desktop widths (1280px and above). Each half scrolls independently. Below that breakpoint it starts closed and can be opened as an overlay; opening it does not squeeze the text.
- The scene sidebar button beside Add scene hides or restores both panels. The chapter list can also be hidden, and Focus mode expands the editor to fill the window.
- Quill styles, paragraph style, font, size, and text emphasis stay in the compact toolbar. More formatting opens the remaining paragraph, color, insert, table, and search controls. Narrow toolbars scroll horizontally instead of growing taller.
- Word count, save status, retry/recovery actions, and Focus mode sit in a fixed-height footer. Content does not determine column widths. The actual editable page fills the available height and grows into its own scroll area for longer prose.
- Scene details and the Outline link live in the planning panel. Planning, reference notes, and prose continue using the existing draft journals, revision checks, and save queues; toggling the sidebar does not replace the prose editor or its undo history.

## Validation (2026-10-13)

- TypeScript check and production build passed.
- Full suite: 347 tests across 30 suites passed, including the existing recovery, conflict, account-isolation, and legacy-field regressions. The shared scene-plan/prose regression also verifies editor identity and undo history survive sidebar toggles.
- Isolated synthetic browser walkthrough: prose and scene notes survived reload together; paragraph formatting retained its selection; beat editing scrolled only the planning panel; sidebar toggles and Focus mode retained the prose; saved and unsaved states retained the same page width and height.
- Desktop (1280×720), laptop (1024×768), and narrow (390×844) layouts checked. At 1280×720 the editable scene page begins around y=243 and has 421px of visible height, with both reference panes open. Light and dark themes checked.
- No database changes or recovered-writing edits were needed.
