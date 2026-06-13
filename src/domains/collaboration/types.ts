export interface CollaborationPostInput {
  tenantId: string;
  entityType: 'task' | 'notice' | 'client' | 'approval' | 'workflow';
  entityId: string;
  text: string;
  mentions?: string[];
}

