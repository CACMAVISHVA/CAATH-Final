import { createStore } from '../core/createStore';

type AnalyticsCacheState = {
  lastUpdatedAt: string | null;
  data: Record<string, unknown>;
};

export const analyticsCacheStore = createStore<AnalyticsCacheState>({
  lastUpdatedAt: null,
  data: {},
});
