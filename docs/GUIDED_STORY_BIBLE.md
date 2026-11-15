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

Local focused validation passed 95 tests across 10 suites. A source-AST audit confirmed that all 265 field value/change bindings across the seven specialized editors were unchanged.

The managed execution sandbox denies local socket listeners. The full local Jest attempt stopped on `listen EPERM`; local API/full-suite validation cannot be claimed from that attempt. The required existing GitHub workflow passed type checking, the complete Jest suite, production build, production-only installation and disposable PostgreSQL/restore checks at `e85059c5ce8468939909df977ceee52d82324277` ([run 40136074526](https://github.com/drsurfbum/quantum-quill-app/actions/runs/40136074526)). Application source is unchanged in the subsequent browser-harness refinements. The real Chromium walkthrough also passed all 16 recorded checks, including all seven creation/development/reload paths, existing imported/unknown data, explicit connections and a 390px layout. Final settled captures and their run provenance are recorded in the evidence receipt below.

Browser command: `node tests/browser-guided-bible.mjs`, after building and making `playwright@1.56.1`/Chromium available in a disposable environment. The runner starts and stops its own fixture on port 5063, refuses a failed startup, checks all seven new-entry paths and existing values, tests keyboard disclosures and explicit connections, checks 390px layout, and fails on page exceptions. `QQ_DEMO_GUIDANCE=1` adds only synthetic import/unknown-value fixtures; it never imports a database or `.env`.

The full character-development workbench, timeline, research library, project-wide connection scanner and conversion application remain separate work. Cross-browser, IME and assistive-technology certification remain future QA.

## Checkout and delivery notes

The local managed checkout initially had clean branch `codex/workspace-integration` at `990d16f`; the separate app checkout was clean at `7a3f09d` with an equivalent baseline tree and different history. Work was implemented only in the managed checkout.

The sandbox denied staging because the worktree's Git metadata lives under the other checkout, outside the writable roots. Reviewed changes were committed through the connected GitHub Git-data API, with exact expected-head checks and fast-forward ref updates. The local execution environment then became unavailable. The remote feature branch is authoritative; the managed checkout retains its local working edits and older Git HEAD, and does not contain subsequent remote-only label/test/evidence refinements. Reconcile by inspecting and comparing the exact remote tree when the host returns; do not blindly reapply the feature, reset, rebase or force-push. The other checkout and app main were not changed.

## Reviewed browser evidence

Final settled captures: [run 40136370126](https://github.com/drsurfbum/quantum-quill-app/actions/runs/40136370126), code `a09d6d099898b843094b8127e5223898dbc1c499`. All 16 browser checks passed with zero page exceptions. Desktop: 1440 × 1000; compact: 390 × 844; Chromium 141.0.7390.37. Four original browser screenshots were visually reviewed and retained in the [screenshot gallery](images/qq14/README.md), with byte counts/hashes and the complete check receipt in [QQ14_VERIFICATION.json](QQ14_VERIFICATION.json). The full CI artifact also contains the Source and connection-picker captures.

The public roadmap update is `e0c74bc0573b7b50f6d1234cb3fba90078fc8ec3`. It labels QQ-14 as implemented feature-branch work, explicitly separate from the unchanged hosted alpha. App main remains `883942b69e12ebe499e113ee095b4e29f60c44ca`; no app deployment, migration, merge or history rewrite occurred.
