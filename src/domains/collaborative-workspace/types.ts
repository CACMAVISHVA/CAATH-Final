export type OperatorStatus = 'active' | 'reviewing' | 'handoff' | 'idle';
export type CollaborationSignal = 'mention' | 'handoff' | 'escalation' | 'approval' | 'insight';

export interface OperatorPresence {
  id: string;
  name: string;
  role: string;
  status: OperatorStatus;
  workspace: string;
  currentWorkflow: string;
  lastAction: string;
}

export interface WorkflowHandoff {
  id: string;
  from: string;
  to: string;
  workflow: string;
  summary: string;
  continuity: string;
  status: 'ready' | 'accepted' | 'needs-context';
}

export interface CollaborationEvent {
  id: string;
  signal: CollaborationSignal;
  actor: string;
  target: string;
  message: string;
  time: string;
}

export interface TeamCoordinationMetric {
  label: string;
  value: string;
  detail: string;
  tone: 'good' | 'risk' | 'neutral';
}

