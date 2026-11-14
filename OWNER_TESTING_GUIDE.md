# CAATH Owner Testing Guide

## Start CAATH

1. Open the `V:\CAATH\CAATH` folder.
2. Double-click `START_CAATH_TESTING.cmd`.
3. Keep the small CAATH Owner Testing window open.
4. CAATH opens automatically in your browser.
5. When finished, close the CAATH Owner Testing window.

No domain, Vercel purchase, coding, or command entry is required for this test.

## Test accounts

Use only the controlled dummy accounts prepared in the CAATH Supabase project. Passwords must not be stored in this project folder or displayed inside the app. Keep the temporary passwords in your private password manager or obtain them through the secure reset-password flow.

| Test order | Account | What to check |
| --- | --- | --- |
| 1 | God Admin | Platform overview, firm provisioning, subscriptions, regulatory review and publication |
| 2 | Super Admin | Dashboard, clients, staff, tasks, documents, GST, notices, billing and notifications |
| 3 | Admin | Daily practice management without platform-owner controls |
| 4 | Staff | Assigned work and permitted client records; restricted controls must remain hidden |
| 5 | Client | Only the linked client's approved documents, tasks and communication |

## Owner acceptance route

For every account:

1. Sign in and confirm the displayed name and role are correct.
2. Open every visible sidebar section once.
3. Confirm no red error message appears and no page remains blank.
4. Try one action the role should be allowed to perform.
5. Confirm a restricted action is not shown or is refused safely.
6. Sign out before opening the next account.

Then complete these business flows as Super Admin:

1. Create a dummy client.
2. Create, assign, update and complete a dummy task.
3. Upload a non-confidential sample document and verify client visibility. Check archive, restore, and Trash; use permanent deletion only for a confirmed disposable fixture.
4. Open GST Intelligence, select a client and period, and upload dummy GSTR-2B and purchase-register data.
5. Run reconciliation and inspect exact matches, missing ITC, portal-only invoices, value mismatches and duplicates.
6. Open Operational QA and select **Run Simulation**.

## What counts as a blocker

Stop that particular flow and note the screen name if you see:

- another firm's or another client's private data;
- a staff or client account receiving an administrator control;
- an upload or save action that reports success but does not persist;
- a blank page, repeated loading state or red error;
- a high-severity result in Operational QA.

Do not use real client records, GST portal passwords, production tax files or confidential documents during owner testing.

## Report an issue to Codex

Send a screenshot and one sentence in this format:

`Role: [role] | Screen: [screen] | I clicked: [action] | Result: [what happened]`

Codex will reproduce it, repair it, create a backup after the major correction and verify the flow again.
