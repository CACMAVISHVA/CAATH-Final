import assert from 'node:assert/strict';
import test from 'node:test';
import { validateVoucherDraft } from './validation';

const baseVoucher = {
  clientId: 'client-1',
  financialYearId: 'fy-1',
  voucherNumber: 'JV-0001',
  voucherDate: '2026-09-29',
  voucherType: 'Journal' as const,
};

test('accepts a balanced double-entry voucher', () => {
  const result = validateVoucherDraft({ ...baseVoucher, lines: [
    { accountId: 'cash', debit: 1000, credit: 0 },
    { accountId: 'capital', debit: 0, credit: 1000 },
  ] });
  assert.equal(result.valid, true);
  assert.equal(result.debit, 1000);
});

test('rejects an unbalanced voucher', () => {
  const result = validateVoucherDraft({ ...baseVoucher, lines: [
    { accountId: 'cash', debit: 1000, credit: 0 },
    { accountId: 'capital', debit: 0, credit: 999 },
  ] });
  assert.equal(result.valid, false);
  assert.match(result.errors.join(' '), /must be equal/i);
});

test('rejects a line that contains both debit and credit', () => {
  const result = validateVoucherDraft({ ...baseVoucher, lines: [
    { accountId: 'cash', debit: 1000, credit: 1000 },
    { accountId: 'capital', debit: 0, credit: 1000 },
  ] });
  assert.equal(result.valid, false);
  assert.match(result.errors.join(' '), /either debit or credit/i);
});
