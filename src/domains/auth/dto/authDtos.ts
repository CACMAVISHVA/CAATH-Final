import { User, UserRole, WorkspaceSubscriptionPlan, SubscriptionStatus } from '../../../types';

export type LoginRequestDto = {
  email: string;
  password: string;
};

export type AuthProfileDto = User;

export type CreateProfileDto = {
  authId: string;
  email: string;
  name: string;
  role: UserRole;
  firmId: string | null;
  isWorkspaceOwner?: boolean;
};

export type WorkspaceRegistrationDto = {
  firmName: string;
  fullName: string;
  email: string;
  mobile: string;
  password: string;
  gstin?: string;
  subscriptionPlan: WorkspaceSubscriptionPlan;
};

export type WorkspaceSubscriptionDto = {
  plan: WorkspaceSubscriptionPlan;
  status: SubscriptionStatus;
};
