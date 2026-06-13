import { logger } from '../../infrastructure/monitoring/logger';
import { telemetry } from '../../infrastructure/monitoring/telemetry';
import { RuntimeTelemetryEngine } from '../observability';

export class RuntimeObservabilityService {
  readonly engine = new RuntimeTelemetryEngine();

  log(event: string, context?: Record<string, unknown>): void {
    logger.info(event, { module: 'runtime', ...(context || {}) });
  }

  error(event: string, context?: Record<string, unknown>): void {
    logger.error(event, { module: 'runtime', ...(context || {}) });
  }

  metric(name: string, value: number, tags?: Record<string, string>, tenantId?: string): void {
    this.engine.recordMetric({ name, value, tags, tenantId });
    telemetry.track({ name, metrics: { value }, tags });
  }
}

export const runtimeObservabilityService = new RuntimeObservabilityService();

