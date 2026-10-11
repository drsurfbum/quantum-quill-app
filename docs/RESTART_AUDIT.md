# Quantum Quill restart audit

October 11, 2026

**Continue this codebase, with a focused stabilization phase before new features or deployment.** Quantum Quill already has substantial writing and world-building functionality. Its documentation overstates readiness: authentication can be bypassed, several editors crash, saving needs reliability work, and export is simulated. A rewrite would discard useful work without resolving the product decisions that remain.

This audit covers the recovered Replit source at `a7290ec2517ec5e4316fa0e6125555865a201264`, the live database export, uploaded files, repository history, dependencies and local runtime checks. Local setup changes are listed separately below. Application defects have not been repaired as part of recovery.

## Recovery verification

- Replit's live HEAD matches the fresh source download and the October 9 local export. The working tree was clean before and after backup; temporary export files were removed after verification. No migrations or application changes were made in Replit.
- All 240 source-history commits are preserved locally, in a Git bundle and in the private working repository. The latest recorded commit is November 21, 2025, titled “Ensure consistent navigation across all project writing tools.”
- The existing `achartt/QuantumQuill` repository stopped at June 26, 2025 commit `9fb148f`. The README's older `achartt/QQ-replit` link points to an even less complete copy. Neither is the restart source of truth.
- The PostgreSQL 16 custom-format dump restored without errors. Its downloaded checksum matches the checksum computed inside Replit.
- Seven uploaded images plus `.gitkeep` match Replit byte for byte. All 85 development reference attachments also match. These files remain available locally and in the full source archive.
- Private backups contain the original database, full source archive, Git bundle and per-file asset hashes. The dump and credentials are not committed to GitHub. Existing images and attachments in historical commits remain in the private history, while new commits stop tracking their working folders.
- Gitleaks reported no credential findings in the Git history scan. This is a detector result, not a guarantee that every possible secret or private document is absent.

| Recovered data | Rows |
| --- | ---: |
| Users | 2 |
| Projects | 2 |
| Chapters | 7 |
| Story bible entries | 47 |
| Outline items | 19 |
| Whiteboards | 10 |
| Plot structures | 6 |
| Plot structure sections | 86 |
| Plot templates | 8 |

The session table was also included. All nine application tables match a fresh restore of the original dump exactly after local browser checks. Tests use a separate database containing synthetic data; the recovery dump retains the untouched original records.

## Documentation found

All three first-party Markdown documents are in the project root. No separate roadmap was found.

| Document | What it establishes | What needs correction |
| --- | --- | --- |
| `README.md` | Writing platform vision, story bible, chapter editing, outlines, plots and images | Claims collaboration and working multi-format export; points to an outdated repository; references a LICENSE file that is absent |
| `replit.md` | June 2025 implementation notes and the practical roadmap under Future Enhancements | “Story Bible Complete” and “all TypeScript errors resolved” do not match current verification; AI, collaboration, advanced exports and mobile are listed as future work |
| `README-Testing.md` | Intended authentication test coverage | Claims four suites, but only three test files exist; the password-security file is missing; the inherited configuration prevents all suites from executing |

## Architecture and actual feature status

React 18 and TypeScript provide the interface, with Vite, Tailwind/shadcn, Wouter routing and TanStack Query. Express provides the API. Drizzle maps PostgreSQL tables. Passport local authentication and PostgreSQL-backed sessions are implemented. TipTap handles rich text, Fabric handles the visual whiteboard, and Multer writes uploaded images to the local filesystem.

`client/src/App.tsx` routes to the dashboard, project overview, writing, storyboard, outline and story-bible pages. `server/routes.ts` contains the API, `server/storage.ts` the database operations, and `shared/schema.ts` the data definitions. Most user-created world-building information lives in JSON metadata on story-bible entries. The recovered app has no AI provider calls, collaboration synchronization service, billing integration or mobile application.

| Area | Verified status |
| --- | --- |
| Projects and chapters | Implemented; recovered dashboard and chapter editor load locally |
| Story bible | Seven specialized editor implementations and saved entries exist; overview loads; event editor crashes when opened |
| Outline and plot planning | API, hierarchical outline records, eight plot templates and section editors exist; needs save/navigation and relationship testing |
| Whiteboard | Fabric canvas serialization, saving and image tooling exist; image API mismatch is flagged by TypeScript |
| Image uploads | Files recovered and hashes verified; disk storage has a 5 MB upload limit; validation and access control need hardening |
| Export | `export-modal.tsx` shows success after a timer without generating a file; project overview actions also contain “Coming Soon” behavior |
| Sharing and collaboration | UI affordances exist; no implemented real-time collaboration backend |
| AI writing assistance | Roadmap only |
| Social login | Provider packages are installed, but the active auth setup uses the local username/password strategy |

## Findings in priority order

### Critical — authentication accepts fabricated identity tokens

`server/routes.ts:22` and `server/auth.ts:218` parse a user identifier from a client-supplied string without a signature, expiry validation or proof of login. `client/src/hooks/use-auth.tsx` manufactures these tokens in the browser. In a production-mode instance using two synthetic accounts, an anonymous projects request returned 401 while a fabricated token returned 200. This is a confirmed authentication bypass.

Replace the fallback with properly enforced sessions or a vetted identity provider. Remove the development bypass from deployable behavior, invalidate legacy tokens, and add tests that reject fabricated identities. Do not expose the recovered application publicly before this is resolved.

### Critical — ownership checks do not protect child resources

Top-level project reads check ownership, but chapter, outline, story-bible, whiteboard and plot routes generally do not trace ownership through the parent project. Several update routes also pass the full request body into storage. See `server/routes.ts:334` onward and the storage update methods.

The isolated runtime check confirmed that user B received 403 for user A's project but 200 for user A's chapter. This is independently serious even after the token bypass is fixed. Enforce ownership consistently for reads and writes and restrict editable fields.

### High — story-bible editor crashes and incomplete type safety

The baseline has 26 TypeScript errors. Some concern inactive older components, but others are in current editor paths. Opening an existing event reproduced `ImageIcon is not defined` at `client/src/components/story-bible/events-editor.tsx:683`. Event, details and research editors also reference `FileUpload` without importing it. Missing components, metadata typing issues and a Fabric image API mismatch are present elsewhere.

The Vite build succeeds because it does not perform the full TypeScript check. A successful build is therefore insufficient as a release gate. Repair active editor crashes first, then remove or repair obsolete paths and make the type check mandatory.

### High — saving can report success after failure

`client/src/components/rich-text-editor/index.tsx:84` delays saves and sets the status to “saved” inside the error callback. It has no explicit flush on navigation and no per-chapter save queue. Plot editors contain similar delayed save handling, while wrapper components temporarily replace the shared query client's invalidation method to stabilize the interface.

The misleading success state is directly visible in code. Lost or out-of-order saves are risks requiring targeted navigation and failure tests; this audit does not assert that writing was lost. Add a durable save state, ordering, retry and navigation handling before relying on the app for substantial writing.

### High — database relationships are unenforced and orphan data already exists

The restored database has **zero foreign-key constraints**. There are **31 plot-section rows whose parent plot structures no longer exist**. Other checked project-child relationships have no orphan rows. `shared/schema.ts` describes parent relationships as plain integers, and database deletion methods generally delete a single row without transactionally reconciling children.

Preserve the orphan sections and review whether they contain recoverable writing before any cleanup. Then add constraints and define deletion behavior through a reviewed migration. No orphan rows were deleted during this recovery.

### High — dependencies need a planned security update

The baseline npm advisory scan reports 108 affected package entries: 6 critical, 52 high, 46 moderate and 4 low. These are package counts, not 108 distinct exploitable flaws in Quantum Quill. The tree includes development tooling and installed packages that the active application does not use, including the Auth.js packages.

Triage reachable Express, upload, session, rich-text and build-tool dependencies first. Remove unused packages before considering major upgrades. The exact scan and advisory URLs are saved with the audit evidence. No blanket audit fix or dependency-version upgrade was applied; even the PostgreSQL driver uses versions already present in the recovered lockfile.

### High — sessions, debug output and uploaded files need hardening

`server/auth.ts` has a fallback session secret, insecure-cookie settings and a manually set session cookie that overlaps session middleware behavior. `server/index.ts` logs API response payloads. Diagnostic routes in `server/routes.ts:115` expose session/authentication information and log bearer tokens. Uploaded files are served as static public paths, and upload validation relies on client-provided type and filename extension rather than validating file contents.

Before deployment, remove diagnostic endpoints and sensitive logging, require a production secret, use appropriate secure cookies, constrain uploads and decide whether story images should require authorization. Historical public repositories may still contain older uploaded images and attachments; their visibility was not changed during recovery.

### Medium — the inherited tests and server startup need restructuring

All three Jest suites fail before running any tests because `moduleNameMapping` should be `moduleNameMapper`. The promised fourth password-security test file is absent. Importing `server/index.ts` also starts the server, while normal startup calls `registerRoutes` both inside `createApp` and again afterward. This duplicates route/session setup and makes isolated testing harder. The error middleware sends a response and then throws, which can terminate the process.

Separate application creation from listening, register routes once, isolate test databases and make tests assert the intended security behavior. The existing tests' use of the app database and incomplete cleanup make them unsuitable for running on recovered writing data.

### Medium — maintenance and deployment assumptions are stale

There are overlapping old pages, duplicate editor wrappers and missing imports in unused paths. The browser bundle is approximately 1.23 MB before compression. The original setup assumes a Neon WebSocket connection, Replit's port and a writable local upload directory. A Render deployment needs deliberate database, storage, session and health-check configuration. No Render configuration was applied in this recovery.

## Verification results

| Check | Result |
| --- | --- |
| Replit source and assets | Live HEAD and asset hashes match recovered copies; source checkout clean after export |
| Database restore | PostgreSQL 16 restore succeeded without errors; records and orphan relationships counted locally |
| Locked dependency installation | Completed; Node 24 selected for local development |
| Production build | Passed before and after local setup |
| Type check | 26 existing errors before and after setup; setup introduced no additional type-check findings |
| Existing Jest tests | 3 failed suites, 0 executed tests; module alias resolution blocks execution |
| Git history credential scan | No findings reported by Gitleaks |
| Local browser | Dashboard, project and chapter editor load; story-bible overview loads; event crash reproduced |
| Isolated production-mode API checks | Anonymous access rejected; fabricated token accepted; cross-user chapter read accepted |

Not every editor, save race, export format, mobile layout or whiteboard operation was tested. Findings distinguish reproduced failures from code-level risks. This is a restart and architecture audit, not a complete penetration test.

## Local setup changes only

The baseline is preserved by a Git tag. A separate setup commit adds a Node 24 launcher, uses the ordinary PostgreSQL driver already present in the lockfile, loads local settings, makes the listen port configurable and binds the local app to loopback. It removes the unsupported `reusePort` setting for macOS. New database files, settings and uploads are excluded from commits. The original documents remain available with a recovery notice linking to this audit.

No product features, editor behavior, authentication logic, saved content or dependency versions were changed. No services were deployed, and the existing SDH Render application was not touched.

## Recommended restart sequence

1. Repair authentication and ownership enforcement; establish trustworthy automated checks.
2. Fix active editor crashes and saving behavior, then recover or account for orphan sections and add database constraints.
3. Make export real so a writer can reliably take their work elsewhere.
4. Choose one useful AI workflow, such as a story-bible-aware assistant that proposes edits for review, and define its cost and privacy controls.
5. Deploy a limited pilot on the existing Render account after durable image storage and backup recovery are tested.

The most economical direction is to keep the existing React/Express/PostgreSQL structure and improve it incrementally. Real-time collaboration and a native mobile app can wait until the single-writer experience reliably saves, reopens and exports work.
