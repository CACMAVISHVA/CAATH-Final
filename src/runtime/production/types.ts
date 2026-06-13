import { UserRole } from '../../types';

export interface RuntimeContext {
  tenantId?: string;
  actorId?: string;
  actorRole?: UserRole;
  correlationId?: string;
}

export interface RuntimeHealthSnapshot {
  startedAt: string;
  queue: {
    pending: number;
    deadLetters: number;
  };
  realtime: {
    activeNotificationStreams: number;
  };
  notifications: {
    dispatched: number;
    failed: number;
  };
  security: {
    trackedTenants: number;
  };
}

