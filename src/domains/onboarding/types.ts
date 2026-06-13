import { UserRole } from '../../types';
import { QuickAccessPin } from '../../services/workspacePreferencesService';

export type OnboardingStepKind = 'setup' | 'workflow' | 'tour' | 'ai_nudge';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  kind: OnboardingStepKind;
  targetTab?: string;
}

export interface WorkspaceProvisioningPack {
  role: UserRole;
  dashboards: string[];
  widgets: string[];
  workflows: string[];
  commandPresets: string[];
  notificationDefaults: string[];
  quickPins: QuickAccessPin[];
}

export interface RoleActivationFlow {
  role: UserRole;
  title: string;
  subtitle: string;
  setupSteps: OnboardingStep[];
  tourSteps: OnboardingStep[];
  templates: string[];
}

export interface ActivationProgress {
  completedStepIds: string[];
  startedAt: string;
  lastUpdatedAt: string;
}

export interface ActivationAnalyticsSnapshot {
  completionPercent: number;
  completedSteps: number;
  totalSteps: number;
  timeToValueMinutes: number;
  firstWorkflowCompleted: boolean;
}
