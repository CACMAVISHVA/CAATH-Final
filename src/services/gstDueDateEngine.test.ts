import assert from 'node:assert/strict';
import test from 'node:test';
import { getGSTDueDate, gstComplianceTotals, gstMatrixDisplayStatus, gstPeriodForFinancialYearMonth } from './gstDueDateEngine';

test('calculates monthly and QRMP due dates across a financial-year boundary', () => {
  assert.deepEqual(getGSTDueDate({ returnType: 'GSTR-1', period: '2026-12-01', scheme: 'MONTHLY' }), { dueDate: '2027-01-11', extended: false });
  assert.deepEqual(getGSTDueDate({ returnType: 'GSTR-3B', period: '2026-12-01', scheme: 'MONTHLY' }), { dueDate: '2027-01-20', extended: false });
  assert.deepEqual(getGSTDueDate({ returnType: 'GSTR-3B', period: '2027-03-01', scheme: 'QRMP', stateGroup: '24TH' }), { dueDate: '2027-04-24', extended: false });
  assert.equal(getGSTDueDate({ returnType: 'GSTR-1', period: '2026-05-01', scheme: 'QRMP' }), null);
  assert.equal(gstPeriodForFinancialYearMonth('2026-27', 'January'), '2027-01-01');
});

test('applies extensions and calculates overdue and compliance correctly', () => {
  const extension = getGSTDueDate({ returnType: 'GSTR-1', period: '2026-06-01', scheme: 'MONTHLY', overrides: [{ returnType: 'GSTR-1', scheme: 'MONTHLY', periodFrom: '2026-06-01', periodTo: '2026-06-01', newDueDate: '2026-07-20', notificationReference: 'Demo notification' }] });
  assert.deepEqual(extension, { dueDate: '2026-07-20', extended: true, notificationReference: 'Demo notification' });
  assert.equal(gstMatrixDisplayStatus('Unknown', extension, '2026-07-19'), 'Not set');
  assert.equal(gstMatrixDisplayStatus('Unknown', extension, '2026-07-21'), 'Overdue');
  assert.deepEqual(gstComplianceTotals(['Filed', 'Pending', 'Overdue', 'Not Applicable']), { filed: 1, pending: 1, overdue: 1, compliancePercent: 33 });
});
