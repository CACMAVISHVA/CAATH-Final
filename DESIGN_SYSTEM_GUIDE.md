# CAATH Enterprise Design System Guide

The EOX design system lives at `src/design-system/`.

## Current Primitives

- `EOXCard`: Framed enterprise card surface.
- `EOXButton`: Primary, quiet, and danger command buttons.
- `EOXMetric`: Compact KPI and wall metric.
- `EOXDataTable`: Enterprise table with selection, filters, saved views, export, and bulk-action affordances.
- `CommandPalettePreview`: Search trigger aligned with Ctrl+K behavior.
- `densityScale`: Compact, Standard, and Executive density modes.
- `eoxTokens`: Typography, spacing, card, input, and button class contracts.

## Usage Principles

- Prefer dense, scannable operational layouts.
- Use cards for repeated items, panels, and framed tools only.
- Keep text compact inside dashboards and command surfaces.
- Use familiar icons for actions.
- Keep density modes role-friendly:
  - Compact for operators handling volume.
  - Standard for default team use.
  - Executive for wall-style visibility.

## Extension Rules

Add primitives only when they reduce repeated layout or interaction code across operational surfaces. Do not create a separate visual language for each module.

