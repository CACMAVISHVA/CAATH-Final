export interface MemoryGovernanceSignal {
  id: string;
  title: string;
  control: string;
  status: 'healthy' | 'review' | 'prune';
}

export const memoryGovernanceSignals: MemoryGovernanceSignal[] = [
  { id: 'mgs-1', title: 'Memory aging', control: 'Revalidate operational records every 30 days.', status: 'healthy' },
  { id: 'mgs-2', title: 'Knowledge pruning', control: 'Merge duplicate GST variance patterns.', status: 'review' },
  { id: 'mgs-3', title: 'Confidence recalibration', control: 'Lower confidence when playbook outcomes drift.', status: 'healthy' },
  { id: 'mgs-4', title: 'Noise control', control: 'Suppress low-impact learning signals from dashboard.', status: 'healthy' },
];

