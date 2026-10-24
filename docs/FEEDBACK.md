# Alpha feedback

Signed-in testers can select **Feedback** in project navigation or the dashboard. A private dialog offers bug, confusing experience, idea, and other reports. It stays over the current workspace, so opening or closing it does not navigate away or reset the editor. The existing autosave, recovery, and conflict flow remains active.

Reports include a summary, details, an area selected by the tester, and the submitting account ID. Browser/window information is optional and off by default. Follow-up by account email is opt-in. No prose, project name, project ID, screenshots, URL/query strings, logs, cookies, or tokens are gathered automatically. Testers should describe problems using sample text.

A successful submission returns a report number. **My recent reports** shows that writer’s latest 50 reports and their review status. Failed submissions keep the form text; closing it keeps an account-scoped draft in the current browser tab. Switching accounts remounts the dialog and cannot reveal another writer’s draft/history. Twenty new reports per account per day are accepted. Retrying a submission uses the same request ID so a lost response does not create duplicate reports.

## Maintainer review

Reports are private database records, not GitHub issues. Authorized maintainers can open **Admin inbox** from the dashboard footer or the Feedback window. It opens a separate QQ tab so the writing workspace stays in place.

The inbox supports summary/detail search, category/status filters, newest-first pagination (50 reports per page), full report details and optional browser information. Choose **Received**, **Reviewing**, **Planned** or **Resolved**, then **Save status**. The tester sees that status in **My recent reports**. A stale update is rejected and the latest status is refreshed for review. Submitted text cannot be edited or deleted from the inbox.

Reporter email is returned only when the tester opted in to follow-up. There are no automatic emails, scheduled monitoring, or promised response times. Obtain human authorization before sending a message. Reproduce issues with synthetic content, and only copy a sanitized summary to the public roadmap/GitHub when appropriate.

### Provisioning access

`QQ_FEEDBACK_ADMIN_USER_IDS` is a server-only, deployment-specific comma-separated allowlist of existing numeric account IDs. Missing, blank or malformed configuration denies all inbox access. Registration cannot set this permission; usernames, emails and signup order never confer access. `/api/user` exposes only the current account’s capability, and every admin API independently checks the allowlist. Revocation takes effect when the service starts with the updated configuration; existing cookies do not preserve admin privileges.

Before enabling access, the human owner must identify the intended account. Verify its ID against the target database. Configure only the QQ service through Render’s environment-variable merge operation (`replace: false`), then deploy the reviewed commit. Keep the value out of source control and public assets. This variable is deliberately managed on the service, outside the Blueprint; Blueprint sync preserves omitted variables. Do not add temporary test accounts to the production allowlist.

There is no self-service admin promotion or general role editor. Admin access covers feedback only and does not bypass manuscript/project ownership. The API rejects anonymous, ordinary-account, cross-origin and stale-account requests; responses use `Cache-Control: no-store`. The UI clears account-scoped queries on sign-out/account switches.

The authenticated Render Shell remains an emergency operator fallback; external database access stays disabled. No new database migration is required for the inbox: it uses the original feedback table and its constrained status field. The original feedback migration and schema checksums are unchanged. Rolling back the app keeps all reports and saved statuses intact.

## Storage and migration

`node scripts/migrate-feedback.mjs` is a separate, additive migration run after the original alpha initializer. It requires the alpha marker and explicit `QQ_DATABASE_PURPOSE=fresh-alpha`. It creates only `feedback_reports` and a checksum ledger, refuses an untracked existing table, and repeats safely under the alpha advisory lock. The original `deployment/alpha-schema.sql` remains unchanged. It is not a migration authorization for a recovered local database.

Feedback is included in database backups and the synthetic paired restore rehearsal. Reports and contact details must never be committed, exported into public roadmap assets, or printed in routine logs.
