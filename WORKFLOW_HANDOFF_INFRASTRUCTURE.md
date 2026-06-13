# Workflow Handoff Infrastructure

Workflow handoff is an operational transfer flow with context preservation.

## Handoff UX

Each handoff includes:

- Source operator.
- Target operator or role.
- Workflow name.
- Contextual summary.
- Continuity note.
- Status.

## Goals

- Prevent context loss during reassignment.
- Make responsibility visible.
- Track acceptance and missing context.
- Reduce follow-up chatter.
- Preserve SLA accountability.

## Current Implementation

Handoff UX is implemented in `CollaborativeWorkspace.tsx` and surfaced from the realtime workspace through `CollaborationSnapshot.tsx`.

