import { normalizeAuthError } from '../../../lib/authErrorNormalizer';
import { auditAuthEvent, enforceLoginRateLimit, isSessionValid, performSecureLogout } from '../../../lib/authSecurityUtils';
import { LoginRequestDto } from '../dto/authDtos';
import { SupabaseAuthRepository } from '../repositories/SupabaseAuthRepository';
import { authProfileRepository } from '../repositories/SupabaseAuthProfileRepository';
import { authSecurityService } from '../../../services/authSecurityService';

const authRepository = new SupabaseAuthRepository();
export const PROFILE_SETUP_INCOMPLETE_MESSAGE = 'Profile not found. Workspace setup incomplete.';

export const authService = {
  async login(request: LoginRequestDto): Promise<{ requiresOtp: boolean; email?: string }> {
    enforceLoginRateLimit(request.email);
    try {
      await authRepository.signIn(request.email.trim(), request.password);
      const session = await authRepository.getSession();
      const profile = await this.resolveUserProfile(session);
      const settings = await authSecurityService.getSettings(profile?.firmId);

      if (profile && authSecurityService.requiresOtp(profile, settings)) {
        await authSecurityService.recordLoginActivity({
          firmId: profile.firmId,
          userId: profile.id,
          authId: profile.authId,
          email: request.email.trim(),
          status: 'Success',
          eventType: 'password_login',
          otpStatus: 'Pending',
          details: { otpRequired: true },
        });
        await authSecurityService.sendEmailOtp(request.email.trim(), settings, profile);
        await auditAuthEvent('otp_generated', profile.id, { timestamp: new Date().toISOString(), channel: 'email' });
        console.warn('[AUTH] Logout requested by src/domains/auth/services/authService.ts:40 (OTP delivery initialized after password login)');
        await authRepository.signOut();
        return { requiresOtp: true, email: request.email.trim() };
      }

      await authSecurityService.recordLoginActivity({
        firmId: profile?.firmId,
        userId: profile?.id,
        authId: profile?.authId,
        email: request.email.trim(),
        status: 'Success',
        eventType: 'password_login',
        otpStatus: 'Not Required',
        details: { otpRequired: false },
      });
      await auditAuthEvent('login', profile?.id, { timestamp: new Date().toISOString() });
      return { requiresOtp: false };
    } catch (error) {
      if (error instanceof Error && error.message === PROFILE_SETUP_INCOMPLETE_MESSAGE) {
        await authSecurityService.recordLoginActivity({
          email: request.email.trim(),
          status: 'Failure',
          eventType: 'password_login',
          otpStatus: 'Not Required',
          details: { errorCode: 'PROFILE_NOT_FOUND' },
        });
        await auditAuthEvent('failed_login', undefined, { errorCode: 'PROFILE_NOT_FOUND', timestamp: new Date().toISOString() });
        throw error;
      }
      const safeError = normalizeAuthError(error);
      await authSecurityService.recordLoginActivity({
        email: request.email.trim(),
        status: 'Failure',
        eventType: 'password_login',
        otpStatus: 'Not Required',
        details: { errorCode: safeError.code },
      });
      await auditAuthEvent('failed_login', undefined, { errorCode: safeError.code, timestamp: new Date().toISOString() });
      throw new Error(safeError.userMessage);
    }
  },

  async verifyEmailOtp(email: string, otp: string): Promise<void> {
    const pending = authSecurityService.getPendingOtp();
    const settings = await authSecurityService.getSettings(pending?.firmId);
    if (authSecurityService.isPendingOtpExpired()) {
      await authSecurityService.recordLoginActivity({
        firmId: pending?.firmId,
        userId: pending?.userId,
        email: email.trim(),
        status: 'Failure',
        eventType: 'otp_expired',
        otpStatus: 'Expired',
      });
      throw new Error('This OTP has expired. Please request a new code.');
    }
    if (authSecurityService.getAttemptCount(email.trim()) >= settings.otpAttemptLimit) {
      throw new Error('Too many OTP attempts. Please request a new code.');
    }
    try {
      await authSecurityService.verifyEmailOtp(email.trim(), otp.trim());
      const session = await authRepository.getSession();
      const profile = await this.resolveUserProfile(session);
      await authSecurityService.recordLoginActivity({
        firmId: profile?.firmId,
        userId: profile?.id,
        authId: profile?.authId,
        email: email.trim(),
        status: 'Success',
        eventType: 'otp_verified',
        otpStatus: 'Verified',
      });
      await auditAuthEvent('otp_verified', profile?.id, { timestamp: new Date().toISOString(), channel: 'email' });
    } catch (error) {
      const attemptCount = authSecurityService.incrementAttempt(email.trim());
      await authSecurityService.recordLoginActivity({
        email: email.trim(),
        status: 'Failure',
        eventType: 'otp_failed',
        otpStatus: authSecurityService.isPendingOtpExpired() ? 'Expired' : 'Failed',
        details: { attemptCount },
      });
      throw error;
    }
  },

  async resendEmailOtp(email: string): Promise<void> {
    const pending = authSecurityService.getPendingOtp();
    const settings = await authSecurityService.getSettings(pending?.firmId);
    const canResend = authSecurityService.canResend(email.trim(), settings);
    if (!canResend.allowed) {
      throw new Error(canResend.reason === 'cooldown'
        ? `Please wait ${canResend.waitSeconds} seconds before requesting another OTP.`
        : 'OTP resend limit reached. Please wait before trying again.');
    }
    await authSecurityService.sendEmailOtp(email.trim(), settings, null);
    await authSecurityService.recordLoginActivity({
      firmId: pending?.firmId,
      userId: pending?.userId,
      email: email.trim(),
      status: 'Success',
      eventType: 'otp_resent',
      otpStatus: 'Pending',
    });
  },

  async logout(userId?: string): Promise<void> {
    await performSecureLogout(async () => {
      console.warn('[AUTH] Logout requested by src/domains/auth/services/authService.ts:135 (explicit logout)');
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
    throw new Error(PROFILE_SETUP_INCOMPLETE_MESSAGE);
  },
};
