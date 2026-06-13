export const validatePAN = (pan: string): { valid: boolean; error?: string } => {
  const cleanPAN = pan.trim().toUpperCase();
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
  if (!cleanPAN) return { valid: false, error: 'PAN is required' };
  if (!panRegex.test(cleanPAN)) return { valid: false, error: 'Invalid PAN format. Expected: ABCDE1234F' };
  return { valid: true };
};
export const validateGSTIN = (gstin: string): { valid: boolean; error?: string } => {
  const cleanGSTIN = gstin.trim().toUpperCase();
  if (!cleanGSTIN) return { valid: true };
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  if (!gstinRegex.test(cleanGSTIN)) return { valid: false, error: 'Invalid GSTIN format. Expected: 27ABCDE1234F1Z5' };
  return { valid: true };
};
