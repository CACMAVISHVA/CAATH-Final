export type CacheLifecyclePolicy = {
  staleTimeMs: number;
  gcTimeMs: number;
};

export const cacheLifecycle = {
  auth: { staleTimeMs: 30_000, gcTimeMs: 5 * 60_000 },
  clients: { staleTimeMs: 60_000, gcTimeMs: 10 * 60_000 },
  tasks: { staleTimeMs: 20_000, gcTimeMs: 10 * 60_000 },
  notices: { staleTimeMs: 20_000, gcTimeMs: 10 * 60_000 },
  analytics: { staleTimeMs: 120_000, gcTimeMs: 15 * 60_000 },
} as const satisfies Record<string, CacheLifecyclePolicy>;
