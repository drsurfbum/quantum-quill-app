> Current status: [October 13 stabilization closeout](docs/STABILIZATION_CLOSEOUT.md). This supersedes older status claims where listed as completed.

# Quantum Quill local setup

The recovered app runs at **http://127.0.0.1:5055** on this Mac. Open `Start Quantum Quill.command`, or run `npm run dev:local` from the project folder. Keep its terminal open while using the app. Control-C stops the app; PostgreSQL can remain running locally.

Read [the restart audit](docs/RESTART_AUDIT.md) before working on features. The recovered application has existing authentication and editor defects. This setup binds the app to the Mac's loopback address and the database to a private Unix socket.

## Locations

- Working project: `/Users/austinhartt/Documents/GitHub/quantum-quill-app`
- Private GitHub repository: https://github.com/drsurfbum/quantum-quill-app
- Recovery backups and audit evidence: `/Users/austinhartt/Documents/QuantumQuill Backups/2026-10-11`
- Local PostgreSQL data: `.local/postgres`, excluded from Git
- Local settings: `.env`, excluded from Git
- Uploaded images: `uploads/`, excluded from new Git commits
- Development reference attachments: `attached_assets/`, excluded from new Git commits

The original Replit project and the older public GitHub repositories remain unchanged. Tag `replit-baseline-2026-10-11` preserves the recovered source before local setup changes. Historical commits still contain previously tracked images and attachments; keep the working repository private.

## Installed runtime

Node 24 and PostgreSQL 16 are installed through Homebrew. The launcher selects these versions without changing the Mac's default Node version. It starts PostgreSQL on a private socket in `/tmp/quantum-quill-501`, using port number 55432 for the socket filename. PostgreSQL does not listen on TCP. The app uses port 5055 to avoid macOS services that can use port 5000.

The existing users, passwords, projects and writing data were restored. Local development now requires the same username/password login as production; the automatic user-1 and fabricated-token bypasses have been removed. No Replit database credentials are needed locally. The local session secret is newly generated. It must contain at least 32 characters; there is no fallback secret.

## Checks

```sh
export PATH="/opt/homebrew/opt/node@24/bin:$PATH"
npm ci
npm test
npm run check
npm run build
```

The production build, full TypeScript check and 27 isolated regression tests pass after the local stabilization round. See [the stabilization report](docs/STABILIZATION_REPORT.md) for scope and remaining issues, and [the testing guide](README-Testing.md) for a disposable browser fixture.

Tests inject synthetic in-memory storage and block real database imports. Do not point tests or `db:push` at Replit or the recovered writing databases. The existing `quantum_quill_audit_test` and `quantum_quill_verified_snapshot` databases are not used by the new test suite.

After reviewing local source changes, restart the regular app with the launcher to load the repaired server. Existing sessions may require signing in again. The browser fixture runs separately on port 5057 and is not your recovered writing database.

## Database recovery

The backup directory contains a PostgreSQL custom-format dump, a full source archive, a Git bundle and a SHA-256 manifest. The dump includes all ten public tables, sequences and session data. Restore it into a **new, empty** local database with PostgreSQL 16 `pg_restore --no-owner --no-acl --exit-on-error`. Do not overwrite an existing database as a routine startup step.

On a new Mac, install Node 24 and PostgreSQL 16, clone the private repository, install dependencies, initialize a private PostgreSQL cluster in `.local/postgres`, restore the dump, copy the backed-up `uploads/` and `attached_assets/`, and create a local `.env` with a new session secret. Backups contain private writing and account data and must remain outside Git.

The database service can be stopped after stopping the app:

```sh
/opt/homebrew/opt/postgresql@16/bin/pg_ctl -D .local/postgres stop -m fast
```

## Render later

No Render services were created or changed. This remains one React/Express application with PostgreSQL. Before deploying to the existing Render account, resolve the audit's authentication and data-safety findings and choose durable storage for uploaded images. Configure the deployment host as `0.0.0.0`; the default in this recovered local setup is `127.0.0.1`.

### Saved writing styles

The expanded Write editor adds an account-level style library. For an existing database, run `npm run db:migrate:writing-styles` with the intended `DATABASE_URL` before starting the updated server. The additive migration has already been applied to this Mac's `quantum_quill` database. See [Write formatting](docs/WRITE_FORMATTING.md) for controls, persistence, and remaining publishing limitations.

### Scene Story Bible connections

Scene context cards and backlinks are now available in Write and Outline. See [the workflow and validation report](docs/SCENE_STORY_BIBLE.md). The additive `npm run db:migrate:scene-context` migration is already applied locally; run it with the intended `DATABASE_URL` when setting up another restored database, after the earlier migrations. It does not rewrite existing writing or Bible records.
