import { User } from '../types';
import {
  operationalAssistanceOrchestrator,
  AssistanceCategory,
  OperationalAssistanceRecommendation,
  OperationalAssistanceSnapshot,
} from '../domains/operations/services/operationalAssistanceOrchestrator';

export type { AssistanceCategory, OperationalAssistanceRecommendation, OperationalAssistanceSnapshot };

export const getOperationalAssistanceSnapshot = async (user: User): Promise<OperationalAssistanceSnapshot> =>
  operationalAssistanceOrchestrator.getSnapshot(user);
