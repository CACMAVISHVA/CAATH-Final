import { createStore } from '../core/createStore';

type AuthState = {
  userId: string | null;
  role: string | null;
  isAuthenticated: boolean;
};

export const authStore = createStore<AuthState>({
  userId: null,
  role: null,
  isAuthenticated: false,
});
