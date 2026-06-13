export const appConfig = {
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL ?? '',
    version: 'v1',
    timeoutMs: 15000,
    maxRetries: 2,
  },
  observability: {
    appName: 'caath-web',
    enableConsoleInDev: true,
  },
};
