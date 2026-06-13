export interface RateLimitDecision {
  allowed: boolean;
  remaining: number;
}

const DEFAULT_WINDOW_LIMIT = 1000;

export const integrationRateLimitPolicy = {
  evaluate(currentCount: number, windowLimit = DEFAULT_WINDOW_LIMIT): RateLimitDecision {
    const remaining = Math.max(0, windowLimit - currentCount);
    return { allowed: currentCount < windowLimit, remaining };
  },
};

