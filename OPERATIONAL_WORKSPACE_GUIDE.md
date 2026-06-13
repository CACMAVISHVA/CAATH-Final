# Operational Workspace Guide

## Workspace System
- Role-aware workspace resolution (`workspaceOrchestrator.resolveWorkspace`).
- Persistent workspace context stored per user.
- Layout profiles for admin/audit/gst/client/operations/ai-assistant.

## UX Strategy
- Workspace context is workflow-first, not generic dashboard-first.
- Focus mode and active module state are persisted.
- Navigation and widget models are driven by workspace type.

## Next Steps
1. Map workspace layouts to concrete route presets.
2. Add multi-tab workspace sessions and handoff states.
3. Add cross-workspace breadcrumbing with timeline anchors.
