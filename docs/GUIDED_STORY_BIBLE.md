# QQ-14 — A more guided Story Bible

Implemented on `codex/workspace-integration`, based on `990d16fdb7c32787f62610cec606ca30b73677e2`. This is feature-branch work, not a main merge or Render release. The separate `codex/writing-first-layout` checkout is unchanged.

## Interaction

- Creation still requires only name and the existing type. Each of the seven choices now explains its purpose, gives concrete examples and distinguishes overlapping uses. Details covers writing notes/clues; Research covers sources and investigation; World Elements covers things and rules that exist in the fictional world.
- Develop prioritizes a useful beginning: character story notes, group/place/element overview, what happened in an event, the detail itself, or a research takeaway. Additional field groups are labeled optional depth. A partial entry is valid.
- Shared disclosure groups replace duplicated headers while retaining the specialized controls and their handlers. Buttons support keyboard activation and expose expanded state and panel IDs. Collapsed contents remain mounted and hidden, preserving local fields and editor identity.
- Concise field explanations have optional example disclosures. Examples never become input values or save patches. Hide guidance reduces prompting across entry navigation within the current Story Bible workspace; it resets when reopening the page.
- Connections offers optional, type-appropriate starting points. A suggestion opens the existing shared picker with a relationship kind, no target, and no write. The writer must choose a target and explicitly save. Existing restore/discard, stub, revision, conflict and account-scoping logic stays in that same form.
- Overview, Develop, Connections and imported Source remain available. A collapsed, read-only Saved & legacy values view exposes the complete current entry, including pending edits, generic fields, unknown values and original import payloads. Type conversion remains an explicit preview with apply unavailable.

`shared/bible-guidance.ts` contains presentation metadata keyed by the existing catalog types, field keys and shared relationship kinds. It adds no taxonomy, persisted fields, schema change or migration. Reusable rendering lives in `client/src/components/story-bible/guidance.tsx`.

## Writing protections

No changes to the rich editor, Write cards, autosave queue, durable journal, revision API, ownership checks, navigation guards, schema validation or imported-content readers. Opening guidance, collapsing groups and switching tabs do not enqueue writes. Specialized nested/category-dependent editors remain intact. Original narrative strings, unknown structured leaves, relationship IDs and images stay on their existing persistence paths.

## Validation and evidence

Local type check and production build pass. The existing large-bundle advisory remains. Mounted regression coverage now checks name-only creation for all seven types, a blocked creation retaining its name, same-node editing across disclosure/tab/guidance changes, round trips of unknown nested values/imports, read-only examples/legacy inspection, and explicit relationship picking.

The managed execution sandbox denies local socket listeners. The full local Jest attempt stopped on `listen EPERM`; local API/full-suite validation cannot be claimed from that attempt. The required existing GitHub workflow runs type checking, the complete Jest suite, production build and disposable PostgreSQL/restore checks. The separate guided-browser workflow runs real Chromium against the loopback-only in-memory showcase server and captures synthetic screenshots and a receipt. Its results must be verified before calling this delivery fully validated.

Browser command: `node tests/browser-guided-bible.mjs`, after building and making `playwright@1.56.1`/Chromium available in a disposable environment. The runner starts and stops its own fixture on port 5063, refuses a failed startup, checks all seven new-entry paths and existing values, tests keyboard disclosures and explicit connections, checks 390px layout, and fails on page exceptions. `QQ_DEMO_GUIDANCE=1` adds only synthetic import/unknown-value fixtures; it never imports a database or `.env`.

The full character-development workbench, timeline, research library, project-wide connection scanner and conversion application remain separate work. Cross-browser, IME and assistive-technology certification remain future QA.
