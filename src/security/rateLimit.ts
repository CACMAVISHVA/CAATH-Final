import { SecurityAppError } from './secureError';

type RateLimitState = {
  windowStart: number;
  count: number;
};

const memoryLimiter = new Map<string, RateLimitState>();

export const enforceClientRateLimit = (key: string, maxRequests: number, windowMs: number): void => {
  const now = Date.now();
  const current = memoryLimiter.get(key);
  if (!current || now - current.windowStart > windowMs) {
    memoryLimiter.set(key, { windowStart: now, count: 1 });
    return;
  }

  const nextCount = current.count + 1;
  if (nextCount > maxRequests) {
    throw new SecurityAppError('Too many attempts. Please wait and retry.', 'RATE_LIMITED', 429);
  }

  memoryLimiter.set(key, { ...current, count: nextCount });
};
