export type Department = 'GST' | 'Income Tax';
export function identifyNotice(text: string, department?: Department) {
  const upper = text.toUpperCase();
  const gstins = [...new Set(upper.match(/\b[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]\b/g) || [])];
  const pans = [...new Set(upper.match(/\b[A-Z]{5}[0-9]{4}[A-Z]\b/g) || [])];
  const gstSignal = /\bGST\b|\bGSTR[ -]?\d|GOODS AND SERVICES TAX/.test(upper);
  const itSignal = /INCOME[ -]?TAX|E[ -]?PROCEEDINGS|ASSESSMENT YEAR/.test(upper);
  const inferred = department || (gstSignal && !itSignal ? 'GST' : itSignal && !gstSignal ? 'Income Tax' : null);
  return { department: inferred, identifiers: inferred === 'GST' ? gstins : inferred === 'Income Tax' ? pans : [...gstins, ...pans] };
}
export function validateDate(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Dates must use YYYY-MM-DD');
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error('Invalid calendar date');
  return value;
}
export function fingerprintText(input: { department: string | null; identifiers: string[]; noticeNumber?: string | null; subject: string; body: string }) {
  if (input.noticeNumber && input.department && input.identifiers.length === 1) {
    return JSON.stringify([input.department, input.identifiers[0], input.noticeNumber.trim().toUpperCase()]);
  }
  return JSON.stringify([input.department, [...input.identifiers].sort(), input.subject.trim(), input.body.trim()]);
}
