# GST Upload Orchestration

Date: 2026-05-25

## Purpose
Generate adaptive upload sessions based on analysis dependencies with staged processing readiness.

## Core Module
- `src/domains/gst-intelligence/upload-orchestrator/uploadOrchestrator.ts`

## Session Lifecycle
1. Create upload session from dependency resolution.
2. Render required/optional dataset cards.
3. Mark dataset upload state with guided messages.
4. Validate required dataset readiness for intelligence execution gate.

## Status Model
- `pending`
- `uploaded`
- `parsed`
- `validated`
- `ready`
- `failed`

## UX Outcome
Upload interaction becomes contextual and workflow-guided rather than generic file collection.
