import { User, UserRole } from '../types';
import { EnterpriseActivity } from './observabilityService';
import {
  operationalCollaborationOrchestrator,
  CollaborationDiscussionInput,
  CollaborationThreadSummary,
  CollaborationIntelligenceSummary,
  OperationalTimelineSnapshot,
} from '../domains/operations/services/operationalCollaborationOrchestrator';
import { CollaborationEntityType } from '../domains/operations/policies/collaborationPolicies';

export type {
  CollaborationEntityType,
  CollaborationDiscussionInput,
  CollaborationThreadSummary,
  CollaborationIntelligenceSummary,
  OperationalTimelineSnapshot,
};

export const postOperationalDiscussion = (input: CollaborationDiscussionInput, actor: User) =>
  operationalCollaborationOrchestrator.postOperationalDiscussion(input, actor);

export const getOperationalTimelineSnapshot = (user: User, limit = 80): Promise<OperationalTimelineSnapshot> =>
  operationalCollaborationOrchestrator.getOperationalTimelineSnapshot(user, limit);
