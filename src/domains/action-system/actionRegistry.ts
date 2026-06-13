import type { CommandAction } from '../../services/commandPaletteService';
import { RegisteredOperationalAction } from './types';

const defaultCooldownMs = 650;

const actionDefinitions: RegisteredOperationalAction[] = [
  { id: 'create-task', label: 'Task created', cooldownMs: defaultCooldownMs, undoable: true },
  { id: 'assign-work', label: 'Assignment queued', cooldownMs: defaultCooldownMs, undoable: true },
  { id: 'reassign-work', label: 'Reassignment queued', cooldownMs: defaultCooldownMs, undoable: true },
  { id: 'bulk-resolve', label: 'Resolution queued', cooldownMs: 900, undoable: true },
  { id: 'quick-approve', label: 'Approval released', allowedRoles: ['GodAdmin', 'SuperAdmin', 'Admin'], cooldownMs: 900, undoable: true },
  { id: 'open-notification-center', label: 'Notification center opened', cooldownMs: defaultCooldownMs },
  { id: 'open-analytics', label: 'Operational analytics opened', cooldownMs: defaultCooldownMs },
  { id: 'open-ai-copilot', label: 'AI copilot opened', cooldownMs: defaultCooldownMs },
  { id: 'ai-recommendation-accept', label: 'AI recommendation applied', cooldownMs: 900, undoable: true },
  { id: 'ai-recommendation-dismiss', label: 'AI recommendation dismissed', cooldownMs: 450, undoable: true },
  { id: 'ai-briefing-generate', label: 'Executive AI briefing opened', allowedRoles: ['SuperAdmin', 'Admin'], cooldownMs: 900 },
  { id: 'open-autonomous-operations', label: 'Autonomous operations opened', allowedRoles: ['SuperAdmin', 'Admin'], cooldownMs: defaultCooldownMs },
  { id: 'open-integrations', label: 'Integration fabric opened', allowedRoles: ['SuperAdmin', 'Admin'], cooldownMs: defaultCooldownMs },
  { id: 'integration-validate', label: 'Connector validation completed', allowedRoles: ['SuperAdmin', 'Admin'], cooldownMs: 800, undoable: true },
  { id: 'integration-credential-rotate', label: 'Credential rotation queued for governance', allowedRoles: ['SuperAdmin'], cooldownMs: 1200 },
  { id: 'integration-circuit-reset', label: 'Circuit reset evaluated', allowedRoles: ['SuperAdmin', 'Admin'], cooldownMs: 1000, undoable: true },
  { id: 'open-ai-queue', label: 'AI queue opened', cooldownMs: defaultCooldownMs },
  { id: 'open-gst', label: 'GST context opened', cooldownMs: defaultCooldownMs },
  { id: 'open-tasks', label: 'Task board opened', cooldownMs: defaultCooldownMs },
  { id: 'enter-deep-work', label: 'Focus mode enabled', cooldownMs: defaultCooldownMs },
  { id: 'enter-rapid-triage', label: 'Rapid triage enabled', cooldownMs: defaultCooldownMs },
  { id: 'enter-executive-monitoring', label: 'Executive monitoring enabled', cooldownMs: defaultCooldownMs },
  { id: 'panel-collapse', label: 'Panel collapsed', cooldownMs: 250 },
  { id: 'panel-expand', label: 'Panel expanded', cooldownMs: 250 },
  { id: 'panel-dock', label: 'Panel docked', cooldownMs: 300 },
  { id: 'panel-undock', label: 'Panel restored', cooldownMs: 300 },
  { id: 'panel-maximize', label: 'Panel maximized', cooldownMs: 300 },
  { id: 'panel-restore', label: 'Panel restored', cooldownMs: 300 },
  { id: 'workspace-detach', label: 'Workspace detached', cooldownMs: 500 },
  { id: 'split-view-toggle', label: 'Split view toggled', cooldownMs: 350 },
];

const registry = new Map(actionDefinitions.map((definition) => [definition.id, definition]));

export const getRegisteredAction = (id: CommandAction | string) =>
  registry.get(id) || { id, label: 'Action completed', cooldownMs: defaultCooldownMs };

export const listRegisteredActions = () => Array.from(registry.values());
