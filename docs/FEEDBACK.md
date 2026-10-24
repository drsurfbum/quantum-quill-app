# Alpha feedback

Signed-in testers can select **Feedback** in project navigation or the dashboard. A private dialog offers bug, confusing experience, idea, and other reports. It stays over the current workspace, so opening or closing it does not navigate away or reset the editor. The existing autosave, recovery, and conflict flow remains active.

Reports include a summary, details, an area selected by the tester, and the submitting account ID. Browser/window information is optional and off by default. Follow-up by account email is opt-in. No prose, project name, project ID, screenshots, URL/query strings, logs, cookies, or tokens are gathered automatically. Testers should describe problems using sample text.

A successful submission returns a report number. **My recent reports** shows that writer’s latest 50 reports and their review status. Failed submissions keep the form text; closing it keeps an account-scoped draft in the current browser tab. Switching accounts remounts the dialog and cannot reveal another writer’s draft/history. Twenty new reports per account per day are accepted. Retrying a submission uses the same request ID so a lost response does not create duplicate reports.

## Maintainer review

Reports are private database records, not GitHub issues. There are no automatic emails or a promised response time. The maintainer can ask Codex to review alpha feedback through the connected Render Postgres tool, or use authenticated database tooling. No unauthenticated or general-user endpoint lists other writers’ reports.

Read the inbox without joining account/contact details unless needed:

```sql
SELECT id, category, summary, details, area, device, allow_contact, status, created_at
FROM feedback_reports
ORDER BY created_at DESC
LIMIT 100;
```

Review new reports for reproducible bugs, writing/data-loss problems, confusing controls, and feature ideas. Group duplicates by their report numbers. Reproduce with synthetic content, preserve private reports, and only copy a sanitized summary to the public roadmap/GitHub when appropriate. Contact a reporter through their account email only when `allow_contact` is true and a human authorizes sending that message.

After review, an authorized maintainer may move a report through `received`, `reviewing`, `planned`, or `resolved` using database administration. Writers see the resulting status in their report history. Status changes do not send messages. An admin UI and optional notifications can follow later; do not create a recurring monitor without a user request.

## Storage and migration

`node scripts/migrate-feedback.mjs` is a separate, additive migration run after the original alpha initializer. It requires the alpha marker and explicit `QQ_DATABASE_PURPOSE=fresh-alpha`. It creates only `feedback_reports` and a checksum ledger, refuses an untracked existing table, and repeats safely under the alpha advisory lock. The original `deployment/alpha-schema.sql` remains unchanged. It is not a migration authorization for a recovered local database.

Feedback is included in database backups and the synthetic paired restore rehearsal. Reports and contact details must never be committed, exported into public roadmap assets, or printed in routine logs.
