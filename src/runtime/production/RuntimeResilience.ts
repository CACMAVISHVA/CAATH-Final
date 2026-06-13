export class RuntimeTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RuntimeTimeoutError';
  }
}

export const withTimeout = async <T>(promise: PromiseLike<T>, timeoutMs: number, message: string): Promise<T> => {
  let timer: number | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = window.setTimeout(() => reject(new RuntimeTimeoutError(message)), timeoutMs);
  });
  try {
    return await Promise.race([Promise.resolve(promise), timeout]);
  } finally {
    if (timer) window.clearTimeout(timer);
  }
};

export const withRetry = async <T>(fn: () => Promise<T>, attempts = 3): Promise<T> => {
  let lastError: unknown;
  for (let i = 1; i <= attempts; i += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i === attempts) break;
      await new Promise((resolve) => window.setTimeout(resolve, 200 * i));
    }
  }
  throw lastError;
};
