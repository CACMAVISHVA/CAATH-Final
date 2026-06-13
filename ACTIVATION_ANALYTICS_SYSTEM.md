# Activation Analytics System

Date: 2026-05-25

## Tracked Metrics
- onboarding completion percent
- completed steps
- total steps
- time-to-value (minutes)
- first workflow completion

## Analytics Engine
`computeActivationAnalytics` in:
- `src/domains/onboarding/onboardingAnalyticsService.ts`

## Telemetry Emission
`trackOnboardingTelemetry` emits:
- `onboarding_step_completed`
- payload with completion and first-workflow signal

Telemetry stream:
- metric: `event_propagation`
- workflowType: `onboarding_activation`

## Usage
These metrics enable:
- onboarding completion reporting
- activation funnel tuning
- role-specific adoption optimization
