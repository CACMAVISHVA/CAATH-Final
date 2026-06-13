export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogContext = {
  traceId?: string;
  tenantId?: string;
  userId?: string;
  module?: string;
  [key: string]: unknown;
};

const write = (level: LogLevel, message: string, context?: LogContext) => {
  const payload = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...context,
  };

  if (level === 'error') {
    console.error('[caath]', payload);
    return;
  }

  if (level === 'warn') {
    console.warn('[caath]', payload);
    return;
  }

  console.log('[caath]', payload);
};

export const logger = {
  debug: (message: string, context?: LogContext) => write('debug', message, context),
  info: (message: string, context?: LogContext) => write('info', message, context),
  warn: (message: string, context?: LogContext) => write('warn', message, context),
  error: (message: string, context?: LogContext) => write('error', message, context),
};
