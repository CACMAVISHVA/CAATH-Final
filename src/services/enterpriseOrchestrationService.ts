import { supabase } from '../lib/supabase';
import { User } from '../types';
import { recordOperationalTelemetry } from './operationalTelemetryPipelineService';
import { getWorkflowLifecycleIntegritySummary } from './workflowLifecycleIntegrityService';

export type OrchestrationChainStatus = 'active' | 'blocked' | 'failed' | 'awaiting_approval' | 'completed';

export interface OrchestrationStep {
  key: string;
  label: string;
  status: 'pending' | 'ready' | 'completed' | 'blocked' | 'failed' | 'awaiting_approval';
  governanceRequired?: boolean;
  detail?: string;
}

export interface OrchestrationChain {
  id: string;
  chainType: 'notice_to_workflow' | 'task_to_revenue' | 'payroll_governance' | 'document_to_notice' | 'cross_domain';
  status: OrchestrationChainStatus;
  entityType: string;
  entityId: string;
  createdAt: string;
  updatedAt: string;
  steps: OrchestrationStep[];
  governanceRequired: boolean;
  governanceApproved: boolean;
}

export interface EnterpriseOrchestrationSnapshot {
  generatedAt: string;
  summary: {
    activeChains: number;
    blockedChains: number;
    failedStages: number;
    pendingGovernanceApprovals: number;
    stalledChains: number;
    chainIntegrityScore: number;
  };
  chains: OrchestrationChain[];
  continuitySignals: string[];
}

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const defaultStepsForChainType = (chainType: OrchestrationChain['chainType']): OrchestrationStep[] => {
  if (chainType === 'document_to_notice') {
    return [
      { key: 'metadata_extracted', label: 'Metadata Extracted', status: 'ready' },
      { key: 'client_identified', label: 'Client Identified', status: 'pending' },
      { key: 'workflow_created', label: 'Workflow Created', status: 'pending' },
      { key: 'risk_surfaced', label: 'Operational Risk Surfaced', status: 'pending' },
    ];
  }
  if (chainType === 'task_to_revenue') {
    return [
      { key: 'approval_flow_triggered', label: 'Approval Flow Triggered', status: 'ready', governanceRequired: true },
      { key: 'invoice_recommendation_created', label: 'Invoice Recommendation Created', status: 'pending' },
      { key: 'receivable_tracking_updated', label: 'Receivable Tracking Updated', status: 'pending' },
      { key: 'profitability_telemetry_updated', label: 'Profitability Telemetry Updated', status: 'pending' },
    ];
  }
  if (chainType === 'payroll_governance') {
    return [
      { key: 'governance_approval_required', label: 'Governance Approval Required', status: 'awaiting_approval', governanceRequired: true },
      { key: 'audit_telemetry_created', label: 'Audit Telemetry Created', status: 'pending' },
      { key: 'payout_readiness_monitored', label: 'Payout Readiness Monitored', status: 'pending' },
    ];
  }
  return [
    { key: 'coordination_started', label: 'Coordination Started', status: 'ready' },
    { key: 'dependency_validation', label: 'Dependency Validation', status: 'pending' },
    { key: 'execution_routing', label: 'Execution Routing', status: 'pending' },
  ];
};

export const registerOrchestrationChain = async (params: {
  firmId: string;
  actor: User;
  chainType: OrchestrationChain['chainType'];
  entityType: string;
  entityId: string;
  governanceRequired?: boolean;
  steps?: OrchestrationStep[];
}) => {
  const now = new Date().toISOString();
  const governanceRequired = Boolean(params.governanceRequired);
  const steps = params.steps && params.steps.length > 0 ? params.steps : defaultStepsForChainType(params.chainType);

  const details = {
    chainType: params.chainType,
    status: governanceRequired ? 'awaiting_approval' : 'active',
    governanceRequired,
    governanceApproved: false,
    steps,
    updatedAt: now,
  };

  const { data, error } = await supabase.from('enterprise_activities').insert([{
    firm_id: params.firmId,
    event_type: 'orchestration_chain',
    event_subtype: params.chainType,
    reference_id: params.entityId,
    reference_table: params.entityType,
    actor_id: params.actor.id,
    actor_name: params.actor.name,
    actor_role: params.actor.role,
    severity: governanceRequired ? 'notice' : 'info',
    details,
  }]).select('*').single();

  if (error) throw error;

  try {
    await recordOperationalTelemetry({
      firmId: params.firmId,
      metric: 'event_propagation',
      eventName: 'orchestration_chain_registered',
      actorId: params.actor.id,
      actorName: params.actor.name,
      actorRole: params.actor.role,
      workflowType: params.entityType,
      workflowId: params.entityId,
      payload: { chainType: params.chainType, governanceRequired, steps: steps.length },
    });
  } catch {
    // keep orchestration registration non-blocking
  }

  return data;
};

export const getEnterpriseOrchestrationSnapshot = async (user: User): Promise<EnterpriseOrchestrationSnapshot> => {
  if (!user.firmId) {
    return {
      generatedAt: new Date().toISOString(),
      summary: { activeChains: 0, blockedChains: 0, failedStages: 0, pendingGovernanceApprovals: 0, stalledChains: 0, chainIntegrityScore: 100 },
      chains: [],
      continuitySignals: [],
    };
  }

  const sevenDaysAgoIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const [chainsRes, integrity] = await Promise.all([
    supabase
      .from('enterprise_activities')
      .select('id,event_subtype,reference_table,reference_id,details,created_at,updated_at')
      .eq('firm_id', user.firmId)
      .eq('event_type', 'orchestration_chain')
      .order('created_at', { ascending: false })
      .limit(80),
    getWorkflowLifecycleIntegritySummary(user.firmId),
  ]);

  if (chainsRes.error) throw chainsRes.error;

  const chains: OrchestrationChain[] = (chainsRes.data || []).map((row: any) => {
    const details = (row.details || {}) as Record<string, unknown>;
    const steps = Array.isArray(details.steps) ? (details.steps as OrchestrationStep[]) : defaultStepsForChainType((row.event_subtype || 'cross_domain') as OrchestrationChain['chainType']);
    const status = (details.status || 'active') as OrchestrationChainStatus;
    return {
      id: row.id,
      chainType: (row.event_subtype || 'cross_domain') as OrchestrationChain['chainType'],
      status,
      entityType: row.reference_table || 'workflow',
      entityId: row.reference_id || row.id,
      createdAt: row.created_at,
      updatedAt: (details.updatedAt as string) || row.updated_at || row.created_at,
      steps,
      governanceRequired: Boolean(details.governanceRequired),
      governanceApproved: Boolean(details.governanceApproved),
    };
  });

  const activeChains = chains.filter((c) => c.status === 'active').length;
  const blockedChains = chains.filter((c) => c.status === 'blocked').length;
  const failedStages = chains.reduce((sum, c) => sum + c.steps.filter((s) => s.status === 'failed').length, 0);
  const pendingGovernanceApprovals = chains.filter((c) => c.status === 'awaiting_approval' || (c.governanceRequired && !c.governanceApproved)).length;
  const stalledChains = chains.filter((c) => c.updatedAt <= sevenDaysAgoIso && ['active', 'blocked', 'awaiting_approval'].includes(c.status)).length;

  const chainIntegrityScore = clamp(
    100 -
    blockedChains * 12 -
    failedStages * 10 -
    pendingGovernanceApprovals * 6 -
    stalledChains * 8 -
    integrity.counts.invalidTransitions * 3
  );

  const continuitySignals: string[] = [];
  if (blockedChains > 0) continuitySignals.push(`${blockedChains} orchestration chains are blocked and need dependency review.`);
  if (pendingGovernanceApprovals > 0) continuitySignals.push(`${pendingGovernanceApprovals} orchestration chains are waiting for governance approvals.`);
  if (stalledChains > 0) continuitySignals.push(`${stalledChains} orchestration chains are stalled beyond 7 days.`);
  if (failedStages > 0) continuitySignals.push(`${failedStages} orchestration stages failed and require retry planning.`);
  if (continuitySignals.length === 0) continuitySignals.push('Orchestration continuity is stable; no blocked or stalled chains detected.');

  try {
    await recordOperationalTelemetry({
      firmId: user.firmId,
      metric: 'event_propagation',
      eventName: 'enterprise_orchestration_snapshot_generated',
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      severity: blockedChains > 0 || failedStages > 0 ? 'warning' : 'info',
      payload: { activeChains, blockedChains, failedStages, pendingGovernanceApprovals, stalledChains, chainIntegrityScore },
    });
  } catch {
    // keep snapshot path stable
  }

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      activeChains,
      blockedChains,
      failedStages,
      pendingGovernanceApprovals,
      stalledChains,
      chainIntegrityScore,
    },
    chains: chains.slice(0, 20),
    continuitySignals,
  };
};

