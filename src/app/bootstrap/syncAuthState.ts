import { authStore, tenantStore } from '../../state';
import { User } from '../../types.ts';

export const syncAuthState = (user: User | null) => {
  authStore.setState({
    userId: user?.id ?? null,
    role: user?.role ?? null,
    isAuthenticated: Boolean(user),
  });

  tenantStore.setState({
    tenantId: user?.firmId ?? null,
    tenantName: null,
  });
};
