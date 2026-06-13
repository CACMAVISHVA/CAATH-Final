import { User } from '../../../types';

export interface TenantWorkflowContext {
  firmId: string;
  actor: {
    id: string;
    name: string;
    role: User['role'];
  };
  traceId?: string;
}

export const requireTenantContext = (user: User): TenantWorkflowContext => {
  if (!user.firmId) {
    throw new Error('A firm workspace context is required for workflow operations.');
  }

  return {
    firmId: user.firmId,
    actor: {
      id: user.id,
      name: user.name,
      role: user.role,
    },
  };
};
