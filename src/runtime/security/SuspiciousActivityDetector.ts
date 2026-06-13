import { SecuritySignal } from './types';

export class SuspiciousActivityDetector {
  isSuspicious(signal: SecuritySignal): boolean {
    return signal.score >= 75;
  }
}

