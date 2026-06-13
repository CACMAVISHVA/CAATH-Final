# CAATH Interaction Telemetry Guide

Interaction telemetry captures reliability signals for enterprise UX improvement.

## Captured Fields

- Action id.
- Label.
- Source surface.
- Status.
- Start and completion timestamps.
- Error message when available.

## Storage

Telemetry is stored locally under `caath:interaction-telemetry` with a bounded history. It is intentionally lightweight and should not block operator execution.

## Future Roadmap

- Add dead-click instrumentation for disabled controls.
- Capture abandoned modal and workflow paths.
- Roll up repeated-action and failure patterns into operational UX analytics.
- Federate interaction telemetry across GST, governance, collaboration, learning, and command center surfaces.
