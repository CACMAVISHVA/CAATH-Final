# Role and tenant verification — 25 October 2026

User-confirmed payment testing is accepted as complete. This phase tests role/client/firm boundaries with synthetic data, without processing payments or reading customer records.

## Confirmed defects and changes
- Clients could read staff-targeted alerts because a null audience role also acted as a broadcast. Targeted and audience alerts now have separate read conditions.
- A client could read another client's GST return status/applicability in the same firm. Client reads now require an explicit client contact; authorization records remain internal.
- Admin updates could demote SuperAdmin accounts. A private trigger checks both the old target role and the proposed changes and prevents identity reassignment.
- RLS checked the row's firm but allowed client/contact/assignee references from another firm. Private trigger validators now enforce parent/client/user relations on tasks, documents, document vault, client contacts, compliance, GST statuses, profiles and authorizations. GSTIN must match the linked client.
- Soft-deleted active profiles could still resolve role/firm/profile helpers. Those helpers now exclude deleted profiles.
- Browser audit entries could supply another user's name/role. Audit identity now comes from the authenticated active profile; secure vault events require the server path. Existing audit history remains append-only for ordinary users.

Notification creation now generates its ID locally so the sender can create an alert for another user without gaining read access to that user's private alerts. Missing firm scope falls back to the supplied user's firm. Recipient/read-state updates remain possible; notification content and routing cannot be rewritten by ordinary recipients. Role broadcasts still use the existing shared status model; per-user broadcast receipts are separate work.

## Access contract tested
| Actor | Permitted | Blocked |
|---|---|---|
| SuperAdmin | Own-firm client/work records; manager audience alerts; user administration | Foreign-firm references and records; rewriting audit history |
| Admin | Own-firm operations and Staff/Client management | Demoting SuperAdmin/owner records; foreign references |
| Staff | Existing own-firm work access; private alerts addressed to the staff member | Promotion to Admin, foreign-firm records and alert content changes |
| Client | Linked clients, approved linked documents, linked GST/notices, own alerts | Unlinked client records, staff/private manager alerts, internal tasks/monitoring, global alert creation |
| Second firm | Its own records | First firm's records |
| GodAdmin | Intentional platform visibility under existing rules | Vault access remains denied by the hardened edge function |
| Anonymous | Public website | Protected records and privileged RPC access |

Staff's general work access remains firm-scoped, matching the existing policy; password access separately requires explicit credential assignment. This phase does not silently change every work module to assignment-only access.

## Verification and reproduction
73 assertions in tests/roleTenant.preview.sql pass using real Postgres authenticated/anonymous roles, including positive authorized writes and denial tests. All of that script's fixtures roll back. tests/roleTenant.http.py passed 42 checks with real password sign-ins and signed JWTs for six synthetic roles against the isolated preview REST/vault endpoints. Temporary HTTP accounts/data/password file were removed afterward. Setup and cleanup scripts are included; never run them in production. Set caath.preview_test_password in the SQL session to a strong synthetic password before HTTP setup, then supply the same password via an untracked JSON file to the Python verifier. Auth timestamps are required by the sign-in service.

Existing notice lifecycle, PDF isolation/retention and monitoring SQL suites pass. The notice test now verifies that managers see only alerts addressed to them, while a trusted service check still confirms all six lifecycle alerts were created. Preflight and the Node regression suite pass.

Production metadata preflight found zero mismatched client/contact/GST links in the checked tables and zero mismatched task/compliance assignees. No customer data values were retrieved. A transactional production rehearsal passed and rolled back before release. Existing unrelated public security-definer advisor findings remain outside this representative surface audit; these tests do not certify every endpoint/table.
