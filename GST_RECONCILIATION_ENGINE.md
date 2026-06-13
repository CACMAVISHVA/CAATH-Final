# GST Reconciliation Engine

## Scope
The reconciliation engine executes governed GST matching workflows using normalized datasets, not raw uploads.

## Pipeline
1. `GSTR2B_JSON` + `PURCHASE_REGISTER` lineage is resolved from storage envelope.
2. Invoice matching computes:
- matched invoices
- missing ITC invoices
- excess ITC invoices
- duplicate invoice clusters
- vendor mismatch findings
3. GSTR-1 vs GSTR-3B variance computes turnover/liability variance and discrepancy flags.
4. Results are attached to execution timeline and workflow actions.

## Operational Outputs
- Reconciliation summaries for dashboard widgets
- Mismatch alerts
- Workflow actions: review/escalation/reminder
- AI reconciliation narratives

## Governance
- Traceable via execution timeline events
- Explainable via finding-level reasons and severity
- Permission-aware actions remain recommendation-first

