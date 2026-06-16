import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { User, UserRole } from '../types';

export type OtpRequirementMode = 'admins' | 'staff' | 'all';

export type AuthSecuritySettings = {
  firmId: string | null;
  otpEnabled: boolean;
  otpRequirementMode: OtpRequirementMode;
  otpExpiryMinutes: number;
  otpAttemptLimit: number;
  otpResendLimit: number;
  otpResendWindowMinutes: number;
  otpResendCooldownSeconds: number;
  failedPasswordLimit: number;
  lockoutMinutes: number;
  sessionTimeoutMinutes: number;
  rememberMeSessionDays: number;
};

export type LoginActivityEvent = {
  firmId?: string | null;
  userId?: string | null;
  authId?: string | null;
  email: string;
  status: 'Success' | 'Failure';
  eventType:
    | 'password_login'
    | 'otp_generated'
    | 'otp_sent'
    | 'otp_verified'
    | 'otp_failed'
    | 'otp_expired'
    | 'otp_resent'
    | 'password_reset'
    | 'logout'
    | 'new_device'
    | 'user_provisioned';
  otpStatus?: 'Not Required' | 'Pending' | 'Verified' | 'Failed' | 'Expired';
  details?: Record<string, unknown>;
};

const DEFAULT_SECURITY_SETTINGS: AuthSecuritySettings = {
  firmId: null,
  otpEnabled: true,
  otpRequirementMode: 'admins',
  otpExpiryMinutes: 5,
  otpAttemptLimit: 5,
  otpResendLimit: 3,
  otpResendWindowMinutes: 10,
  otpResendCooldownSeconds: 30,
  failedPasswordLimit: 5,
  lockoutMinutes: 15,
  sessionTimeoutMinutes: 60,
  rememberMeSessionDays: 30,
};

const PENDING_OTP_KEY = 'caath:pending-otp';
const OTP_ATTEMPT_KEY = 'caath:otp-attempts';
const OTP_RESEND_KEY = 'caath:otp-resends';

export const getBrowserFingerprint = () => {
  const bits = [
    navigator.userAgent,
    navigator.language,
    `${screen.width}x${screen.height}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ];
  return btoa(unescape(encodeURIComponent(bits.join('|')))).slice(0, 96);
};

export const getDeviceLabel = () => {
  const ua = navigator.userAgent;
  const browser = ua.includes('Edg/')
    ? 'Microsoft Edge'
    : ua.includes('Chrome/')
      ? 'Chrome'
      : ua.includes('Firefox/')
        ? 'Firefox'
        : ua.includes('Safari/')
          ? 'Safari'
          : 'Browser';
  const platform = navigator.platform || 'Unknown platform';
  return `${browser} on ${platform}`;
};

const mapSettingsRow = (row: any): AuthSecuritySettings => ({
  firmId: row?.firm_id ?? null,
  otpEnabled: row?.otp_enabled ?? DEFAULT_SECURITY_SETTINGS.otpEnabled,
  otpRequirementMode: row?.otp_requirement_mode ?? DEFAULT_SECURITY_SETTINGS.otpRequirementMode,
  otpExpiryMinutes: row?.otp_expiry_minutes ?? DEFAULT_SECURITY_SETTINGS.otpExpiryMinutes,
  otpAttemptLimit: row?.otp_attempt_limit ?? DEFAULT_SECURITY_SETTINGS.otpAttemptLimit,
  otpResendLimit: row?.otp_resend_limit ?? DEFAULT_SECURITY_SETTINGS.otpResendLimit,
  otpResendWindowMinutes: row?.otp_resend_window_minutes ?? DEFAULT_SECURITY_SETTINGS.otpResendWindowMinutes,
  otpResendCooldownSeconds: row?.otp_resend_cooldown_seconds ?? DEFAULT_SECURITY_SETTINGS.otpResendCooldownSeconds,
  failedPasswordLimit: row?.failed_password_limit ?? DEFAULT_SECURITY_SETTINGS.failedPasswordLimit,
  lockoutMinutes: row?.lockout_minutes ?? DEFAULT_SECURITY_SETTINGS.lockoutMinutes,
  sessionTimeoutMinutes: row?.session_timeout_minutes ?? DEFAULT_SECURITY_SETTINGS.sessionTimeoutMinutes,
  rememberMeSessionDays: row?.remember_me_session_days ?? DEFAULT_SECURITY_SETTINGS.rememberMeSessionDays,
});

export const authSecurityService = {
  async getSettings(firmId?: string | null): Promise<AuthSecuritySettings> {
    if (!firmId) return DEFAULT_SECURITY_SETTINGS;
    const { data, error } = await supabase
      .from('auth_security_settings')
      .select('*')
      .eq('firm_id', firmId)
      .maybeSingle();
    if (error) return DEFAULT_SECURITY_SETTINGS;
    return mapSettingsRow(data);
  },

  async updateSettings(firmId: string, settings: Partial<AuthSecuritySettings>) {
    const payload = {
      firm_id: firmId,
      otp_enabled: settings.otpEnabled,
      otp_requirement_mode: settings.otpRequirementMode,
      otp_expiry_minutes: settings.otpExpiryMinutes,
      otp_attempt_limit: settings.otpAttemptLimit,
      otp_resend_limit: settings.otpResendLimit,
      otp_resend_window_minutes: settings.otpResendWindowMinutes,
      otp_resend_cooldown_seconds: settings.otpResendCooldownSeconds,
      failed_password_limit: settings.failedPasswordLimit,
      lockout_minutes: settings.lockoutMinutes,
      session_timeout_minutes: settings.sessionTimeoutMinutes,
      remember_me_session_days: settings.rememberMeSessionDays,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from('auth_security_settings')
      .upsert(payload, { onConflict: 'firm_id' });
    if (error) throw error;
  },

  requiresOtp(user: User, settings: AuthSecuritySettings) {
    if (!settings.otpEnabled) return false;
    if (settings.otpRequirementMode === 'all') return true;
    if (settings.otpRequirementMode === 'staff') return user.role !== 'Client';
    return user.role === 'SuperAdmin' || user.role === 'Admin' || user.role === 'GodAdmin';
  },

  async sendEmailOtp(email: string, settings: AuthSecuritySettings, user?: User | null) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        data: {
          caath_otp_expiry_minutes: settings.otpExpiryMinutes,
          caath_otp_channel: 'email',
        },
      },
    });
    if (error) throw error;

    const expiresAt = new Date(Date.now() + settings.otpExpiryMinutes * 60 * 1000).toISOString();
    sessionStorage.setItem(PENDING_OTP_KEY, JSON.stringify({ email, expiresAt, userId: user?.id ?? null, firmId: user?.firmId ?? null }));
    sessionStorage.setItem(OTP_ATTEMPT_KEY, JSON.stringify({ email, count: 0 }));
    this.recordResend(email);
    await this.recordLoginActivity({
      firmId: user?.firmId,
      userId: user?.id,
      authId: user?.authId,
      email,
      status: 'Success',
      eventType: 'otp_sent',
      otpStatus: 'Pending',
      details: { channel: 'email', expiresAt },
    });
  },

  async verifyEmailOtp(email: string, token: string): Promise<Session | null> {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });
    if (error) throw error;
    sessionStorage.removeItem(PENDING_OTP_KEY);
    sessionStorage.removeItem(OTP_ATTEMPT_KEY);
    return data.session;
  },

  getPendingOtp(): { email: string; expiresAt: string; userId?: string | null; firmId?: string | null } | null {
    const raw = sessionStorage.getItem(PENDING_OTP_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed?.email || !parsed?.expiresAt) return null;
      return parsed;
    } catch {
      return null;
    }
  },

  isPendingOtpExpired() {
    const pending = this.getPendingOtp();
    return Boolean(pending && new Date(pending.expiresAt).getTime() <= Date.now());
  },

  incrementAttempt(email: string) {
    const raw = sessionStorage.getItem(OTP_ATTEMPT_KEY);
    const current = raw ? JSON.parse(raw) : { email, count: 0 };
    const next = { email, count: email === current.email ? current.count + 1 : 1 };
    sessionStorage.setItem(OTP_ATTEMPT_KEY, JSON.stringify(next));
    return next.count;
  },

  getAttemptCount(email: string) {
    const raw = sessionStorage.getItem(OTP_ATTEMPT_KEY);
    if (!raw) return 0;
    const current = JSON.parse(raw);
    return current.email === email ? current.count : 0;
  },

  getResendState(email: string) {
    const raw = sessionStorage.getItem(OTP_RESEND_KEY);
    const now = Date.now();
    if (!raw) return { count: 0, firstAt: now, lastAt: 0 };
    const current = JSON.parse(raw);
    return current.email === email ? current : { count: 0, firstAt: now, lastAt: 0 };
  },

  recordResend(email: string) {
    const current = this.getResendState(email);
    const now = Date.now();
    const next = { email, count: current.count + 1, firstAt: current.firstAt || now, lastAt: now };
    sessionStorage.setItem(OTP_RESEND_KEY, JSON.stringify(next));
    return next;
  },

  canResend(email: string, settings: AuthSecuritySettings) {
    const state = this.getResendState(email);
    const now = Date.now();
    const windowMs = settings.otpResendWindowMinutes * 60 * 1000;
    const cooldownMs = settings.otpResendCooldownSeconds * 1000;
    const inWindow = state.firstAt && now - state.firstAt <= windowMs;
    if (state.lastAt && now - state.lastAt < cooldownMs) {
      return { allowed: false, waitSeconds: Math.ceil((cooldownMs - (now - state.lastAt)) / 1000), reason: 'cooldown' as const };
    }
    if (inWindow && state.count >= settings.otpResendLimit) {
      return { allowed: false, waitSeconds: Math.ceil((windowMs - (now - state.firstAt)) / 1000), reason: 'limit' as const };
    }
    return { allowed: true, waitSeconds: 0, reason: null };
  },

  async recordLoginActivity(event: LoginActivityEvent) {
    const { error } = await supabase.from('login_activity').insert([{
      firm_id: event.firmId ?? null,
      user_id: event.userId ?? null,
      auth_id: event.authId ?? null,
      email: event.email,
      status: event.status,
      event_type: event.eventType,
      otp_status: event.otpStatus ?? null,
      device_fingerprint: getBrowserFingerprint(),
      device_label: getDeviceLabel(),
      user_agent: navigator.userAgent,
      details: event.details ?? {},
      created_at: new Date().toISOString(),
    }]);
    if (error) {
      console.warn('[AUTH] login_activity unavailable', error);
      console.warn('Unable to record login activity', error);
    }
  },

  async listLoginActivity(firmId: string, ownUserId?: string, orgWide = false) {
    let query = supabase
      .from('login_activity')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    query = orgWide ? query.eq('firm_id', firmId) : query.eq('user_id', ownUserId ?? '');
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async listTrustedDevices(userId: string) {
    const { data, error } = await supabase
      .from('trusted_devices')
      .select('*')
      .eq('user_id', userId)
      .order('last_seen_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async revokeTrustedDevice(deviceId: string) {
    const { error } = await supabase
      .from('trusted_devices')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', deviceId);
    if (error) throw error;
  },
};
