# Enterprise Onboarding Architecture

Date: 2026-05-25

## Objective
Implement onboarding as a contextual activation system inside CAATH operations, not a generic walkthrough.

## Domain Layer
- `src/domains/onboarding/types.ts`
- `src/domains/onboarding/activationTemplates.ts`
- `src/domains/onboarding/onboardingOrchestrator.ts`
- `src/domains/onboarding/onboardingAnalyticsService.ts`

## Core Design
1. Role-aware activation flows define setup/workflow/tour milestones.
2. Workspace provisioning packs auto-apply operational shortcuts and defaults.
3. Progress persistence supports skip/resume.
4. Telemetry emits onboarding activation events for operational analytics.
5. UI remains orchestration-driven via `OnboardingModal`.

## Runtime Integration
- Telemetry: `recordOperationalTelemetry` via onboarding analytics service.
- Workspace preferences: quick pins and role defaults are provisioned on activation.
- Navigation: steps can open target operational tabs directly.

## Principles
- Progressive disclosure
- Workflow-first activation
- Role-specific journeys
- Non-blocking guidance
