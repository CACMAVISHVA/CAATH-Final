import { SecurityAppError } from './secureError';

export const requireString = (value: unknown, field: string, maxLen = 512): string => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new SecurityAppError(`${field} is required.`, 'VALIDATION_ERROR', 400);
  }
  const trimmed = value.trim();
  if (trimmed.length > maxLen) {
    throw new SecurityAppError(`${field} exceeds maximum length.`, 'VALIDATION_ERROR', 400);
  }
  return trimmed;
};

export const optionalString = (value: unknown, field: string, maxLen = 512): string | null => {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') {
    throw new SecurityAppError(`${field} must be a string.`, 'VALIDATION_ERROR', 400);
  }
  if (value.trim().length > maxLen) {
    throw new SecurityAppError(`${field} exceeds maximum length.`, 'VALIDATION_ERROR', 400);
  }
  return value.trim();
};

export const requireUuid = (value: unknown, field: string): string => {
  const raw = requireString(value, field, 64);
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(raw)) {
    throw new SecurityAppError(`${field} must be a valid UUID.`, 'VALIDATION_ERROR', 400);
  }
  return raw;
};
