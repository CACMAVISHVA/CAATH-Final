# Production reconciliation - 24 October 2026

User explicitly authorized making the changes live. This supersedes the previous no-production restriction for this release; automated filings remain disabled.

Preflight found current live deployment dpl_6z8RqTyXjf6y1Lr3umWnYsb5Y68J was uploaded outside the GitHub main branch. Deployed file hashes match the older CAATH_FOUNDING_BETA checkout. Restored verified production files with three-way reconciliation against main baseline 9c28e59, preserving the notice/CRM/PDF changes. Full Vercel file manifest contained 1,292 entries. No customer data was copied.

Restored existing GST Practice Hub/control matrix, bulk onboarding, accounting, templates, practice tools, staff invitations, password recovery, private document access, marketing pages and server integration routes. These are existing capabilities, not newly completed competitor gaps. GSTR-7 support, atomic applicability updates, improved notice AI drafting and stop-on-receipt document follow-ups remain incomplete.

Removed browser provider-key injection. The unused legacy document-extraction export now explicitly reports unavailable until protected server extraction is configured. No provider key is embedded in the frontend. Unified-plan frontend feature defaults remain disabled until explicitly configured; inactive/missing subscriptions fail closed. Existing entitlement repository stubs remain a release review item.

Validation: type-check and build pass; 17 notice/PDF tests, 3 accounting tests and 5 recovered GST/import tests pass. npm audit reports zero vulnerabilities after compatible dependency fixes. Reconciled preview server routes have a preview Supabase URL and blank service credential, preventing accidental access to production. No real mailboxes or filing automation enabled.

Production has not been changed by reconciliation. Required before release: reconciled browser regression, migration rehearsal against production-equivalent schema/policies, server configuration validation, production backup availability and staged-production smoke tests. Previous production deployment above is the rollback target; retain additive schema on code rollback rather than deleting case/audit records.
