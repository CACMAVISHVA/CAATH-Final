import { KnowledgeGraphNode, LearningSignal, OperationalPlaybook, OrganizationalMemoryRecord } from './types';

export const memoryRecords: OrganizationalMemoryRecord[] = [
  {
    id: 'mem-1',
    title: 'GST variance vendor-proof pattern',
    domain: 'gst',
    sourceWorkflow: 'Aarav Exports GSTR-3B variance review',
    operationalContext: 'High-value ITC mismatch required vendor confirmation before approval release.',
    resolutionLineage: ['Mismatch detected', 'Vendor proof requested', 'Admin review', 'Approval gate cleared'],
    organizationalImpact: 'Reduced repeat GST variance review time by 18%.',
    confidence: 88,
    owner: 'GST pod',
    lastValidated: '2026-06-02',
  },
  {
    id: 'mem-2',
    title: 'Notice handoff continuity note',
    domain: 'notices',
    sourceWorkflow: 'Nexus Foods DRC-01A response',
    operationalContext: 'Escalated notice required owner transfer with evidence summary.',
    resolutionLineage: ['Notice received', 'Evidence attached', 'Handoff summary written', 'Reviewer accepted'],
    organizationalImpact: 'Prevented context loss during reassignment.',
    confidence: 91,
    owner: 'Notice pod',
    lastValidated: '2026-06-01',
  },
  {
    id: 'mem-3',
    title: 'Clean approval batch release',
    domain: 'approvals',
    sourceWorkflow: 'Helio Textiles document batch',
    operationalContext: 'Approval release was safe after admin review and GST dependency confirmation.',
    resolutionLineage: ['Staff processed', 'Admin reviewed', 'GST dependency checked', 'SuperAdmin released'],
    organizationalImpact: 'Created reusable release checklist for document-heavy clients.',
    confidence: 84,
    owner: 'Approval reviewers',
    lastValidated: '2026-05-31',
  },
];

export const learningSignals: LearningSignal[] = [
  { id: 'ls-1', pattern: 'GST variance cases repeat when vendor confirmation is delayed', recurrence: 9, improvement: 'Request vendor proof before admin review.', effectiveness: 86, staleRisk: 'low' },
  { id: 'ls-2', pattern: 'Notice handoffs lose context without continuity notes', recurrence: 6, improvement: 'Require handoff summary before reassignment.', effectiveness: 91, staleRisk: 'low' },
  { id: 'ls-3', pattern: 'Approval queues slow down when GST dependency is not visible', recurrence: 5, improvement: 'Show dependency badge in approval lane.', effectiveness: 79, staleRisk: 'medium' },
];

export const knowledgeGraph: KnowledgeGraphNode[] = [
  { id: 'kg-gst', label: 'GST Intelligence', type: 'gst', relatedTo: ['kg-resolution', 'kg-approval', 'kg-client'] },
  { id: 'kg-resolution', label: 'Resolution Memory', type: 'resolution', relatedTo: ['kg-gst', 'kg-notice'] },
  { id: 'kg-notice', label: 'Notice Escalations', type: 'notices', relatedTo: ['kg-resolution', 'kg-collab'] },
  { id: 'kg-approval', label: 'Approval Governance', type: 'approvals', relatedTo: ['kg-gst', 'kg-governance'] },
  { id: 'kg-collab', label: 'Collaborative Notes', type: 'collaboration', relatedTo: ['kg-notice', 'kg-playbook'] },
  { id: 'kg-governance', label: 'Knowledge Governance', type: 'governance', relatedTo: ['kg-approval', 'kg-playbook'] },
  { id: 'kg-playbook', label: 'Operational Playbooks', type: 'playbook', relatedTo: ['kg-collab', 'kg-governance'] },
  { id: 'kg-client', label: 'Client Operational Patterns', type: 'clients', relatedTo: ['kg-gst'] },
];

export const playbooks: OperationalPlaybook[] = [
  {
    id: 'pb-1',
    title: 'GST variance resolution playbook',
    scope: 'GST reconciliation and approval dependency',
    confidence: 88,
    steps: [
      { id: 'pbs-1', title: 'Confirm mismatch source', ownerRole: 'Staff', checkpoint: 'Evidence attached' },
      { id: 'pbs-2', title: 'Request vendor proof', ownerRole: 'GST Lead', checkpoint: 'Vendor response logged' },
      { id: 'pbs-3', title: 'Route to approval gate', ownerRole: 'Admin', checkpoint: 'Dependency cleared' },
    ],
  },
  {
    id: 'pb-2',
    title: 'Notice escalation handoff playbook',
    scope: 'Notice response and operator transfer',
    confidence: 91,
    steps: [
      { id: 'pbs-4', title: 'Summarize evidence', ownerRole: 'Notice Owner', checkpoint: 'Continuity note complete' },
      { id: 'pbs-5', title: 'Assign reviewer', ownerRole: 'Admin', checkpoint: 'Owner accepted' },
      { id: 'pbs-6', title: 'Track SLA chain', ownerRole: 'Operations', checkpoint: 'SLA owner visible' },
    ],
  },
];

export const getInstitutionalGuidance = (workflow: string) =>
  memoryRecords
    .filter((record) => workflow.toLowerCase().includes(record.domain) || record.confidence > 85)
    .slice(0, 3);

