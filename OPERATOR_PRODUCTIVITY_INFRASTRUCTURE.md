# Operator Productivity Infrastructure

The productivity infrastructure is intentionally lightweight and frontend-centered.

## Components

- Local action memory.
- Favorite action ranking.
- Restored workflow context.
- Pinned operational views.
- Recent sessions.
- Throughput metrics.
- Click-depth and friction indicators.

## Persistence

Velocity memory is stored locally per user through `caath:velocity-memory:{userId}`. Workspace layout state remains stored through the realtime workspace persistence layer.

## Metrics

Metrics are UX indicators for continuous optimization:

- Queue throughput.
- Restored contexts.
- Click depth.
- Productivity score.

