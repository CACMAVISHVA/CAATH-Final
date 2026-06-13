# GST Anomaly Detection System

## Objective
Detect operationally meaningful GST anomalies during intelligence execution and classify them by severity.

## Detected Anomaly Classes
- Invoice anomaly clusters
- Tax ratio anomalies
- Variance-driven filing anomalies
- Vendor concentration mismatch patterns

## Output Contract
- `anomalyScore` (0-100 confidence-aligned operational score)
- `anomalies[]` with:
- anomaly code
- short summary
- severity (`low` | `medium` | `high`)

## Runtime Integration
- Timeline event emitted at `anomaly_detection` stage
- Risk scores propagated to dashboard and operational actions
- Alertable by notification/workflow systems through generated actions

## Governance
- Explainable finding summaries
- Auditable event trail
- Permission-aware downstream actioning

