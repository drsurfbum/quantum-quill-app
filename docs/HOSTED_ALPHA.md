# Hosted alpha preparation — October 24, 2026

Status: deployment preparation, not a live release. The user requested a shareable testing link and chose open registration. Workspace confirmation, the final hosting charge, and live verification are still pending. Do not advertise a guessed Render hostname.

## Proposed isolated deployment

`render.yaml` describes a new `quantum-quill-alpha` web service and `quantum-quill-alpha-db`, with a 1 GB upload disk. It does not reference an SDH service, database, shared environment group, local recovery database, or private manuscript. The alpha starts with an empty database; new writers create their own accounts and projects.

Both QQ resources must use the same region. Oregon is the proposed default, subject to the workspace review. Services in one Render workspace share billing, administrators, and (within a region) a private network, but each app has separate credentials and storage. Network-level environment isolation requires a supporting workspace plan; this Blueprint does not change that plan or SDH's settings.

The proposed smallest paid plans are `0.5c-512mb` for the app and `0.1c-256mb` for PostgreSQL 16. Render's October 24 pricing page lists $7/month and $6/month respectively, plus upload disk at $0.25/GB/month and database storage at up to $0.30/GB/month. Budget approximately $14/month additional base cost; verify the final Dashboard total and included storage before applying. Usage over the workspace's bandwidth/build allowances can cost extra. No autoscaling, larger instance, paid workspace upgrade, or extra service is authorized by this file.

Source: [Render pricing](https://render.com/pricing). This is an estimate, not a spending authorization or a billing cap.

## Release workflow

1. Confirm the workspace and ensure the new resource names do not collide with existing resources.
2. Review the Blueprint, validate with `render blueprints validate render.yaml`, and approve the actual recurring charge.
3. Push the checked implementation to `codex/writing-first-layout`. Keep `main`, history, and existing feature ownership intact.
4. Create a Blueprint from the private app repository, selecting **codex/writing-first-layout** as its source branch. Select `render.yaml`. Connect GitHub only if its existing integration cannot access this repository; never make the source public to work around access.
5. Keep service auto-deploy **off**, and turn off automatic Blueprint sync in the Dashboard. A feature backup push must not release unreviewed changes or alter infrastructure.
6. Let Render generate a fresh session secret and supply the new database's internal connection string. No credentials belong in Git or public documentation.
7. Wait for the specific deploy to reach `live`, then verify HTTPS registration/login, secure session cookies, saves/reload, two-account isolation, uploads, export, and restart persistence.
8. Add the verified URL to both READMEs and the public roadmap. Share the app URL for testing; the public roadmap is an introduction, not the app.

The app binds to Render's `PORT` on `0.0.0.0`, uses database-backed sessions, and reports database readiness at `/healthz`. Only `/var/data` is persistent; `UPLOAD_DIR=/var/data/uploads` includes the `.access` ownership index. Never expose uploads through a public static-file mount. A persistent disk means one instance and brief downtime on redeploy; browser recovery remains active during failed saves.

## Empty-database initialization

The reviewed schema snapshot is `deployment/alpha-schema.sql`. `npm run db:init:alpha` requires `DATABASE_URL` and `QQ_DATABASE_PURPOSE=fresh-alpha` and runs as Render's pre-deploy command.

- Initialization runs in a transaction under a database advisory lock.
- It refuses a nonempty database with no alpha marker, without modifying its contents.
- It records the schema checksum and version in `qq_alpha_schema`; repeat runs with that exact snapshot do nothing.
- A changed checksum/version fails closed. Future schema changes need reviewed additive migrations, not editing the original snapshot or running `db:push`.
- The snapshot includes all current application tables, session storage, indexes and constraints from the existing additive migrations. It contains no writing or account data. Plot templates are added at first app startup.

## Verification

`npm run check`, all 383 tests across 37 suites, and `npm run build` pass locally. The compiled registration screen renders with the production CSP and no browser console warnings/errors. The new request tests cover deeply nested/oversized collections, JSON-encoded legacy payloads, large prose, rejected compression, and production headers.

`tests/hosted-alpha.mjs` exercises the actual compiled production server against random disposable databases. It checks concurrent/idempotent initialization, refusal of existing data, open registration, proxy/secure cookie behavior, scenes and Story Bible context, stale-write rejection, account and image isolation, export, restart persistence, and a paired database/upload restore. It compares all 16 restored table fingerprints and the upload access metadata. It does not read a recovered-data backup.

```sh
# Use a disposable PostgreSQL server whose role may create databases.
QQ_TEST_PG_ADMIN_URL=postgresql://test_role@127.0.0.1:5432/postgres npm run test:alpha
```

`pg_dump` and `pg_restore` must match the test server's major version; set `PG_BIN` if they are not on PATH. CI runs PostgreSQL 16 and repeats this rehearsal after pruning development dependencies, so a successful build cannot hide a production dependency on Vite/Jest.

Local rehearsal is not a substitute for the final Render verification. Do not mark QQ-23 complete on the strength of a local test alone.

## Security and alpha limits

The deployment pass updates Express/body-parser, Multer, Drizzle, sanitize-html and compatible transitive packages, and moves test/build/unused native-canvas packages out of production installation. Installation scripts stay disabled. The production bundle excludes Vite and its plugins.

The dependency audit is **not clean**. Two upstream upgrade tracks remain:

- [Zod oversized-collection allocation](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5): retain v3 compatibility for now, with an API guard before validation limiting requests to 10,000 total values / 40 levels, including JSON carried inside legacy strings. The byte limit remains 6 MB and compressed bodies are rejected. Long prose strings are unaffected by the item budget. Rejected writes are explicit and use the existing recoverable-save path. A coordinated Zod v4 upgrade remains planned.
- [TipTap attribute prototype handling](https://github.com/advisories/GHSA-cp6q-959q-f8rh): the app loads prose as HTML and builds known attribute objects rather than accepting arbitrary editor JSON attributes. Production CSP additionally blocks inline scripts/event handlers, objects and framing. Export HTML is sanitized. TipTap v3 needs a separate editor/save compatibility pass; do not force-upgrade it at release time or claim these controls are a library patch.

These are scoped mitigations, not a penetration-test certification. Existing tests continue checking ownership, revisions, recovery, sanitization and cross-origin writes. In-memory authentication throttling is single-instance only; use a shared limiter before scaling. Open registration does not yet include email verification, email password reset, or self-service account deletion. There is no billing, collaboration, AI generation, or public manuscript sharing.

## Backups, operations and rollback

Render's paid PostgreSQL recovery and disk snapshots protect different resources; they are not a single synchronized application backup. Keep the database and the entire uploads directory, **including `.access`**, together when making a paired backup. Restrict any exported backup to maintainers; it includes accounts and writing.

Before a schema change or data operation: stop writes using a maintenance window, let in-flight requests finish, export the database, copy uploads/access metadata, and record the deployed commit and checksums. Restore into new disposable resources first and verify row values and image authorization before considering any replacement of the live database. The automated rehearsal proves this method with synthetic data only.

For a code-only rollback, redeploy the previous verified commit while retaining the database, disk and session secret. Never restore an older database over newer writing merely to roll back UI code. A schema rollback or live data restore is a separate reviewed action.

After launch, check Render health, errors, memory, disk and database capacity, and failed saves during the first tester sessions. There is no recurring monitoring automation configured by this document. Review storage/usage before inviting a substantially larger group. Do not change SDH's resources, workspace plan, notification settings, or permissions as part of QQ maintenance.
