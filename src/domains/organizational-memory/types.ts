export type MemoryDomain = 'gst' | 'notices' | 'approvals' | 'clients' | 'collaboration' | 'governance' | 'workflow';

export interface OrganizationalMemoryRecord {
  id: string;
  title: string;
  domain: MemoryDomain;
  sourceWorkflow: string;
  operationalContext: string;
  resolutionLineage: string[];
  organizationalImpact: string;
  confidence: number;
  owner: string;
  lastValidated: string;
}

export interface LearningSignal {
  id: string;
  pattern: string;
  recurrence: number;
  improvement: string;
  effectiveness: number;
  staleRisk: 'low' | 'medium' | 'high';
}

export interface KnowledgeGraphNode {
  id: string;
  label: string;
  type: MemoryDomain | 'playbook' | 'resolution';
  relatedTo: string[];
}

export interface PlaybookStep {
  id: string;
  title: string;
  ownerRole: string;
  checkpoint: string;
}

export interface OperationalPlaybook {
  id: string;
  title: string;
  scope: string;
  confidence: number;
  steps: PlaybookStep[];
}

