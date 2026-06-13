# Security Runtime Intelligence

## Implemented Runtime
- Session anomaly scoring entrypoint (`trackAuthAnomaly`).
- Abuse signal scoring entrypoint (`trackAbuseSignal`).
- Tenant risk snapshots with observability metric emission.

## Operational Usage
- Runtime health includes tracked tenant count.
- Security scores can be fed into escalation notifications and admin dashboards.

## Next Steps
1. Bind auth/login failure streams into runtime security ingestion.
2. Persist security signals into dedicated security telemetry table.
3. Add adaptive thresholds by tenant baseline behavior.
