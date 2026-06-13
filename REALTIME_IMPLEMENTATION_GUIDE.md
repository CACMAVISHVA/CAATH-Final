# Realtime Implementation Guide

## Implemented Runtime
- `SupabaseRealtimeRuntime` subscribes to `notifications` postgres changes.
- `RuntimeKernel` manages lifecycle and stream cleanup.
- `NotificationBell` uses runtime subscription + 30s poll fallback.

## Tenant/Role Awareness
- Notification fetch remains tenant/role filtered in existing query services.
- Realtime triggers refresh callbacks; data visibility stays query-authorized.

## Reliability
- Polling fallback ensures continuity if realtime disconnects.
- Kernel tracks active notification stream count for operational visibility.

## Next Evolutions
1. Add channel-level filter optimization by tenant.
2. Add websocket presence channels for collaboration feeds.
3. Add reconnect jitter and stale-subscription sweeper.
