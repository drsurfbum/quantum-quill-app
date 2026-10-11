# Write formatting and field visibility

Write has a labeled, bordered writing surface with a focus ring and a decorative empty-state prompt. The entire box is editable. Outline uses the same surface and retains its smaller toolbar. All seven specialized Story Bible title inputs and the generic entry title have visible labels and borders. The plot text area is explicitly associated with its section heading. Standard form fields already use bordered Input/Textarea controls; the deliberately hidden upload input remains behind its visible upload button.

## Write tools

- Six local font stacks, 8–72 point size choices, headings 1–3, bold/italic/underline/strike, superscript/subscript.
- Text colors and highlighting with palettes, custom colors, and reset controls.
- Left/center/right/justified alignment; line spacing, paragraph spacing, first-line and block indents; lists and block quotes.
- Undo/redo, clear formatting, links, images from URLs with alt text, scene dividers, and editable tables (rows, columns, headers, merge/split).
- Chapter-scoped find and replace, case matching, literal punctuation, matches across inline formatting, and undoable replacements.
- Focus mode, word count, character count on hover, and the existing durable autosave status.

The Quill styles gallery contains six original typographic homages/moods: Austen · Correspondence, Poe · Midnight, Hemingway · Dispatch, Epic · Chronicle, Noir · Casefile, and Orbital · Logbook. Preview lines are original samples. These are typography presets; they do not generate or rewrite prose. Fonts use installed system fonts with fallbacks; no external font request is required, and exact glyphs may differ by device.

Selecting a preset applies it to selected text or the current paragraph if there is no selection. Font and size controls follow standard selected-text/cursor behavior. A saved style captures font, size, emphasis, colors, alignment, line spacing, paragraph spacing, and first-line indent at the cursor. It does not capture document content, links, list structure, block indent, or superscript/subscript. Heading levels remain a separate semantic control.

## Persistence

Formatting is serialized as standard HTML tags and inline CSS in chapter content, using the existing queued autosave and draft-recovery path. Placeholder text is decorative and never becomes saved writing. The new attributes are enabled only in Write; Outline and Story Bible remain simpler.

Custom styles are stored in PostgreSQL's `writing_styles` table, scoped by the authenticated user. The API derives ownership from the session and accepts a bounded schema of typography values. Reusing a name updates that account's existing style. Removing a style leaves formatting already applied to chapters intact. Concurrent edits to a named style use last-save-wins; chapter text keeps its existing conflict protection.

Run the additive migration before deploying this code to an existing database:

```sh
npm run db:migrate:writing-styles
```

The command uses `DATABASE_URL` and applies `migrations/0001_writing_styles.sql` inside a transaction. It adds only the style table and unique account/name index. Applied to the local restored database on 2026-10-11; no existing writing was migrated or rewritten. Future fresh installations using the full Drizzle schema include the table as well.

## Verification and limits

Regression coverage includes HTML round trips for every preset, selected-text formatting and scripts, empty-paragraph typing, formatting through autosave and navigation, toolbar controls and the saved-style form, case-aware search/replacement, account isolation, validation, and style removal without changing chapter text. Browser inspection verifies the real local toolbar, field boundary, and gallery without editing the user's chapter.

This adds an expanded writing toolbar, not a paginated publishing engine. Footnotes/endnotes, page layout, headers/footers, tracked changes, and print/PDF/DOCX fidelity are not implemented here. The existing export dialog still simulates completion rather than producing files; it needs its own implementation and validation before formatted-document export can be relied on.
