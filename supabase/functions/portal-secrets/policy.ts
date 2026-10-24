export interface VaultActor { id: string; role: string; firm_id: string | null; }
export function canManageVault(actor: VaultActor) { return ['SuperAdmin', 'Admin'].includes(actor.role) && !!actor.firm_id; }
export function canAccessVault(actor: VaultActor, row: { firm_id: string; assigned_to?: string | null }) {
 return !!actor.firm_id && actor.firm_id === row.firm_id && (canManageVault(actor) || (actor.role === 'Staff' && row.assigned_to === actor.id));
}
// Call only after getUser has verified the bearer token. iat is not proof of fresh authentication.
export function hasRecentAuthentication(verifiedToken: string, nowSeconds = Date.now()/1000) {
 try {
  const payload = JSON.parse(atob(verifiedToken.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
  return Array.isArray(payload.amr) && payload.amr.some((entry: { method?: string; timestamp?: number }) =>
   ['password','otp','totp','mfa/totp','mfa/phone'].includes(entry.method || '') && typeof entry.timestamp === 'number' && entry.timestamp <= nowSeconds + 30 && nowSeconds-entry.timestamp <= 300);
 } catch { return false; }
}
