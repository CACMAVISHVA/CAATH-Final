import { eventBus } from '../events';

export const emitDomainEvent = async (name: Parameters<typeof eventBus.publish>[0]['name'], payload: unknown, tenantId?: string, actorId?: string) => {
  await eventBus.publish({
    name,
    payload,
    tenantId,
    actorId,
    timestamp: new Date().toISOString(),
  });
};
