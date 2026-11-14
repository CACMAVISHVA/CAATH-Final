# CAATH User Manual

## Opening CAATH

- Visit `https://caath.in` to view CAATH, compare plans, purchase access, renew, or sign in.
- Existing customers should select **Login**.
- New firms select **Start free trial**, create an account without choosing a plan, and wait for God Admin approval. Approval starts a 15-day trial automatically.
- Renewing firms should select **Renew** and sign in; CAATH then opens subscription management.
- The protected workspace is available at `https://caath.in/app` after authentication.

Version: Release Candidate — 20 September 2026

## 1. Safe use

CAATH is currently in controlled testing. Use dummy clients, sample documents, and anonymized GST files only. Never upload real client documents, GST portal passwords, income-tax credentials, bank details, or production data during testing.

Open the current public testing release at `https://caath.in`.

Vercel may first request access to the protected preview. After that, CAATH shows its own sign-in page. These are two different sign-ins.

## 2. Signing in and recovering access

1. Enter the email address and password of your CAATH account.
2. Select **Remember this device** only on a private computer.
3. Select **Sign In**.

If the password is forgotten, select **Forgot password?**, enter the registered email, and follow the secure email link. Never share a reset link or one-time code. When finished, use **Sign Out**, especially on a shared computer. If the role or firm shown after sign-in is wrong, stop and report it before entering data.

## 3. Roles and responsibilities

### God Admin

The platform owner. God Admin manages firms, provisioning, subscriptions, platform notices, global audit, usage, and the regulatory publication workflow. Regulatory updates are reviewed, verified, and published before Super Admin users receive them.

### Super Admin

The owner of one professional-practice workspace. This includes CA, CMA, CS, ITP and STP practices. Super Admin manages clients, users, staff, work, documents, GST, notices, approvals, billing, security settings, audit review, and published regulatory updates for the firm or practice.

### Admin

A practice manager. Admin coordinates permitted client, task, document, notice, approval, staff, payroll, notification, audit, and operational-quality workflows. Platform-owner and selected commercial controls remain unavailable.

### Staff

A team member. Staff works on assigned clients and permitted operational records. Staff cannot use owner-only administration, subscription, security, or platform controls.

### Client

A portal user. Clients can see only their linked client workspace and approved information. A client must never see another client's or another firm's data.

## 4. Super Admin daily workflow

### Start of day

1. Open **Dashboard** for the overall position.
2. Open **Live Workspace** for urgent tasks, approvals, notices, and active work.
3. Review **Notifications** and **Notice Center**.
4. Open **GST Practice Hub** for GST client authorization, return status, local reconciliation and downloads.
5. Use **Task Board** to assign or rebalance work.

### Add a client

1. Open **Client Master** and select the add-client action.
2. Enter only the required identity and contact fields.
3. Review PAN/GSTIN carefully before saving.
4. Reopen the client and confirm the information persisted.

### Create and manage work

1. Open **Task Board**.
2. Create a task with a clear title, client, owner, priority, and deadline.
3. Add the context and checklist needed by the assignee.
4. Move the task through its permitted stages as work progresses.
5. Use comments and activity history for handovers.
6. Complete work only after evidence and approvals are attached.

### GST Practice Hub

1. Open **GST Practice Hub** and select the client and financial year.
2. In **Access & Consent**, record that the firm holds valid client authorization before opening the GST portal or handling return data. CAATH never stores the GST portal password, OTP or CAPTCHA.
3. Use **Return Status** to maintain GSTR-1, GSTR-3B, GSTR-2A, GSTR-2B, GSTR-9, GSTR-9C and CMP-08 period status.
4. Use **Sales Reconciliation** to choose a sales register and a GSTR-1 invoice-wise export in CSV or XLSX format. The raw files are processed in the browser and are not uploaded by this feature.
5. Download the exception report to review missing invoices and taxable-value mismatches.
6. Use **Downloads** for an Excel-compatible status register. Official GST return PDF, JSON and invoice-wise downloads remain unavailable until CAATH's authorised GSP connection is activated.
7. Use **Open official GST portal** for the government site. Complete credentials, CAPTCHA, OTP and final submission only on the official portal.

For testing, use anonymized files. A legacy `.xls` file must first be saved as `.xlsx`.

### Manage documents

1. Open **Document Vault** and select the client.
2. Upload a safe file and add a meaningful name and category.
3. Link it to the related task, notice, invoice, or approval where available.
4. Set client visibility deliberately.
5. Confirm the document opens after upload.
6. Use the application archive/delete workflow; do not manipulate storage directly.

Archived documents and Trash are separate views and remain filtered to the selected client. Permanent deletion is irreversible, so use it only for a confirmed disposable file or under an approved retention/deletion rule.

### GST reconciliation

1. Open **GST Intelligence** and select the correct client and return period.
2. Upload supported, anonymized GSTR-2B and purchase-register files.
3. Review validation messages before running reconciliation.
4. Inspect exact matches, missing ITC, portal-only entries, value mismatches, and duplicates.
5. Resolve or assign exceptions and preserve supporting evidence.

CAATH output is decision support. A qualified professional must verify statutory conclusions before filing.

### Notices and approvals

Record every notice in **Notice Center** with the correct client, reference number, dates, deadline, owner, and status. Link its evidence and tasks. Route sensitive or final actions through **Approvals**, and record the decision so it remains auditable.

### Regulatory updates

Super Admin sees updates after God Admin verification and publication. Review the official source, effective date, affected Act/domain, and operational impact. Create internal work where an update changes a client obligation. CAATH summaries do not replace the official notification or professional judgment.

### Staff and access

Use **User Management** and **Staff Management** to manage permitted team accounts. Give the least privilege needed, disable access promptly when responsibility changes, and review **Login Activity**, **Security**, and **Audit Log** regularly.

## 5. God Admin publication workflow

1. Open **Regulatory Publisher**.
2. Review the official source, title, Act/domain, issue date, effective date, summary, and impact.
3. Reject incomplete, duplicate, unverified, or misleading content.
4. Publish only after verification.
5. Confirm the update appears for Super Admin users and the publication action appears in audit history.

God Admin also monitors firm activation, subscriptions, usage, system notices, and global audit. Firm data should be opened only when required for authorized platform operations.

### Suspend or reactivate a firm

Open **Overview → Registrations & Firms**. Select **Suspend**, enter a clear reason of at least 10 characters, and confirm. A normal suspension starts a 30-day grace period: the firm can continue working and export its records, while CAATH shows a warning and the planned access-block date. No client or firm data is deleted. For fraud, account compromise or serious misuse, select **Immediate security suspension** to block access at once. Both choices record the reason, time and God Admin approver. Select **Reactivate** to restore normal status and cancel the block. Check the firm name carefully before confirming either action.

### Subscription payment and activation

After approval, Super Admin opens the dedicated **Subscription** module to see the 15-day trial status, trial end date, current subscription, limits, payment requests and invoices. The firm may choose a paid plan during the trial. Existing subscribers use the same module to renew or upgrade. Cashfree handles payment details outside CAATH. After a successful payment, CAATH verifies the provider status and places the subscription in the God Admin queue. Payment alone does not activate the workspace: God Admin must confirm that Cashfree shows **PAID**, approve the request, and then CAATH activates the plan and creates the subscription invoice. While the Cashfree account is under live KYC review, the checkout is clearly marked as sandbox testing and cannot collect real money. Manual UPI proof remains a fallback and requires bank/UTR verification.

## 6. Client portal rule

If a client can see another client's name, file, task, or message, stop immediately, take a safe screenshot, sign out, and report it as a critical privacy incident.

## 7. Government Portal Login Desk

Super Admin, Admin, and Staff users can open **Government Portals > Portal Login Desk**.

1. Search for the client by name, PAN, GSTIN, or other identifier.
2. In that client's row, choose GST, Income Tax, MCA, or TRACES.
3. Check the status badge. “Ready” means CAATH has the relevant client identifier; “missing” means the identifier should be corrected in Client Master.
4. Select **Login**. CAATH records the launch and opens the official government website in a new browser tab.
5. Enter the portal username, password, OTP, and CAPTCHA only on the official government website.

CAATH does not store or auto-fill government portal passwords, OTPs, or CAPTCHAs in this desk. Staff can see only clients assigned to them.

## 8. Operational QA

Super Admin or Admin can open **Operational QA** and run the simulation. A release-quality result is all checks passed with no high-severity governance issue. QA-generated dummy records may be archived using the provided controls.

## 9. Troubleshooting

- **Blank or endless loading:** refresh once. If it continues, note the page and time.
- **Protected Area:** the role does not have permission; do not attempt to bypass it.
- **Save succeeds but data disappears:** treat it as a blocker.
- **Upload fails:** confirm the file is supported and contains no confidential test data.
- **Wrong firm or role:** sign out immediately and report it.
- **Reset email missing:** check spam, confirm the address, and wait before requesting one more link.

Report problems as:

`Role: [role] | Screen: [screen] | I clicked: [action] | Result: [what happened]`

Never include passwords, one-time codes, access tokens, tax credentials, or confidential client data.

## 10. Automatic official news — God Admin

Open **Platform Intelligence → Regulatory Publisher → Automatic news inbox**.

1. CAATH checks ICAI, RBI, CBIC GST, CBIC Customs, the CBDT/Income Tax latest-news page and practice-related PIB sources daily. Use **Fetch latest now** for an extra check; each source has a 10-minute cooldown.
2. Check the source-health cards. An error or “Not yet confirmed” means coverage is incomplete, not that there are no updates.
3. Select **Review item**, open the official source and check its dates, applicability and relevance.
4. Write the short practice note you want users to see and tick the verification checkbox. Choose **Approve & publish to all**. Active Super Admins receive an in-app notification and can read the published update.
5. Alternatively, enter a rejection reason and choose **Reject publication**. The rejected item stays in history and is not reimported.

Only you can read the collection inbox. No item is automatically approved. The first version monitors selected feeds and their latest available entries, with a 90-day lookback where dates are supplied; it is not a complete legal research database. MCA, state GST, tribunal/court judgments and updates outside these feeds still require manual source checks. Imported headlines are not legal advice. Email and WhatsApp delivery are not included.

## 11. Password-reset completion

After opening a valid recovery email, enter and confirm your new password, then save. CAATH displays **Password reset successfully**, ends the recovery session and returns to the login page. Sign in with the new password. An expired or used link offers a new reset request; failed updates keep the form open with an error.

## 12. Template Studio

Open **Work → Template Studio**, choose a document, enter the company and engagement details, and select **Download full Word draft**. CAATH generates the `.docx` locally in the browser and does not store the entered template data. Always review applicability, facts, dates, resolutions and legal wording before signing or filing.

## 13. Client Accounting add-on

Open **Work → Client Accounting**. A Super Admin can choose a client and request either **Client Books** or **Client Books Pro**. The request does not activate service or create a charge. God Admin reviews the request, sets the monthly price and activates the client workspace. Admin and Staff can view workspace status but cannot request or activate paid access.

## 14. GST compliance lifecycle and partner connection

Open **GST Intelligence → Compliance Lifecycle** to manage return workpapers, challans, notices/litigation, reminders and client-level GST reports. CAATH can analyse supported uploads and prepare work without a direct GST portal connection.

The **GST Partner Connection** area is intentionally locked until CAATH selects a GSTN-empanelled GSP. A Super Admin or Admin may review readiness and record GSTIN consent. Sandbox and production are separate; production filing cannot be enabled accidentally. Never paste GST portal passwords, OTPs or provider secrets into CAATH forms or support messages.

## 15. Invoice logo and templates

Open the invoice composer, select the client and invoice template, then upload the firm's permitted logo. The selected logo appears automatically at the top of the generated invoice. Review the preview before download and confirm the firm name, GSTIN, place of supply, tax split, totals and payment details. Use only a logo the firm is authorised to display.

## 16. Pilot-launch checklist for the owner

1. Use `https://caath.in/login`; local testing is not required for ordinary users.
2. Approve only known test registrations from God Admin.
3. Keep Cashfree in test/sandbox handling until Cashfree confirms live KYC and CAATH completes a controlled payment rehearsal.
4. Do not enable GST API filing until an empanelled GSP passes sandbox certification.
5. Stop testing immediately if one firm or client can see another firm's information.
6. Record issues without passwords, OTPs, tax-portal credentials or confidential client documents.
