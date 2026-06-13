# Lifecycle Integrity Guide

## Purpose
Ensure workflow lifecycle consistency across tasks, notices, approvals, payroll, and billing continuity.

## Core Modules
- `src/domains/workflows/services/workflowLifecycleIntegrityOrchestrator.ts`
- `src/domains/workflows/repositories/WorkflowIntegrityRepository.ts`
- `src/domains/workflows/policies/lifecyclePolicies.ts`
- `src/domains/workflows/state-machine/workflowStateMachine.ts`

## Validation Model
1. Load integrity datasets through repository.
2. Validate transitions and ownership continuity.
3. Detect cross-domain mismatches and stuck workflows.
4. Score integrity through policy engine.
5. Emit observability summary.

## Boundary Rule
Lifecycle orchestrator must not directly query persistence.
