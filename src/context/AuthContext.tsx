/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { getPermissions, PermissionSet } from '../lib/permissions';
import { User, UserRole } from '../types';
import { normalizeAuthError } from '../lib/authErrorNormalizer';
import { auditAuthEvent } from '../lib/authSecurityUtils';
import { authService } from '../domains/auth/services/authService';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  permissions: PermissionSet;
  subscriptionLocked: boolean;
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const subscriptionLocked = useMemo(() => {
    if (!user || user.role === 'GodAdmin') return false;
    const status = user.firm?.subscriptionStatus;
    return Boolean(status && status !== 'Active' && status !== 'Trial');
  }, [user]);

  const loadUserProfile = useCallback(async (activeSession: Session | null) => {
    if (!activeSession) {
      setUser(null);
      return;
    }

    const profile = await authService.resolveUserProfile(activeSession);
    if (!profile) {
      setUser(null);
      return;
    }

    if (profile.status && profile.status.toLowerCase() !== 'active') {
      setUser(null);
      throw new Error('Your account is not active. Please contact your firm administrator.');
    }

    setUser(profile);
  }, []);

  const refreshUser = useCallback(async () => {
    setError(null);
    try {
      await loadUserProfile(session);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : 'Unable to load user profile.');
    }
  }, [loadUserProfile, session]);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      setIsLoading(true);
      setError(null);
      let nextSession: Session | null = null;

      try {
        nextSession = await authService.getSession();
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
          const safeError = normalizeAuthError(sessionError);
          setError(safeError.userMessage);
          setSession(nextSession);
          setUser(null);
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    initializeAuth();

    const unsubscribe = authService.onAuthStateChange((nextSession) => {
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

      loadUserProfile(nextSession)
        .catch((profileError) => {
          const safeError = normalizeAuthError(profileError);
          setError(safeError.userMessage);
        })
        .finally(() => setIsLoading(false));
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [loadUserProfile]);

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

  const login = useCallback(async (email: string, password: string, rememberMe?: boolean) => {
    setError(null);
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
    isLoading,
    error,
    login,
    verifyEmailOtp,
    resendEmailOtp,
    logout,
    refreshUser,
    hasRole,
  }), [session, user, permissions, subscriptionLocked, isLoading, error, login, verifyEmailOtp, resendEmailOtp, logout, refreshUser, hasRole]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }
  return context;
};
