import { logger } from '../monitoring/logger';
import { MetricPoint, ObservabilityEvent } from './observabilityContracts';

export const observabilityService = {
  emit(event: Omit<ObservabilityEvent, 'createdAt'>) {
    logger.info('observability_event', { ...event, createdAt: new Date().toISOString() });
  },
  metric(point: Omit<MetricPoint, 'recordedAt'>) {
    logger.info('observability_metric', { ...point, recordedAt: new Date().toISOString() });
  },
};

