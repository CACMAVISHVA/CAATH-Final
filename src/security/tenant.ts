export const assertTenantIdPresent = (tenantId?: string | null): string => {
  if (!tenantId) {
    throw new Error('Tenant context is required for this operation.');
  }
  return tenantId;
};

export const isTenantScopedRole = (role: string): boolean =>
  ['SuperAdmin', 'Admin', 'Staff', 'Client'].includes(role);
