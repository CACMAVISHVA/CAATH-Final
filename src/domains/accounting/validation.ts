import { VoucherDraft } from './types';

const toPaise = (value: number) => Math.round(value * 100);

export const validateVoucherDraft = (voucher: VoucherDraft) => {
  const errors: string[] = [];
  if (!voucher.clientId) errors.push('Client is required.');
  if (!voucher.financialYearId) errors.push('Financial year is required.');
  if (!voucher.voucherNumber.trim()) errors.push('Voucher number is required.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(voucher.voucherDate)) errors.push('Voucher date is invalid.');
  if (voucher.lines.length < 2) errors.push('At least two voucher lines are required.');

  let debit = 0;
  let credit = 0;
  voucher.lines.forEach((line, index) => {
    const debitPaise = toPaise(line.debit);
    const creditPaise = toPaise(line.credit);
    if (!line.accountId) errors.push(`Line ${index + 1}: account is required.`);
    if (debitPaise < 0 || creditPaise < 0) errors.push(`Line ${index + 1}: amount cannot be negative.`);
    if ((debitPaise > 0) === (creditPaise > 0)) errors.push(`Line ${index + 1}: enter either debit or credit.`);
    debit += debitPaise;
    credit += creditPaise;
  });

  if (debit <= 0 || debit !== credit) errors.push('Total debits and credits must be equal and greater than zero.');
  return { valid: errors.length === 0, errors, debit: debit / 100, credit: credit / 100 };
};
