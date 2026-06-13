# Workspace Provisioning Guide

Date: 2026-05-25

## Provisioning System
Workspace provisioning is role-driven and injects activation defaults for:
- dashboards
- widgets
- workflows
- command presets
- notification defaults
- quick access pins

## Packs
Defined in `WORKSPACE_PROVISIONING_PACKS`:
- `GodAdmin`: platform governance defaults
- `SuperAdmin`: firm command + GST workflow defaults
- `Admin`: approvals and operational routing defaults
- `Staff`: execution lane defaults
- `Client`: portal tracking defaults

## Apply Flow
1. User opens onboarding activation modal.
2. Clicks `Apply Role Template`.
3. Orchestrator merges pack pins with current workspace preferences.
4. Progress is tracked and persisted.

## Extension Pattern
- Add new role capability by extending `activationTemplates.ts`.
- Keep UI unchanged unless new interaction behavior is needed.
