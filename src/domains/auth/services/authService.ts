import { normalizeAuthError } from '../../../lib/authErrorNormalizer';
import { auditAuthEvent, enforceLoginRateLimit, isSessionValid, performSecureLogout } from '../../../lib/authSecurityUtils';
import { UserRole } from '../../../types';
import { LoginRequestDto } from '../dto/authDtos';
import { SupabaseAuthRepository } from '../repositories/SupabaseAuthRepository';
import { authProfileRepository } from '../repositories/SupabaseAuthProfileRepository';

const authRepository = new SupabaseAuthRepository();

const resolveSafeRequestedRole = (role: unknown): UserRole => {
  if (role === 'Client') return 'Client';
  return 'Staff';
};

export const authService = {
  async login(request: LoginRequestDto): Promise<void> {
    enforceLoginRateLimit(request.email);
    try {
      await authRepository.signIn(request.email.trim(), request.password);
      await auditAuthEvent('login', undefined, { timestamp: new Date().toISOString() });
    } catch (error) {
      const safeError = normalizeAuthError(error);
      await auditAuthEvent('failed_login', undefined, { errorCode: safeError.code, timestamp: new Date().toISOString() });
      throw new Error(safeError.userMessage);
    }
  },

  async logout(userId?: string): Promise<void> {
    await performSecureLogout(async () => {
      await authRepository.signOut();
    });
    await auditAuthEvent('logout', userId, { timestamp: new Date().toISOString() });
  },

  async getSession() {
    return authRepository.getSession();
  },

  async refreshSession() {
    return authRepository.refreshSession();
  },

  async sendPasswordReset(email: string, redirectTo: string): Promise<void> {
    try {
      await authRepository.sendPasswordReset(email.trim(), redirectTo);
      await auditAuthEvent('password_reset', undefined, { timestamp: new Date().toISOString(), stage: 'requested' });
    } catch (error) {
      const safeError = normalizeAuthError(error);
      await auditAuthEvent('password_reset', undefined, { errorCode: safeError.code, timestamp: new Date().toISOString(), stage: 'request_failed' });
      throw new Error(safeError.userMessage);
    }
  },

  async updatePassword(password: string): Promise<void> {
    try {
      await authRepository.updatePassword(password);
      await auditAuthEvent('password_reset', undefined, { timestamp: new Date().toISOString(), stage: 'updated' });
    } catch (error) {
      const safeError = normalizeAuthError(error);
      await auditAuthEvent('password_reset', undefined, { errorCode: safeError.code, timestamp: new Date().toISOString(), stage: 'update_failed' });
      throw new Error(safeError.userMessage);
    }
  },

  onAuthStateChange(handler: Parameters<SupabaseAuthRepository['onAuthStateChange']>[0]) {
    return authRepository.onAuthStateChange(handler);
  },

  isSessionActive(expiresAt?: number | null) {
    if (!expiresAt) return true;
    return isSessionValid(expiresAt);
  },

  async resolveUserProfile(session: Awaited<ReturnType<SupabaseAuthRepository['getSession']>>) {
    if (!session) return null;
    const existing = await authProfileRepository.findByAuthId(session.user.id);
    if (existing) return existing;

    const metadata = session.user.user_metadata || {};
    const role = resolveSafeRequestedRole(metadata.requested_role);
    const name = typeof metadata.full_name === 'string' && metadata.full_name.trim().length > 0
      ? metadata.full_name.trim()
      : (session.user.email?.split('@')[0] || 'New User');
    const firmId = role === 'Client' && typeof metadata.requested_firm_id === 'string' && metadata.requested_firm_id.trim().length > 0
      ? metadata.requested_firm_id.trim()
      : null;

    return authProfileRepository.createProfile({
      authId: session.user.id,
      email: session.user.email || '',
      name,
      role,
      firmId,
    });
  },
};
