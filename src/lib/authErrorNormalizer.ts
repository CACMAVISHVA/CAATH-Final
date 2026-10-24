/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Auth Error Normalization
 * 
 * Safely handles auth errors without exposing sensitive information
 * Maps provider-specific errors to user-friendly messages
 */

export type AuthErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'USER_NOT_FOUND'
  | 'USER_ALREADY_EXISTS'
  | 'WEAK_PASSWORD'
  | 'EMAIL_NOT_VERIFIED'
  | 'ACCOUNT_DISABLED'
  | 'SESSION_EXPIRED'
  | 'NETWORK_ERROR'
  | 'SERVICE_ERROR'
  | 'UNKNOWN_ERROR';

export interface SafeAuthError {
  code: AuthErrorCode;
  userMessage: string;
  isRetryable: boolean;
  isDeveloperError?: boolean;
  originalError?: Error;
}

/**
 * Normalize auth errors to safe user-facing messages
 * @param error Error from auth provider
 * @returns Safe error object for display to user
 */
export const normalizeAuthError = (error: any): SafeAuthError => {
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Handle null/undefined
  if (!error) {
    return {
      code: 'UNKNOWN_ERROR',
      userMessage: 'An unexpected error occurred. Please try again.',
      isRetryable: true,
    };
  }

  // Extract error message
  const errorMessage = typeof error === 'string' ? error : error.message || String(error);
  const errorCode = error.status || '';
  const providerCode = String(error.code || '').toLowerCase();
  const normalizedMessage = errorMessage.toLowerCase();

  // Map known errors to safe messages
  if (normalizedMessage.includes('row-level security') || normalizedMessage.includes('violates row-level security')) {
    return {
      code: 'SERVICE_ERROR',
      userMessage: 'Account setup could not be completed. Please verify your firm invitation details or contact support.',
      isRetryable: false,
      isDeveloperError: true,
    };
  }

  if (normalizedMessage.includes('firm_required') || normalizedMessage.includes('users_firm_required')) {
    return {
      code: 'SERVICE_ERROR',
      userMessage: 'A valid firm workspace is required to create this account.',
      isRetryable: false,
      isDeveloperError: true,
    };
  }

  if (normalizedMessage.includes('invalid') || normalizedMessage.includes('credentials')) {
    return {
      code: 'INVALID_CREDENTIALS',
      userMessage: 'Invalid email or password. Please try again.',
      isRetryable: true,
    };
  }

  if (normalizedMessage.includes('not found') || errorCode === 'PGRST116') {
    return {
      code: 'USER_NOT_FOUND',
      userMessage: 'Email not found. Please create an account or check your email.',
      isRetryable: false,
    };
  }

  if (normalizedMessage.includes('already exists') || normalizedMessage.includes('already registered') || normalizedMessage.includes('user already registered')) {
    return {
      code: 'USER_ALREADY_EXISTS',
      userMessage: 'This email is already registered. Please login or reset your password.',
      isRetryable: false,
    };
  }

  if (
    providerCode === 'weak_password'
    || normalizedMessage.includes('weak password')
    || normalizedMessage.includes('known to be weak')
    || normalizedMessage.includes('easy to guess')
    || normalizedMessage.includes('password should')
    || normalizedMessage.includes('password must')
  ) {
    return {
      code: 'WEAK_PASSWORD',
      userMessage: 'This password is too common or does not meet security requirements. Use a unique 12+ character password with uppercase, lowercase, a number, and a symbol.',
      isRetryable: true,
    };
  }

  if (errorCode === 429 || providerCode.includes('rate_limit') || normalizedMessage.includes('rate limit') || normalizedMessage.includes('too many requests')) {
    return {
      code: 'SERVICE_ERROR',
      userMessage: 'Too many account attempts were made. Please wait a few minutes, then try once with a strong unique password.',
      isRetryable: true,
    };
  }

  if (providerCode === 'captcha_failed' || normalizedMessage.includes('captcha')) {
    return {
      code: 'SERVICE_ERROR',
      userMessage: 'The security check could not be completed. Refresh the page and try again.',
      isRetryable: true,
    };
  }

  if (providerCode === 'signup_disabled' || normalizedMessage.includes('signups not allowed') || normalizedMessage.includes('signup is disabled')) {
    return {
      code: 'SERVICE_ERROR',
      userMessage: 'New workspace registration is temporarily unavailable. Please contact CAATH support.',
      isRetryable: false,
      isDeveloperError: true,
    };
  }

  if (providerCode === 'over_email_send_rate_limit' || normalizedMessage.includes('email rate limit')) {
    return {
      code: 'SERVICE_ERROR',
      userMessage: 'The verification-email limit was reached. Please wait and try again, or contact CAATH support.',
      isRetryable: true,
    };
  }

  if (normalizedMessage.includes('verify') || normalizedMessage.includes('email not confirmed')) {
    return {
      code: 'EMAIL_NOT_VERIFIED',
      userMessage: 'Email verification required. Please check your inbox and verify your email.',
      isRetryable: true,
    };
  }

  if (normalizedMessage.includes('sign_in_session_missing')) {
    return {
      code: 'EMAIL_NOT_VERIFIED',
      userMessage: 'CAATH could not create a sign-in session. Please verify your email, then try again.',
      isRetryable: true,
    };
  }

  if (normalizedMessage.includes('disabled') || normalizedMessage.includes('suspended')) {
    return {
      code: 'ACCOUNT_DISABLED',
      userMessage: 'Your account has been disabled. Please contact support.',
      isRetryable: false,
    };
  }

  if (normalizedMessage.includes('session') || normalizedMessage.includes('expired') || normalizedMessage.includes('otp') || normalizedMessage.includes('token')) {
    return {
      code: 'SESSION_EXPIRED',
      userMessage: 'Your session has expired. Please login again.',
      isRetryable: true,
    };
  }

  if (normalizedMessage.includes('network') || normalizedMessage.includes('timeout')) {
    return {
      code: 'NETWORK_ERROR',
      userMessage: 'Network connection error. Please check your internet and try again.',
      isRetryable: true,
    };
  }

  if (errorCode === 'service_role_key_required' || normalizedMessage.includes('unauthorized')) {
    return {
      code: 'SERVICE_ERROR',
      userMessage: 'Service temporarily unavailable. Please try again in a moment.',
      isRetryable: true,
      isDeveloperError: true,
    };
  }

  // Default to generic error in production, detailed in development
  return {
    code: 'UNKNOWN_ERROR',
    userMessage: isDevelopment
      ? `Authentication error: ${errorMessage.substring(0, 100)}`
      : 'CAATH could not complete the sign-in request. Please verify the details and try again. If it continues, contact support.',
    isRetryable: true,
    originalError: error instanceof Error ? error : new Error(String(error)),
  };
};

/**
 * Check if an error is likely a network error
 * @param error Error to check
 * @returns true if appears to be network-related
 */
export const isNetworkError = (error: any): boolean => {
  const errorMessage = typeof error === 'string' ? error : error?.message || '';
  return (
    errorMessage.toLowerCase().includes('network') ||
    errorMessage.toLowerCase().includes('timeout') ||
    errorMessage.toLowerCase().includes('connection') ||
    error?.code === 'NETWORK_ERROR'
  );
};

/**
 * Check if an error is retryable
 * @param error Error to check
 * @returns true if operation should be retried
 */
export const isRetryableError = (error: any): boolean => {
  const safeError = normalizeAuthError(error);
  return safeError.isRetryable;
};

/**
 * Get retry delay in milliseconds
 * Implements exponential backoff for retries
 * @param attemptNumber Zero-indexed attempt number
 * @returns Delay in milliseconds
 */
export const getRetryDelay = (attemptNumber: number): number => {
  // 1s, 2s, 4s, 8s, 16s max
  const baseDelay = 1000;
  const maxDelay = 16000;
  const delay = baseDelay * Math.pow(2, attemptNumber);
  return Math.min(delay, maxDelay);
};

/**
 * Create a loggable error summary without sensitive data
 * @param error Auth error
 * @param action Action that failed (e.g., 'login', 'signup')
 * @returns Safe error summary for logging
 */
export const createErrorSummary = (
  error: any,
  action: 'login' | 'signup' | 'logout' | 'session_refresh' = 'login'
): Record<string, any> => {
  const safeError = normalizeAuthError(error);

  return {
    action,
    timestamp: new Date().toISOString(),
    errorCode: safeError.code,
    isRetryable: safeError.isRetryable,
    isDeveloperError: safeError.isDeveloperError,
    // Never include original message or sensitive data
  };
};
