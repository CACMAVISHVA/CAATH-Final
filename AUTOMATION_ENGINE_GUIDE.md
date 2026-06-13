# Automation Engine Guide

## Implemented Engine
- `AutomationRulesEngine` supports rule listing and event execution.
- Actions include notify, queue job, and escalation reminder creation.
- Rules are enabled/disabled centrally and event keyed.

## Current Rule Patterns
- Overdue escalation
- Compliance deadline alerts
- Auto-assignment hints

## Guardrails
- Rules execute via runtime services (notification/queue), not UI coupling.
- Event-driven invocation avoids hardcoded screen logic.
