# CAATH GST Product Benchmark (Optotax public features)

This document benchmarks publicly advertised capabilities only. CAATH will implement original workflows and user experiences; it will not copy proprietary code, content or design.

## Already present in CAATH

- Multi-client and multi-GSTIN practice workspace
- GSTR-1, GSTR-3B, GSTR-2A/2B and books upload/reconciliation engine
- Supplier, rate, period and ITC-risk analysis
- Notice lifecycle, documents, deadlines, assignments and audit logs
- Role-based access, tenant isolation, notifications and regulatory updates
- Mobile-responsive cloud workspace and government portal launcher
- SERA compliance assistant concept and governed AI foundation

## Phase 1 delivered

- Return workpapers for GSTR-1, GSTR-3B, GSTR-9 and CMP-08
- Monthly, quarterly, annual and composition tracking
- Filing readiness states and validation-error register
- Multi-client GST challan register with dues and payment states
- Litigation/case register with forum, stage, owner, disputed amount and response deadline
- Overdue-action command centre with tenant-scoped security policies
- Fourteen CSV report packs covering risk, ITC, variance, vendor, audit, anomaly, workflow and processing evidence
- Automatic three-day compliance reminders for return, challan and case deadlines

## Controlled integration backlog

- GST portal data auto-fetch, ARN/status sync and direct GSTR filing
- GST challan creation/payment and historical challan sync
- Notice auto-fetch and order/reply sync

These require a GSTN-authorised GSP/ASP integration, explicit customer consent, production credentials, rate-limit/error controls and a legal/security review. CAATH must not present these as active until certification and end-to-end production verification are complete.

## Planned product depth

- Expanded downloadable reconciliation report catalogue (Excel/JSON/PDF)
- Vendor filing behaviour and ITC follow-up automation
- Return amendment audit trails and filing pack generation
- Hearing-specific calendar and team-capacity views
- Cross-GSTIN portfolio analytics and capacity planning
- SERA retrieval over approved acts, notifications, judgments and firm workpapers
- Optional enterprise SSO and enhanced disaster-recovery evidence

## Security decision

CAATH does not store GST portal passwords, OTPs or CAPTCHAs in the lifecycle module. A credential vault will only be considered as a separate, security-reviewed product with strong encryption, access approvals, key rotation and auditable retrieval.
