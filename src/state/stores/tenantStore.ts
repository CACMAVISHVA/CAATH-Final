import { createStore } from '../core/createStore';

type TenantState = {
  tenantId: string | null;
  tenantName: string | null;
};

export const tenantStore = createStore<TenantState>({
  tenantId: null,
  tenantName: null,
});
