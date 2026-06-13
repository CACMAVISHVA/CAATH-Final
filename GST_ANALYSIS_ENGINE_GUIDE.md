# GST Analysis Engine Guide

Date: 2026-05-25

## Purpose
Run GST intelligence as an operational workflow engine, not a static report form.

## Engine Inputs
- `clientId`
- `financialYear`
- `filingMode` (`monthly|quarterly|annual|custom`)
- `filingPeriod`
- `presetId`
- `moduleIds[]`

## Preset Layer
Presets define default module bundles for common workflows:
- Quick Health Scan
- Monthly Compliance Review
- ITC Deep Analysis
- Audit Preparation Mode
- Litigation Defense Mode
- CFO Intelligence Report
- AI Risk Scan

## Module Layer
Modules are categorized and selectable across:
- compliance
- itc
- sales
- vendor_risk
- audit
- cash_flow
- operational
- eway_bill
- ai

## Execution Output
- Client GST context
- Snapshot readiness + reconciliations
- Risk score vector
- Governed AI insights
- Realtime/trend/confidence indicators
- Telemetry/audit execution trail

## Operational Usage
1. Select preset for workflow intent.
2. Add/remove modules for case-specific depth.
3. Execute engine.
4. Convert high-priority findings into tasks/escalations/notices.
5. Track follow-up in operational dashboards.
