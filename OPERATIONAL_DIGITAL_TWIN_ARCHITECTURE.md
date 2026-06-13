# Operational Digital Twin Architecture

## Purpose
CAATH now includes an isolated enterprise operational digital twin layer for workflow simulation, scenario stress testing, and explainable planning intelligence.

## Domain Structure
- `src/domains/operational-digital-twin/`
- `src/domains/digital-twin-dashboard/`

## Core Components
- `OperationalDigitalTwinOrchestrator`: simulation coordination engine
- `WorkflowSimulationEngine`: workflow and SLA pressure simulation
- `OperationalCapacityModeler`: capacity and throughput forecasting
- `EscalationCascadeSimulator`: escalation chain and collapse-risk modeling
- `OperationalHeatmapEngine`: queue and pressure heatmap generation
- `AIAssistedSimulationGuidance`: scenario planning recommendations
- `HistoricalReplayEngine`: actual vs predicted replay analysis

## Runtime Isolation
- No production execution triggers
- Isolated throttled simulation runtime
- Scenario cache and incremental recomputation
- Governance gates before each run

## Enterprise Outcome
- Virtual operational representation
- Predictive planning infrastructure
- Explainable scenario intelligence for executive planning
