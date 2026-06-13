import { logger } from '../../../infrastructure/monitoring/logger';

export const logAiAction = (action: string, metadata: Record<string, unknown>) => {
  logger.info('ai_action', { action, ...metadata });
};
