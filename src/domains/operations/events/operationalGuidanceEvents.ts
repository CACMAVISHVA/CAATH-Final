import { emitDomainEvent } from '../../sharedEventEmitter';

export type OperationalGuidanceEventName =
  | 'OPERATIONAL_ASSISTANCE_TRIGGERED'
  | 'ROLE_DASHBOARD_CONTEXT_UPDATED'
  | 'COMMAND_CENTER_ACTION_EXECUTED'
  | 'WORKFLOW_RISK_IDENTIFIED'
  | 'COMPLIANCE_ACTION_RECOMMENDED';

export type OperationalGuidancePayloads = {
  OPERATIONAL_ASSISTANCE_TRIGGERED: {
    tenantId: string;
    actorRole: string;
    recommendationCount: number;
    criticalCount: number;
    correlationId: string;
  };
  ROLE_DASHBOARD_CONTEXT_UPDATED: {
    tenantId: string;
    role: string;
    priorityScore: number;
    urgencyBand: string;
    correlationId: string;
  };
  COMMAND_CENTER_ACTION_EXECUTED: {
    tenantId: string;
    role: string;
    action: string;
    correlationId: string;
  };
  WORKFLOW_RISK_IDENTIFIED: {
    tenantId: string;
    role: string;
    riskScore: number;
    riskSource: string;
    correlationId: string;
  };
  COMPLIANCE_ACTION_RECOMMENDED: {
    tenantId: string;
    role: string;
    recommendationId: string;
    correlationId: string;
  };
};

export const emitOperationalGuidanceEvent = async <TEvent extends OperationalGuidanceEventName>(
  event: TEvent,
  payload: OperationalGuidancePayloads[TEvent],
  actorId?: string,
) => {
  await emitDomainEvent(event, payload, payload.tenantId, actorId);
};
