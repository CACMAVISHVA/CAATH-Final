import { recordOperationalTelemetry } from '../../services/operationalTelemetryPipelineService';
import { User } from '../../types';
import { ActivationAnalyticsSnapshot, ActivationProgress, RoleActivationFlow } from './types';

const minutesBetween = (startIso: string, endIso: string) => {
  const ms = Math.max(0, new Date(endIso).getTime() - new Date(startIso).getTime());
  return Math.round(ms / 60000);
};

export const computeActivationAnalytics = (flow: RoleActivationFlow, progress: ActivationProgress): ActivationAnalyticsSnapshot => {
  const totalSteps = flow.setupSteps.length + flow.tourSteps.length;
  const completedSteps = progress.completedStepIds.length;
  const completionPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  const firstWorkflowCompleted = flow.setupSteps.some((step) => step.kind === 'workflow' && progress.completedStepIds.includes(step.id));

  return {
    completionPercent,
    completedSteps,
    totalSteps,
    timeToValueMinutes: minutesBetween(progress.startedAt, progress.lastUpdatedAt),
    firstWorkflowCompleted,
  };
};

export const trackOnboardingTelemetry = async (params: {
  user: User;
  eventName: string;
  payload: Record<string, unknown>;
  severity?: 'info' | 'notice' | 'warning' | 'critical';
}) => {
  if (!params.user.firmId) return;
  try {
    await recordOperationalTelemetry({
      firmId: params.user.firmId,
      metric: 'event_propagation',
      eventName: params.eventName,
      severity: params.severity || 'info',
      actorId: params.user.id,
      actorName: params.user.name,
      actorRole: params.user.role,
      workflowType: 'onboarding_activation',
      workflowId: params.user.id,
      payload: params.payload,
    });
  } catch {
    // Non-blocking analytics capture.
  }
};
