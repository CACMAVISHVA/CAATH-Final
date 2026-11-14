import assert from 'node:assert/strict';
import test from 'node:test';
import { parseClientImportFile } from './clientBulkImportService';

const fileFromCsv = (content: string) => ({
  name: 'clients.csv',
  text: async () => content,
}) as File;

test('bulk import maps Excel-style and typed service lists to CAATH services', async () => {
  const preview = await parseClientImportFile(fileFromCsv([
    'Client Name,Type,PAN,GSTIN,TAN,CIN/LLPIN,Email,Phone,Services',
    'Aarav Exports Pvt Ltd,Private Limited Company,AABCA1234F,33AABCA1234F1Z5,ABCD12345E,U12345TN2020PTC123456,accounts@aaravexports.example,9876543210,"GST Filing | Income Tax; payroll"',
  ].join('\n')), []);

  assert.equal(preview.validRows.length, 1);
  assert.deepEqual(preview.validRows[0].services, ['GST Filing', 'Income Tax', 'Payroll']);
});

test('bulk import flags an unrecognised typed service before importing', async () => {
  const preview = await parseClientImportFile(fileFromCsv([
    'Client Name,Type,PAN,Services',
    'Aarav Exports Pvt Ltd,Private Limited Company,AABCA1234F,"GST Filing|Mystery Service"',
  ].join('\n')), []);

  assert.equal(preview.validRows.length, 0);
  assert.match(preview.invalidRows[0].errors.join(' '), /Unrecognised service: Mystery Service/);
});
