import { User, UserRole } from '../../../types';

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
};
