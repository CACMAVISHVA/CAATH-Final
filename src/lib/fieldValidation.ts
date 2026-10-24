export type FieldValidation = { valid: boolean; error?: string };

const ok = (): FieldValidation => ({ valid: true });
const invalid = (error: string): FieldValidation => ({ valid: false, error });
const normalized = (value: string) => value.trim().toUpperCase();

export const normalizeIndianPhone = (value: string) => value.replace(/[\s()-]/g, '').replace(/^\+91/, '').replace(/^91(?=\d{10}$)/, '');

export const validateRequiredName = (value: string, label = 'Name'): FieldValidation => {
  const clean = value.trim();
  if (!clean) return invalid(`${label} is required.`);
  if (clean.length < 2 || clean.length > 120) return invalid(`Please enter a valid ${label.toLowerCase()}.`);
  if (!/^[\p{L}\p{N}][\p{L}\p{N}\s&.'(),/-]*$/u.test(clean)) return invalid(`Please enter a valid ${label.toLowerCase()}.`);
  return ok();
};

export const validateEmail = (value: string, required = true): FieldValidation => {
  const clean = value.trim().toLowerCase();
  if (!clean) return required ? invalid('Email address is required.') : ok();
  if (clean.length > 254 || !/^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(clean)) return invalid('Please enter a valid email address.');
  return ok();
};

export const validateIndianMobile = (value: string, required = true): FieldValidation => {
  const clean = normalizeIndianPhone(value);
  if (!clean) return required ? invalid('Mobile number is required.') : ok();
  if (!/^[6-9]\d{9}$/.test(clean)) return invalid('Please enter a valid 10-digit Indian mobile number.');
  return ok();
};

export const validatePAN = (value: string, required = true): FieldValidation => {
  const clean = normalized(value);
  if (!clean) return required ? invalid('PAN is required.') : ok();
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(clean)) return invalid('Please enter a valid PAN (example: ABCDE1234F).');
  return ok();
};

export const validateGSTIN = (value: string, required = false): FieldValidation => {
  const clean = normalized(value);
  if (!clean) return required ? invalid('GSTIN is required.') : ok();
  if (!/^(0[1-9]|[1-2][0-9]|3[0-8])[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(clean)) {
    return invalid('Please enter a valid 15-character GSTIN (example: 27ABCDE1234F1Z5).');
  }
  return ok();
};

export const validateTAN = (value: string, required = false): FieldValidation => {
  const clean = normalized(value);
  if (!clean) return required ? invalid('TAN is required.') : ok();
  if (!/^[A-Z]{4}[0-9]{5}[A-Z]$/.test(clean)) return invalid('Please enter a valid TAN (example: ABCD12345E).');
  return ok();
};

export const validateCinOrLlpin = (value: string, required = false): FieldValidation => {
  const clean = normalized(value);
  if (!clean) return required ? invalid('CIN / LLPIN is required.') : ok();
  const cin = /^[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/;
  const llpin = /^[A-Z]{3}-[0-9]{4}$/;
  if (!cin.test(clean) && !llpin.test(clean)) return invalid('Please enter a valid CIN or LLPIN.');
  return ok();
};

export const validateUuid = (value: string, label = 'ID'): FieldValidation => {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim())) {
    return invalid(`Please enter a valid ${label}.`);
  }
  return ok();
};

export const firstValidationError = (...results: FieldValidation[]) => results.find((result) => !result.valid)?.error;
