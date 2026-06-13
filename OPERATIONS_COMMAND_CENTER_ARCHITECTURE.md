# Operations Command Center Architecture

Date: 2026-05-25

## Purpose
Centralized operational intelligence and governed execution control for CAATH enterprise operations.

## Core Domain
- `src/domains/operations-center/`
  - `OperationsCenterOrchestrator.ts`
  - `types.ts`

## Snapshot Composition
`OperationsCenterSnapshot` combines:
- runtime health
- executive KPIs
- operational health
- AI operations center snapshot
- AI recommendations hub
- unified activity stream (operational + AI events)
- SLA risk summary

## Execution Layer
Governed one-click actions:
- assign
- escalate
- review
- remind
- prioritize
- approve (governance aware)
- reconcile (governance aware)

Each action includes:
- permission awareness
- audit activity logging
- telemetry event emission
- optional approval requirements
