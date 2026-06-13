import { RuntimeAnomalySignal } from './types';

type AnomalyHandler = (signal: RuntimeAnomalySignal) => void | Promise<void>;

export class RuntimeAnomalyHooks {
  private handlers = new Set<AnomalyHandler>();

  onDetected(handler: AnomalyHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  async emit(signal: RuntimeAnomalySignal): Promise<void> {
    for (const handler of this.handlers) {
      await handler(signal);
    }
  }
}

