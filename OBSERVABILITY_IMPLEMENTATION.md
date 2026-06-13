# Observability Implementation

## Runtime Signals Implemented
- Structured runtime logs via `RuntimeObservabilityService`.
- Metrics for notification dispatch, persistence, queue duration, security risk.
- Runtime event emission logs and runtime audit trace append.

## Correlation
- Correlation IDs are generated for runtime notification/event flows.
- Runtime events include correlation and tenant IDs.

## Monitoring Hooks
- Existing telemetry bus (`caath:telemetry`) receives runtime metrics.
- Runtime health is visible in operational admin usage view.

## Next Steps
1. Add Sentry integration for runtime errors.
2. Export telemetry to backend sink for retention.
3. Add percentile metrics for notification latency and replay lag.
