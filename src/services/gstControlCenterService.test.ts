import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGSTControlRows } from './gstControlCenterPolicy';

const clients = [
  { id: 'one', name: 'Alpha', gstin: '33ABCDE1234F1Z5', type: 'Company' },
  { id: 'two', name: 'Beta', gstin: '33ABCDE1234F2Z4', type: 'Firm' },
];

test('buildGSTControlRows distinguishes filed, filing review, and data requests', () => {
  const rows = buildGSTControlRows(clients, [
    { client_id: 'one', financial_year: '2026-27', tax_period: 'October', return_type: 'GSTR-1', status: 'Filed' },
    { client_id: 'one', financial_year: '2026-27', tax_period: 'October', return_type: 'GSTR-3B', status: 'Filed' },
    { client_id: 'two', financial_year: '2026-27', tax_period: 'October', return_type: 'GSTR-1', status: 'Pending' },
  ] as any, '2026-27', 'October');

  assert.deepEqual(rows.map((row) => ({ client: row.client.id, action: row.action, outstanding: row.outstandingReturns })), [
    { client: 'one', action: 'Filed', outstanding: [] },
    { client: 'two', action: 'Review filing', outstanding: ['GSTR-1', 'GSTR-3B'] },
  ]);
});

test('an exempt return does not generate a data follow-up', () => {
 const rows = buildGSTControlRows(clients.slice(0, 1), [
 { client_id: 'one', financial_year: '2026-27', tax_period: 'October', return_type: 'GSTR-1', status: 'Not Applicable' },
 { client_id: 'one', financial_year: '2026-27', tax_period: 'October', return_type: 'GSTR-3B', status: 'Filed' },
 ] as any, '2026-27', 'October');
 assert.deepEqual(rows[0].outstandingReturns, []);
});
