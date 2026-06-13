export const queryKeys = {
  auth: {
    session: ['auth', 'session'] as const,
    profile: ['auth', 'profile'] as const,
  },
  tickets: {
    all: ['tickets'] as const,
    detail: (id: string) => ['tickets', id] as const,
    timeline: (id: string) => ['tickets', id, 'timeline'] as const,
  },
  gst: {
    filings: (clientId: string) => ['gst', 'filings', clientId] as const,
    snapshot: (firmId: string, clientId?: string, gstin?: string, period?: string) => ['gst', 'snapshot', firmId, clientId ?? 'na', gstin ?? 'na', period ?? 'na'] as const,
  },
  clients: {
    all: (firmId: string) => ['clients', firmId] as const,
    detail: (clientId: string) => ['clients', 'detail', clientId] as const,
  },
  tasks: {
    all: (firmId: string) => ['tasks', firmId] as const,
    detail: (taskId: string) => ['tasks', 'detail', taskId] as const,
  },
  notices: {
    all: (firmId: string) => ['notices', firmId] as const,
    detail: (noticeId: string) => ['notices', 'detail', noticeId] as const,
  },
  tenant: {
    profile: (tenantId: string) => ['tenant', tenantId] as const,
  },
  analytics: {
    dashboard: (firmId: string) => ['analytics', 'dashboard', firmId] as const,
  },
};
