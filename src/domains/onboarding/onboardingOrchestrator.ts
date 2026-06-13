import { User } from '../../types';
import { WorkspacePreferences } from '../../services/workspacePreferencesService';
import { ROLE_ACTIVATION_FLOWS, WORKSPACE_PROVISIONING_PACKS } from './activationTemplates';
import { computeActivationAnalytics, trackOnboardingTelemetry } from './onboardingAnalyticsService';
import { ActivationProgress, RoleActivationFlow, WorkspaceProvisioningPack } from './types';

const progressKey = (userId: string) => `caath:onboarding:progress:${userId}`;

const defaultProgress = (): ActivationProgress => {
  const now = new Date().toISOString();
  return {
    completedStepIds: [],
    startedAt: now,
    lastUpdatedAt: now,
  };
};

export const onboardingOrchestrator = {
  getFlow(role: User['role']): RoleActivationFlow {
    return ROLE_ACTIVATION_FLOWS[role] || ROLE_ACTIVATION_FLOWS.SuperAdmin;
  },

  getProvisioningPack(role: User['role']): WorkspaceProvisioningPack {
    return WORKSPACE_PROVISIONING_PACKS[role] || WORKSPACE_PROVISIONING_PACKS.SuperAdmin;
  },

  loadProgress(userId: string): ActivationProgress {
    try {
      const raw = window.localStorage.getItem(progressKey(userId));
      if (!raw) return defaultProgress();
      const parsed = JSON.parse(raw) as ActivationProgress;
      return {
        completedStepIds: parsed.completedStepIds || [],
        startedAt: parsed.startedAt || new Date().toISOString(),
        lastUpdatedAt: parsed.lastUpdatedAt || new Date().toISOString(),
      };
    } catch {
      return defaultProgress();
    }
  },

  saveProgress(userId: string, progress: ActivationProgress) {
    window.localStorage.setItem(progressKey(userId), JSON.stringify(progress));
  },

  markStepComplete(user: User, stepId: string, progress: ActivationProgress): ActivationProgress {
    if (progress.completedStepIds.includes(stepId)) return progress;
    const next: ActivationProgress = {
      ...progress,
      completedStepIds: [...progress.completedStepIds, stepId],
      lastUpdatedAt: new Date().toISOString(),
    };
    this.saveProgress(user.id, next);
    const flow = this.getFlow(user.role);
    const analytics = computeActivationAnalytics(flow, next);
    trackOnboardingTelemetry({
      user,
      eventName: 'onboarding_step_completed',
      payload: { stepId, completionPercent: analytics.completionPercent, firstWorkflowCompleted: analytics.firstWorkflowCompleted },
    });
    return next;
  },

  applyWorkspaceProvisioning(role: User['role'], prefs: WorkspacePreferences): WorkspacePreferences {
    const pack = this.getProvisioningPack(role);
    const pinned = [...pack.quickPins, ...prefs.pinned.filter((pin) => !pack.quickPins.some((defaultPin) => defaultPin.id === pin.id))].slice(0, 12);
    return { ...prefs, pinned };
  },
};
