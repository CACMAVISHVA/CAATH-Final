# GST Audit Risk Architecture

## Purpose
Convert reconciliation and variance outcomes into audit exposure intelligence for proactive compliance control.

## Inputs
- Reconciliation gap signals
- Duplicate/fake invoice indicators
- Vendor mismatch concentration
- GSTR-1 vs GSTR-3B variance

## Scoring
- `auditRiskScore`: overall scrutiny probability proxy
- `refundRiskScore`: refund-linked review pressure
- `scrutinyTriggers`: explainable risk statements
- `complianceWeaknesses`: operator-readable weakness labels

## Execution Design
- Runs inside `src/domains/gst-intelligence/execution-engine/executionEngine.ts`
- Generates auditable timeline entries
- Feeds workflow generation for audit-prep review actions

## Safety
- Recommendation outputs are governed and non-destructive
- Final compliance decisions remain user-approved through workflow governance

