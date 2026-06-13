# CAATH Utility Rail Audit

Date: 2026-06-04  
Decision: REMOVE as a persistent rail; CONSOLIDATE valid actions into the right-side Operations drawer.

## Decision Rule

If an icon does not support a real workflow and real interaction, it must not permanently consume screen space.

## Findings

| Utility surface | Decision | Reason | Outcome |
|---|---|---|---|
| Persistent vertical utility rail | REMOVE | Consumed permanent screen space and created a second navigation layer | Removed from shell |
| Notification bell | CONSOLIDATE | Duplicated notification and signal entry points | Removed from active shell; signal handling belongs in Operations drawer |
| Floating quick action launcher | CONSOLIDATE | Duplicated command search and drawer actions | Removed from active shell |
| Operations drawer | KEEP | One contextual utility area with explicit workflow outcomes | Retained and hardened |
| Header Search | KEEP | Fast command and entity access | Remains primary deep-navigation tool |

## Production Decision

CAATH should not use a permanent icon rail for the first enterprise deployment. A rail is only justified after live signal volume, user workflow frequency, and action completion telemetry prove that persistent utilities are worth the screen cost.

## Hardening Completed

- Removed the utility rail file from the active shell.
- Replaced fake alert-style data with action-backed operational workflows.
- Removed fabricated signal counts from the header.
- Kept one top-level Operations button for contextual workflow actions.

## Future Reconsideration Criteria

Reintroduce a rail only if:

- every icon opens live, service-backed data
- each icon has a measurable completion workflow
- active state persists correctly
- counts are derived from real data
- user testing shows faster execution than the drawer model
