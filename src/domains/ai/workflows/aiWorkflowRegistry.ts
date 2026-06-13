export type AIWorkflow = {
  id: string;
  requiredPermission: string;
  providerId: string;
};

export const aiWorkflowRegistry: AIWorkflow[] = [
  { id: 'compliance-summary', requiredPermission: 'ai:read', providerId: 'openai-primary' },
  { id: 'notice-triage', requiredPermission: 'ai:operate', providerId: 'openai-primary' },
];
