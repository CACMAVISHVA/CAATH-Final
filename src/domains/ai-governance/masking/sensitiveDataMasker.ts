const SENSITIVE_PATTERNS = [
  /\b[A-Z]{5}[0-9]{4}[A-Z]\b/g, // PAN
  /\b[0-9]{12}\b/g, // Aadhaar-like
  /\b\d{2}[A-Z]{5}\d{4}[A-Z]\d[Z][A-Z0-9]\b/g, // GSTIN-like
];

export const maskSensitiveData = (input: string): string =>
  SENSITIVE_PATTERNS.reduce((value, pattern) => value.replace(pattern, '[MASKED]'), input);

