/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { getPermissions, PermissionSet } from '../lib/permissions';
import { User, UserRole } from '../types';
import { normalizeAuthError } from '../lib/authErrorNormalizer';
import { auditAuthEvent } from '../lib/authSecurityUtils';
import { authService, PROFILE_SETUP_INCOMPLETE_MESSAGE } from '../domains/auth/services/authService';
import { persistRecovery, recoveryPending } from '../lib/passwordRecovery';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  permissions: PermissionSet;
  subscriptionLocked: boolean;
  isPasswordRecovery: boolean;
  finishPasswordRecovery: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{ requiresOtp: boolean; email?: string }>;
  verifyEmailOtp: (email: string, otp: string) => Promise<void>;
  resendEmailOtp: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
};

export type UserMetadata = User;

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const INITIAL_SESSION_TIMEOUT_MS = 8_000;
const ACCOUNT_INACTIVE_MESSAGE = 'Your account is not active. Please contact your firm administrator.';
const ACCOUNT_PENDING_MESSAGE = 'Your registration is awaiting CAATH God Admin approval. You will be able to sign in after approval.';
const ACCOUNT_REJECTED_MESSAGE = 'Your CAATH registration was not approved. Please contact CAATH support if you need assistance.';
const WORKSPACE_SUSPENDED_MESSAGE = 'This CAATH workspace has been suspended. Please contact CAATH support.';

const getInitialSessionWithTimeout = async () => {
  let timeoutId: number | undefined;
  try {
    return await Promise.race([
      authService.getSession(),
      new Promise<never>((_, reject) => {
        timeoutId = window.setTimeout(() => reject(new Error('Authentication service timed out.')), INITIAL_SESSION_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeoutId !== undefined) window.clearTimeout(timeoutId);
  }
};

const isWorkspaceSubscriptionLocked = (user: User | null): boolean => {
  if (!user || user.role === 'GodAdmin') return false;
  const status = user.firm?.subscriptionStatus?.trim().toLowerCase();
  if (!status || status === 'active') return false;
  if (status === 'trial') {
    const expiry = user.firm?.subscriptionExpiryDate;
    if (!expiry) return false;
    const expiryTime = new Date(expiry).getTime();
    return Number.isFinite(expiryTime) && expiryTime < Date.now();
  }
  return true;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(recoveryPending);
  const recoveryRef = useRef(isPasswordRecovery);
  const profileRequest = useRef(0);
  const activeUserRef = useRef<User | null>(null);
  const subscriptionLocked = useMemo(() => isWorkspaceSubscriptionLocked(user), [user]);

  useEffect(() => { activeUserRef.current = user; }, [user]);

  const loadUserProfile = useCallback(async (activeSession: Session | null) => {
    const request = ++profileRequest.current;
    if (!activeSession || recoveryRef.current) {
      setUser(null);
      return;
    }

    const profile = await authService.resolveUserProfile(activeSession);
    if (request !== profileRequest.current || recoveryRef.current) return;
    if (!profile) {
      setUser(null);
      throw new Error(PROFILE_SETUP_INCOMPLETE_MESSAGE);
    }

    if (profile.status && profile.status.toLowerCase() !== 'active') {
      const profileStatus = profile.status.toLowerCase();
      setUser(null);
      setSession(null);
      try {
        await authService.logout(profile.id);
      } catch {
        // Local state is still cleared below so a disabled account cannot use the workspace shell.
      }
      if (profileStatus === 'pending approval') throw new Error(ACCOUNT_PENDING_MESSAGE);
      if (profileStatus === 'rejected') throw new Error(ACCOUNT_REJECTED_MESSAGE);
      throw new Error(ACCOUNT_INACTIVE_MESSAGE);
    }

    const graceEndsAt = profile.firm?.suspensionEffectiveAt ? new Date(profile.firm.suspensionEffectiveAt).getTime() : NaN;
    const workspaceAccessActive = profile.firm?.status === 'Active'
      || (
        profile.firm?.status === 'Suspended'
        && profile.firm.suspensionMode === 'Grace Period'
        && Number.isFinite(graceEndsAt)
        && graceEndsAt > Date.now()
      );
    if (profile.role !== 'GodAdmin' && profile.firmId && (!profile.firm || !workspaceAccessActive)) {
      setUser(null);
      setSession(null);
      try {
        await authService.logout(profile.id);
      } catch {
        // Local state is still cleared so a suspended workspace cannot use the app shell.
      }
      throw new Error(WORKSPACE_SUSPENDED_MESSAGE);
    }

    setUser((current) => {
      if (current && JSON.stringify(current) === JSON.stringify(profile)) return current;
      return profile;
    });
  }, []);

  const refreshUser = useCallback(async () => {
    setError(null);
    try {
      // Signup can finish before React has committed the auth-state callback.
      // Read the current Supabase session so the first workspace load never
      // depends on a stale `session === null` render closure.
      const activeSession = session ?? await authService.getSession();
      setSession(activeSession);
      await loadUserProfile(activeSession);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : 'Unable to load user profile.');
    }
  }, [loadUserProfile, session]);

  useEffect(() => {
    let mounted = true;
    persistRecovery(recoveryRef.current);

    const initializeAuth = async () => {
      setIsLoading(true);
      setError(null);
      let nextSession: Session | null = null;

      try {
        nextSession = await getInitialSessionWithTimeout();
        if (nextSession) {
          console.info('[AUTH] Session created', { source: 'src/context/AuthContext.tsx:78', userId: nextSession.user.id });
        }
        if (!mounted) return;

        if (nextSession?.expires_at && !authService.isSessionActive(nextSession.expires_at)) {
          setError('Session expired. Please login again.');
          setSession(null);
          setUser(null);
          setIsLoading(false);
          return;
        }

        setSession(nextSession);
        await loadUserProfile(nextSession);
      } catch (sessionError) {
        if (mounted) {
          const message = sessionError instanceof Error ? sessionError.message : '';
          setError([PROFILE_SETUP_INCOMPLETE_MESSAGE, ACCOUNT_INACTIVE_MESSAGE, ACCOUNT_PENDING_MESSAGE, ACCOUNT_REJECTED_MESSAGE].includes(message)
            ? message
            : normalizeAuthError(sessionError).userMessage);
          setSession(nextSession);
          setUser(null);
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    initializeAuth();

    const unsubscribe = authService.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;
      if (event === 'PASSWORD_RECOVERY') {
        recoveryRef.current = true;
        persistRecovery(true);
        setIsPasswordRecovery(true);
      }
      if (recoveryRef.current) {
        // USER_UPDATED and SIGNED_OUT must not unmount an in-flight reset form.
        ++profileRequest.current;
        setSession(nextSession);
        setUser(null);
        setIsLoading(false);
        return;
      }
      if (event === 'SIGNED_OUT') {
        ++profileRequest.current;
        setSession(null);
        setUser(null);
        setIsLoading(false);
        return;
      }
      if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED' || (event === 'SIGNED_IN' && activeUserRef.current)) {
        setSession(nextSession);
        if (nextSession) {
          setError(null);
          window.setTimeout(() => { if (!mounted) return; void loadUserProfile(nextSession)
            .catch((profileError) => {
              const message = profileError instanceof Error ? profileError.message : '';
              setError([PROFILE_SETUP_INCOMPLETE_MESSAGE, ACCOUNT_INACTIVE_MESSAGE, ACCOUNT_PENDING_MESSAGE, ACCOUNT_REJECTED_MESSAGE].includes(message)
                ? message
                : normalizeAuthError(profileError).userMessage);
            }); }, 0);
        }
        return;
      }
      if (nextSession) {
        console.info('[AUTH] Session created', { source: 'src/context/AuthContext.tsx:109', userId: nextSession.user.id });
      }
      if (nextSession?.expires_at && !authService.isSessionActive(nextSession.expires_at)) {
        setSession(null);
        setUser(null);
        setError('Session expired. Please login again.');
        return;
      }

      setSession(nextSession);
      setIsLoading(true);
      setError(null);

      // Supabase callbacks run under its auth lock; defer any data/API work.
      window.setTimeout(() => { if (!mounted) return; void loadUserProfile(nextSession)
        .catch((profileError) => {
          const message = profileError instanceof Error ? profileError.message : '';
          setError([PROFILE_SETUP_INCOMPLETE_MESSAGE, ACCOUNT_INACTIVE_MESSAGE, ACCOUNT_PENDING_MESSAGE, ACCOUNT_REJECTED_MESSAGE].includes(message)
            ? message
            : normalizeAuthError(profileError).userMessage);
        })
        .finally(() => { if (mounted) setIsLoading(false); }); }, 0);
    });

    return () => {
      mounted = false;
      ++profileRequest.current;
      unsubscribe();
    };
  }, [loadUserProfile]);

  const finishPasswordRecovery = useCallback(async () => {
    // Keep the recovery gate closed unless provider sign-out succeeds.
    await authService.logout();
    ++profileRequest.current;
    setSession(null);
    setUser(null);
    setError(null);
    setIsLoading(false);
    recoveryRef.current = false;
    persistRecovery(false);
    setIsPasswordRecovery(false);
  }, []);

  useEffect(() => {
    if (!session) return;

    const interval = window.setInterval(async () => {
      try {
        const refreshed = await authService.refreshSession();
        if (!refreshed) {
          setError('Session expired. Please login again.');
          setSession(null);
          setUser(null);
          return;
        }
        setSession(refreshed);
        await auditAuthEvent('session_refresh', user?.id, { refreshedAt: new Date().toISOString() });
      } catch {
        setError('Session expired. Please login again.');
        setSession(null);
        setUser(null);
      }
    }, 10 * 60 * 1000);

    return () => window.clearInterval(interval);
  }, [session, user?.id]);

  useEffect(() => {
    if (!session || !user) return;

    const verifyAccountAccess = () => {
      if (document.visibilityState === 'hidden') return;
      void loadUserProfile(session).catch((profileError) => {
        const message = profileError instanceof Error ? profileError.message : '';
        setError([ACCOUNT_INACTIVE_MESSAGE, ACCOUNT_PENDING_MESSAGE, ACCOUNT_REJECTED_MESSAGE].includes(message) ? message : normalizeAuthError(profileError).userMessage);
      });
    };

    const interval = window.setInterval(verifyAccountAccess, 30_000);
    window.addEventListener('focus', verifyAccountAccess);
    document.addEventListener('visibilitychange', verifyAccountAccess);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', verifyAccountAccess);
      document.removeEventListener('visibilitychange', verifyAccountAccess);
    };
  }, [loadUserProfile, session, user?.id]);

  const login = useCallback(async (email: string, password: string, rememberMe?: boolean) => {
    setError(null);
    setIsPasswordRecovery(false);
    try {
      return await authService.login({ email, password, rememberMe });
    } catch (loginError) {
      const safeError = normalizeAuthError(loginError);
      setError(safeError.userMessage);
      throw new Error(safeError.userMessage);
    }
  }, []);

  const verifyEmailOtp = useCallback(async (email: string, otp: string) => {
    setError(null);
    try {
      await authService.verifyEmailOtp(email, otp);
    } catch (otpError) {
      const safeError = normalizeAuthError(otpError);
      setError(safeError.userMessage);
      throw new Error(safeError.userMessage);
    }
  }, []);

  const resendEmailOtp = useCallback(async (email: string) => {
    setError(null);
    try {
      await authService.resendEmailOtp(email);
    } catch (resendError) {
      const safeError = normalizeAuthError(resendError);
      setError(safeError.userMessage);
      throw new Error(safeError.userMessage);
    }
  }, []);

  const logout = useCallback(async () => {
    setError(null);
    try {
      console.warn('[AUTH] Logout requested by src/context/AuthContext.tsx:195');
      await authService.logout(user?.id);
      setSession(null);
      setUser(null);
      setIsPasswordRecovery(false);
    } catch (logoutError) {
      const safeError = normalizeAuthError(logoutError);
      setError(safeError.userMessage);
      throw logoutError;
    }
  }, [user?.id]);

  const hasRole = useCallback((roles: UserRole | UserRole[]) => {
    if (!user) return false;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    return allowedRoles.includes(user.role);
  }, [user]);

  const permissions = useMemo(() => getPermissions(user), [user]);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user,
    permissions,
    subscriptionLocked,
    isPasswordRecovery,
    finishPasswordRecovery,
    isLoading,
    error,
    login,
    verifyEmailOtp,
    resendEmailOtp,
    logout,
    refreshUser,
    hasRole,
  }), [session, user, permissions, subscriptionLocked, isPasswordRecovery, finishPasswordRecovery, isLoading, error, login, verifyEmailOtp, resendEmailOtp, logout, refreshUser, hasRole]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }
  return context;
};
