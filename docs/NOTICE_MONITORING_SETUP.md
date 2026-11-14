# Recovered monitoring integration — current branch

Recovered from the 7 October development ZIP. Reuse the existing GST GSP connections/jobs for an eventual provider adapter; notice_monitor_sources represents intake authentication/heartbeat, not another GST connection registry. Review calls the same atomic create_notice_intelligence RPC used by manual intake.

Current status (24 October 2026): schema applied and notice-intake Edge Function deployed ONLY to isolated Supabase preview ixwrpetvsyewdpdwdxhi. Live HTTP verification passed for invalid credentials, paused-source rejection, authenticated intake, duplicate retry and heartbeat. Synthetic test sources are paused after verification. No real mailbox, scheduled sweep or external email delivery is active. Sources start PAUSED. Outgoing delivery must use each recipient's registered CAATH account email and requires an approved email provider.

Current validation: 15 Node tests and 4 Python tests pass; TypeScript check and production build pass. Both preview rollback SQL suites passed, covering tenant/role boundaries, token protection, duplicate suppression, review/task/history integration and existing CRM/notice regression. Historical checkpoint counts below are not current results.

Security review: source keys and alert receipts intentionally have no browser RLS policies or grants. Existing public SECURITY DEFINER helpers remain flagged for separate review; production readiness is not asserted. The function validates its own source-specific bearer token; only this function has platform JWT verification disabled. See https://supabase.com/docs/guides/functions/auth.


Apply 20261023165825_recovered_notice_monitoring.sql only after the current Phase 1 migrations. Do not apply the old 7 October migrations alongside this migration.

## Historical setup reference (not current validation evidence)

### Original checkpoint notes

## What is built

CAATH can ingest incoming notice events, match watched clients using GSTIN/PAN, persist a review inbox and immediately create in-app notifications for Admin/SuperAdmin and the matched client's active assigned staff. Duplicate delivery does not create repeated alerts. Review confirms details before creating a notice and its task in one transaction. Hourly database sweeps create deadline and failed/stale monitoring alerts, once per day per alert key.

This checkpoint includes the earlier GST Control Centre. It is development source, not a live deployment. Production database and portal accounts were not changed.

## Coverage boundary

The email worker monitors a configured IMAP mailbox/folder. It cannot discover a portal-only notice that was never delivered or forwarded to that mailbox. Portal/GSP intake accepts an authenticated structured event from an authorised provider; the provider adapter/contract is not included. No government portal credentials, CAPTCHA bypass, scraping, or automatic reply submission is implemented.

Matching uses identifiers appearing in the message text or structured payload. Encrypted PDFs, image-only documents and notices lacking GSTIN/PAN go to an unmatched review inbox. Attachments are not downloaded or OCR'd. Sender allowlisting filters intake but is not proof of government authenticity: verify the notice in the relevant official portal before acting. In-app notifications are implemented; outgoing email/WhatsApp/SMS delivery is not.

## Source and data backups

Starting notice-work commit: `076add6` (GST checkpoint); local backup branch `backup/before-notice-alerts-2026-10-07`.
Original source before both batches: `9c28e5903b2dfded39a8e37b6327174b548fdd34`.
Source-only before/after ZIPs exclude generated files and credentials. They are not a database backup. Before applying migrations, obtain and verify a database backup. Do not execute the full `supabase/schema.sql`: it contains destructive DROP statements.

## Staging setup

1. Enable repository write access for the GitHub integration. Preserve the starting revisions remotely, push `feat/gst-control-centre`, create a review PR. Do not merge/deploy production without release approval.
2. Apply `20261007163931_gst_control_centre.sql` if the GST tracker is being enabled; then apply `20261007165524_notice_monitoring.sql` to staging. The notice migration can run without the GST migration.
3. Deploy the `notice-intake` Supabase Edge Function. `supabase/config.toml` disables user-JWT verification for this function only; the handler instead validates a source-scoped 256-bit-equivalent random bearer token using its stored SHA-256 hash. Existing functions keep their settings. Service-role credentials remain server-side.
4. Open Notice Center as Admin/SuperAdmin. Under Automatic notice monitoring, enable each client's GST and/or Income Tax watch. Verify their GSTIN/PAN in Client Master first.
5. Create an Email worker intake source. Copy its one-time token to the protected worker environment. It is not stored in browser storage. Pause/recreate a source to revoke/replace a lost or exposed token.
6. Run `workers/notice_email_worker.py` on an always-on Ubuntu/VPS machine using the environment below. It uses Python's standard library, TLS and an SQLite UID checkpoint. Use a dedicated folder and approved sender addresses. Forward clients' official notice emails to that monitored folder if needed.
7. Schedule worker execution every 5–15 minutes with systemd/cron, using the same absolute state database path every run. Protect the environment file with mode 600. Do not commit credentials. A success heartbeat is sent only after the mailbox batch is fully processed. A failed run exits nonzero and retains the failed message for retry. More than 500 queued messages are processed across successive runs; coverage remains unconfirmed until caught up.
8. Schedule `SELECT public.sweep_notice_alerts();` hourly using Supabase Cron, under a privileged scheduler role. No browser has execute access. If pg_cron is enabled and the job does not already exist, one example is:

```sql
SELECT cron.schedule('caath-notice-alerts-hourly', '0 * * * *',
  $$SELECT public.sweep_notice_alerts();$$);
```

The cron job is not installed by the migration, to avoid unexpected production scheduling. Sweeps alert Admin/SuperAdmin when a source has never completed a check or exceeds twice its expected interval (default interval 60 minutes). Upcoming reply deadlines (within 7 days) and overdue unfiled replies alert admins and assigned staff. Filed/Closed/Archived replies are excluded; hearings and appeal deadlines require the future case timeline module.

## Worker environment

```text
NOTICE_INTAKE_URL=https://<project-ref>.supabase.co/functions/v1/notice-intake
NOTICE_SOURCE_TOKEN=<one-time-token>
NOTICE_IMAP_HOST=<mail-provider-imap-host>
NOTICE_IMAP_PORT=993
NOTICE_IMAP_USER=<dedicated-notices-mailbox>
NOTICE_IMAP_PASSWORD=<provider-app-password-or-approved-mail-credential>
NOTICE_IMAP_FOLDER=INBOX
NOTICE_SENDERS=<approved-sender-1>,<approved-forwarding-address>
NOTICE_STATE_DB=/absolute/protected/path/notice-worker.sqlite3
NOTICE_INITIAL_LOOKBACK_DAYS=7
```

OAuth-only mail providers need a provider-specific adapter: this worker uses IMAP LOGIN. Do not disable TLS or mailbox security to make it work. The first run processes the lookback window; later runs use mailbox UID/UIDVALIDITY checkpoints. Changing sender filters or client watches does not automatically backfill skipped older messages. For controlled backfill, use a new state database and suitable lookback; inbox duplicates are suppressed.

## Authorised portal/GSP event contract

POST the JSON below to the intake URL with `Authorization: Bearer <source-token>` from a server-side connector. Do not supply firm/client IDs: server context comes from the token and watched identifiers.

```json
{
  "externalId": "provider-stable-event-id",
  "department": "GST",
  "identifier": "33ABCDE1234F1Z5",
  "noticeNumber": "official-notice-reference",
  "subject": "New GST notice",
  "body": "Relevant notice summary",
  "issuedDate": "2026-10-07",
  "deadline": "2026-10-21",
  "evidenceUrl": "https://<approved-evidence-location>"
}
```

For Income Tax, set department to `Income Tax` and identifier to PAN. Dates are optional at intake, must be valid ISO dates if supplied and must be confirmed during review. Send `{"operation":"check_complete"}` only after a complete source scan; `{"operation":"check_failed"}` on failure. Retry transient errors with the same externalId. Input is limited to 64 KiB. Evidence URLs are displayed for human review; the server does not fetch them.

## Validation completed

- 18 TypeScript unit/HTTP tests pass (12 notice tests plus 6 GST tracker tests).
- 4 Python email parsing/checkpoint tests pass; worker compiles. The checkpoint test confirms failed delivery does not advance the UID and retries retain the same event ID.
- PostgreSQL/PGlite integration checks pass: token confidentiality, per-firm matching, duplicate suppression, atomic approval/task creation, cross-tenant and staff restrictions, paused sources, idempotent alert sweeps.
- Vite production build passes. TypeScript retains the six verified baseline billing/admin errors; new notice code adds no TypeScript errors.
- Deno runtime check could not complete because network access for its runtime download was cancelled. HTTP handler behavior was tested through its injected backend interface.
- Browser, live mailbox, deployed Edge Function and staging Supabase end-to-end flow remain unverified until connected/deployed.

## Release checklist

Use test notices for two separate firms and watched clients; confirm new alert → inbox → reviewed notice → linked task. Retry identical event twice and verify a single inbox item/alert set. Test wrong token, paused source, missing identifier, two matching identifiers, corrupt dates, failed worker check and stale heartbeat. Verify cron notifications reach staff/admin and stop after a reply is Filed. Confirm source-secret tables are inaccessible to anon/authenticated browser roles. Run Supabase advisors on staging after migration and resolve issues before release.

## Rollback

Restore source through a reviewed revert to the backup commit. Pause sources and stop the worker/cron job before schema rollback. Export inbox, watches, sources and notices created during monitoring before any destructive rollback. Retain audit/review history. Existing notice records are preserved by this migration.
