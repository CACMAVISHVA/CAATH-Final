/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Authentication Security Utilities
 * 
 * Provides enterprise-grade auth security practices:
 * - Secure credential handling
 * - Safe error normalization
 * - Session validation
 * - Token management
 * - Secure logout cleanup
 */

/**
 * Validate email format
 * @param email Email to validate
 * @returns true if valid email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 * @param password Password to validate
 * @returns Validation result with details
 */
export const validatePasswordStrength = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain an uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain a lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain a number');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Sanitize credentials before transmission
 * IMPORTANT: This does NOT encrypt - encryption happens at transport layer (HTTPS)
 * This only ensures credentials are not stored or logged in plaintext
 * @param email Email address
 * @param password Password
 * @returns Sanitized credential object (password reference, not value)
 */
export const sanitizeCredentials = (email: string, password: string): { email: string } => {
  // Never return password value
  // Only return email (already sanitized via user input)
  return {
    email: email.trim().toLowerCase(),
  };
};

/**
 * Clear sensitive data from memory
 * @param data Object to clear
 */
export const clearSensitiveData = (data: Record<string, any>): void => {
  Object.keys(data).forEach((key) => {
    if (typeof data[key] === 'string') {
      data[key] = '';
    } else if (typeof data[key] === 'object') {
      clearSensitiveData(data[key]);
    }
  });
};

/**
 * Secure logout handler
 * Clears all authentication-related data and sessions
 * @param clearCallback Callback to execute during logout (e.g., Supabase logout)
 */
export const performSecureLogout = async (clearCallback?: () => Promise<void>): Promise<void> => {
  try {
    // Execute provider logout if provided
    if (clearCallback) {
      await clearCallback();
    }

    // Clear authentication tokens from localStorage
    sessionStorage.clear();

    // Clear any sensitive cookies/session data
    // (Browser will handle secure cookies automatically)

  } catch (error) {
    throw new Error('Logout failed. Please refresh and try again.');
  }
};

/**
 * Validate session expiration
 * @param sessionExpiresAt ISO timestamp of session expiration (optional)
 * @returns true if session is still valid or has no expiration set
 */
export const isSessionValid = (sessionExpiresAt?: string | number): boolean => {
  // If no expiration is set, trust that Supabase manages it properly
  if (!sessionExpiresAt) return true;

  const expiryTime = typeof sessionExpiresAt === 'string' 
    ? new Date(sessionExpiresAt).getTime() 
    : sessionExpiresAt * 1000; // Handle Unix timestamp in seconds
  const currentTime = new Date().getTime();

  // Only invalidate if we're past the expiry time
  // (removed 5-minute threshold that was causing false negatives)
  return currentTime < expiryTime;
};

/**
 * Get secure auth headers for API requests
 * @param token Bearer token
 * @returns Headers object with secure auth
 */
export const getSecureAuthHeaders = (token: string): Record<string, string> => {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  };
};

/**
 * Log authentication event for audit trail
 * IMPORTANT: Never log credentials or sensitive data
 * @param action Auth action (login, logout, failed_login, session_refresh, etc)
 * @param userId User ID if available
 * @param metadata Additional non-sensitive metadata
 */
export const auditAuthEvent = async (
  action: 'login' | 'logout' | 'failed_login' | 'session_refresh' | 'password_reset' | 'mfa_verify',
  userId?: string,
  metadata?: Record<string, any>
): Promise<void> => {
  try {
    const safeMetadata = { ...metadata };
    delete safeMetadata.email;
    delete safeMetadata.password;
    delete safeMetadata.token;

    await logSecurityEvent({
      type:
        action === 'login' ? 'auth.login_success' :
        action === 'logout' ? 'auth.logout' :
        action === 'failed_login' ? 'auth.login_failure' :
        'auth.session_refresh',
      actorId: userId,
      severity: action === 'failed_login' ? 'warning' : 'info',
      timestamp: new Date().toISOString(),
      metadata: safeMetadata,
    });
  } catch {
    // best effort only
  }
};

export const enforceLoginRateLimit = (email: string): void => {
  const normalized = email.trim().toLowerCase() || 'anonymous';
  enforceClientRateLimit(`auth-login:${normalized}`, 10, 60_000);
};

export const normalizeAndRethrowAuthError = (error: unknown): never => {
  const safe = toSafeError(error);
  throw new Error(safe.safeMessage);
};

/**
 * Check if credentials appear to be test/default credentials
 * @param email Email to check
 * @returns true if appears to be test credentials
 */
export const isTestCredentials = (email: string): boolean => {
  const testPatterns = ['test@', 'demo@', 'admin@admin', 'user@example.com'];
  return testPatterns.some((pattern) => email.toLowerCase().includes(pattern));
};
import { enforceClientRateLimit } from '../security/rateLimit';
import { logSecurityEvent } from '../security/monitoring/eventLogger';
import { toSafeError } from '../security/secureError';
