# Quantum Quill

Quantum Quill is a local writing and world-building app built with React/TypeScript, TipTap, Express, and PostgreSQL. The recovered Replit data and original backups are preserved.

**Current status:** a functional local alpha with the writing workspace, interactive Story Bible cards and reviewed scene connection scanning. See the [feature roadmap](https://drsurfbum.github.io/quantum-quill-roadmap/), [workspace integration](docs/WORKSPACE_INTEGRATION.md), and [connection scanner](docs/SCENE_STORY_BIBLE.md). The [local stabilization closeout](docs/STABILIZATION_CLOSEOUT.md) describes the reliability foundation; older audits contain historical limitations that may now be fixed.

**Standing workflow:** commit and push each completed feature to its feature branch after appropriate checks; merging remains separate. See [development workflow](docs/DEVELOPMENT_WORKFLOW.md) and [agent instructions](AGENTS.md).

## Run locally

Use Node 24. On the configured Mac, open `Start Quantum Quill.command` or run:

```sh
npm ci --ignore-scripts
npm run dev:local
```

The app is at http://127.0.0.1:5055. See [local setup](LOCAL_SETUP.md) for the recovered database and uploads. Do not run `db:push` against recovered writing. Backups, environment settings, uploads, and local databases are excluded from Git.

## Current workflows

- Start a project with the recoverable New Project Wizard, or go directly to writing.
- Storyboard plot points → Blueprint Wizard → Outline scenes → scene story beats → Write prose. Planning is optional; original outline notes remain available.
- Write with formatting controls, reusable Quill/custom styles, protected autosave, account-scoped draft recovery, and explicit conflict review.
- Organize manuscript chapters/scenes with persisted ordering and safe scene moves.
- Export Word, HTML, text, EPUB, or original-record JSON; Preview supports browser printing and Save as PDF.
- Build seven Story Bible entry types with structured fields, shared relationships, backlinks, search, and images scoped to their projects.

Sharing, AI, graph/timeline views, and the legacy whiteboard canvas are not active features. Render deployment remains a separate step after the security/deployment gates in the closeout report.

## Validation and recovery

```sh
npm run check
npm test
npm run build
```

[Testing instructions](README-Testing.md) describe synthetic fixtures and disposable PostgreSQL rehearsals. Stop the local app before `bash scripts/backup-local.sh` to create a private paired database/uploads backup.

## Architecture and project history

- `client/src/`: pages, editors, protected save queues, recovery UI.
- `server/`: authenticated project APIs, revisions, transactional planning/organization, export and file access.
- `shared/`: data contracts, validation, taxonomy, relationships and writing styles.
- `docs/`: [original audit](docs/RESTART_AUDIT.md), [draft protection](docs/DRAFT_RECOVERY_AND_DATA_INTEGRITY.md), [data contract](docs/DATA_CONTRACT.md), [relationships](docs/SHARED_RELATIONSHIPS.md), [scene workflow](docs/SCENE_OUTLINE_WORKFLOW.md), and [Antigravity comparison](docs/ANTIGRAVITY_COMPARISON.md).
