# Quantum Quill local setup

The recovered app runs at **http://127.0.0.1:5055** on this Mac. Open `Start Quantum Quill.command`, or run `npm run dev:local` from the project folder. Keep its terminal open while using the app. Control-C stops the app; PostgreSQL can remain running locally.

Read [the restart audit](docs/RESTART_AUDIT.md) before working on features. The recovered application has existing authentication and editor defects. This setup binds the app to the Mac's loopback address and the database to a private Unix socket.

## Locations

- Working project: `/Users/austinhartt/Documents/GitHub/quantum-quill-app`
- Private GitHub repository: https://github.com/achartt/quantum-quill-app
- Recovery backups and audit evidence: `/Users/austinhartt/Documents/QuantumQuill Backups/2026-10-11`
- Local PostgreSQL data: `.local/postgres`, excluded from Git
- Local settings: `.env`, excluded from Git
- Uploaded images: `uploads/`, excluded from new Git commits
- Development reference attachments: `attached_assets/`, excluded from new Git commits

The original Replit project and the older public GitHub repositories remain unchanged. Tag `replit-baseline-2026-10-11` preserves the recovered source before local setup changes. Historical commits still contain previously tracked images and attachments; keep the working repository private.

## Installed runtime

Node 24 and PostgreSQL 16 are installed through Homebrew. The launcher selects these versions without changing the Mac's default Node version. It starts PostgreSQL on a private socket in `/tmp/quantum-quill-501`, using port number 55432 for the socket filename. PostgreSQL does not listen on TCP. The app uses port 5055 to avoid macOS services that can use port 5000.

The existing users, passwords, projects and writing data were restored. Development mode retains the original app's automatic user-1 behavior. No Replit database credentials are needed locally. The local session secret is newly generated.

## Checks

```sh
export PATH="/opt/homebrew/opt/node@24/bin:$PATH"
npm ci
npm run build
npm run check
```

The build succeeds. The type check has 26 pre-existing errors recorded in the audit. The inherited Jest suite fails before executing tests because its module mapping is misspelled. Do not point tests or `db:push` at the Replit database or at the recovered working data. Use the separate `quantum_quill_audit_test` database for disposable tests.

## Database recovery

The backup directory contains a PostgreSQL custom-format dump, a full source archive, a Git bundle and a SHA-256 manifest. The dump includes all ten public tables, sequences and session data. Restore it into a **new, empty** local database with PostgreSQL 16 `pg_restore --no-owner --no-acl --exit-on-error`. Do not overwrite an existing database as a routine startup step.

On a new Mac, install Node 24 and PostgreSQL 16, clone the private repository, install dependencies, initialize a private PostgreSQL cluster in `.local/postgres`, restore the dump, copy the backed-up `uploads/` and `attached_assets/`, and create a local `.env` with a new session secret. Backups contain private writing and account data and must remain outside Git.

The database service can be stopped after stopping the app:

```sh
/opt/homebrew/opt/postgresql@16/bin/pg_ctl -D .local/postgres stop -m fast
```

## Render later

No Render services were created or changed. This remains one React/Express application with PostgreSQL. Before deploying to the existing Render account, resolve the audit's authentication and data-safety findings and choose durable storage for uploaded images. Configure the deployment host as `0.0.0.0`; the default in this recovered local setup is `127.0.0.1`.
