const RECOVERY_KEY = 'caath-password-recovery';

export function hasRecoveryLink(): boolean {
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.slice(1));
  return query.get('auth') === 'recovery' || query.get('type') === 'recovery' || hash.get('type') === 'recovery';
}

export function recoveryPending(): boolean {
  try { return hasRecoveryLink() || sessionStorage.getItem(RECOVERY_KEY) === 'pending'; }
  catch { return hasRecoveryLink(); }
}

export function persistRecovery(pending: boolean): void {
  try {
    if (pending) sessionStorage.setItem(RECOVERY_KEY, 'pending');
    else sessionStorage.removeItem(RECOVERY_KEY);
  } catch { /* Recovery still works when storage is unavailable. */ }
}

export function recoveryLinkError(): string | null {
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.slice(1));
  return query.has('error') || hash.has('error')
    ? 'This reset link has expired or has already been used. Please request a fresh link.'
    : null;
}
