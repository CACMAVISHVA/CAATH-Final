# GST Risk Scoring System

Date: 2026-05-25

## Score Dimensions
- Compliance Score
- Audit Risk Score
- Vendor Risk Score
- Operational Efficiency Score
- Filing Consistency Score

Range: `0-100` (higher is better)

## Signal Inputs
- client health score
- filing delay count
- mismatch count from reconciliations

## Baseline Computation
- Compliance = `100 - late*8 - mismatch*3`
- Audit = `100 - mismatch*6 - late*5`
- Vendor = `100 - mismatch*7`
- Operational Efficiency = `100 - late*5`
- Filing Consistency = `client_health`

All outputs are clamped to `0-100`.

## Interpretation
- `80-100`: stable/low risk
- `60-79`: moderate attention
- `<60`: high operational risk

## Operational Actioning
- Low audit score: run audit preset + escalation review.
- Low vendor score: vendor reconciliation and dependency reduction.
- Low operational efficiency: rebalance filing workload and SLA tracking.
