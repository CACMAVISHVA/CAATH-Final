import { User } from '../../types';
import {
  AutomationGovernancePolicy,
  AutomationRisk,
  AutomationTimelineEvent,
  AutomationTrigger,
  AutonomousExecutionPlan,
  AutonomousOperationsSnapshot,
} from './types';

const riskRank: Record<AutomationRisk, number> = { low: 1, medium: 2, high: 3 };

const policies: AutomationGovernancePolicy[] = [
  {
    id: 'policy-low-risk-continuation',
    title: 'Low-risk workflow continuation',
    maxRiskWithoutApproval: 'low',
    allowedRoles: ['SuperAdmin', 'Admin'],
    approvalThreshold: 0.82,
    throttleWindowMinutes: 20,
    rationale: 'Routine continuation can proceed when confidence is high and workflow impact is reversible.',
  },
  {
    id: 'policy-escalation-sensitive',
    title: 'Escalation-sensitive automation gate',
    maxRiskWithoutApproval: 'medium',
    allowedRoles: ['SuperAdmin'],
    approvalThreshold: 0.9,
    throttleWindowMinutes: 45,
    rationale: 'Escalation movement affects ownership and SLA accountability, so elevated approval is required.',
  },
  {
    id: 'policy-high-risk-approval',
    title: 'High-risk approval gate',
    maxRiskWithoutApproval: 'medium',
    allowedRoles: ['SuperAdmin'],
    approvalThreshold: 0.95,
    throttleWindowMinutes: 60,
    rationale: 'High-risk automation must be explainable, manually approved, and override-capable.',
  },
];

const triggers: AutomationTrigger[] = [
  {
    id: 'trigger-sla-gst',
    type: 'sla_breach',
    title: 'GST variance SLA approaching breach',
    reason: 'Aarav Exports variance review has less than two hours remaining with high risk.',
    severity: 'high',
    domain: 'gst',
    signalStrength: 92,
  },
  {
    id: 'trigger-approval-delay',
    type: 'approval_delay',
    title: 'Approval release delay detected',
    reason: 'Five approval-ready records have remained in queue beyond the expected review window.',
    severity: 'medium',
    domain: 'governance',
    signalStrength: 84,
  },
  {
    id: 'trigger-queue-overload',
    type: 'queue_overload',
    title: 'Operator queue pressure rising',
    reason: 'Task clustering indicates workload imbalance across GST and notice workflows.',
    severity: 'medium',
    domain: 'workflow',
    signalStrength: 79,
  },
  {
    id: 'trigger-stagnation-notice',
    type: 'workflow_stagnation',
    title: 'Notice workflow stagnation',
    reason: 'Nexus Foods notice has not received evidence movement after owner handoff.',
    severity: 'low',
    domain: 'collaboration',
    signalStrength: 72,
  },
];

const findPolicy = (trigger: AutomationTrigger) => {
  if (trigger.severity === 'high') return policies[2];
  if (trigger.type === 'escalation_condition' || trigger.type === 'approval_delay') return policies[1];
  return policies[0];
};

const canAutoApprove = (trigger: AutomationTrigger, policy: AutomationGovernancePolicy, user: User) =>
  policy.allowedRoles.includes(user.role) &&
  riskRank[trigger.severity] <= riskRank[policy.maxRiskWithoutApproval] &&
  trigger.signalStrength / 100 >= policy.approvalThreshold;

const isThrottled = (trigger: AutomationTrigger) =>
  trigger.type === 'queue_overload' && trigger.signalStrength > 76;

const buildPlan = (trigger: AutomationTrigger, user: User): AutonomousExecutionPlan => {
  const policy = findPolicy(trigger);
  const throttled = isThrottled(trigger);
  const autoApproved = canAutoApprove(trigger, policy, user);
  const approvalRequired = !autoApproved || trigger.severity === 'high';

  return {
    id: `plan-${trigger.id}`,
    triggerId: trigger.id,
    title: `${trigger.title} automation`,
    nextStep: trigger.severity === 'high' ? 'Prepare governed escalation package' : 'Queue safe workflow continuation',
    sequence: [
      'Validate permission and workflow state',
      'Check governance policy and approval threshold',
      'Stabilize duplicate triggers and queue pressure',
      trigger.severity === 'high' ? 'Request approval gate' : 'Execute reversible workflow continuation',
      'Record automation timeline and operator override path',
    ],
    risk: trigger.severity,
    confidence: trigger.signalStrength,
    state: throttled ? 'throttled' : autoApproved ? 'auto-approved' : approvalRequired ? 'approval-required' : 'recommended',
    approvalRequired,
    overrideAvailable: true,
    governanceRationale: policy.rationale,
    lineage: [trigger.domain, trigger.type, policy.id, user.role],
  };
};

const buildTimeline = (plans: AutonomousExecutionPlan[]): AutomationTimelineEvent[] =>
  plans.map((plan, index) => ({
    id: `auto-tl-${plan.id}`,
    title: plan.title,
    detail: `${plan.state} | ${plan.governanceRationale}`,
    time: index === 0 ? 'now' : `${index * 7}m`,
    state: plan.state,
  }));

export class AutonomousOperationsOrchestrator {
  generateSnapshot(user: User): AutonomousOperationsSnapshot {
    const plans = triggers.map((trigger) => buildPlan(trigger, user));
    return {
      generatedAt: new Date().toISOString(),
      triggers,
      policies,
      plans,
      timeline: buildTimeline(plans),
      analytics: {
        effectivenessScore: 86,
        manualWorkReduced: '31%',
        accelerationRate: '1.8x',
        trustScore: 91,
        preventedStorms: plans.filter((plan) => plan.state === 'throttled').length,
      },
    };
  }
}

export const autonomousOperationsOrchestrator = new AutonomousOperationsOrchestrator();
