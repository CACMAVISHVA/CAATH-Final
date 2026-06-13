import { User } from '../../../types';
import { requireTenantContext } from '../../workflows/context/tenantContext';

export interface OperationalMetadata {
  tenantId: string;
  actorId: string;
  actorName: string;
  actorRole: User['role'];
  roleContext: User['role'];
  correlationId: string;
  traceId: string;
  generatedAt: string;
}

const createId = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export const buildOperationalMetadata = (user: User, correlationId?: string): OperationalMetadata => {
  const context = requireTenantContext(user);
  const trace = correlationId || createId('op');
  return {
    tenantId: context.firmId,
    actorId: context.actor.id,
    actorName: context.actor.name,
    actorRole: context.actor.role,
    roleContext: user.role,
    correlationId: trace,
    traceId: trace,
    generatedAt: new Date().toISOString(),
  };
};
