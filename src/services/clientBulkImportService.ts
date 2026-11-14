import readXlsxFile from 'read-excel-file/browser';
import { User } from '../types';
import { validateGSTIN, validatePAN } from '../lib/fieldValidation';

export const CLIENT_SERVICE_OPTIONS = [
  'GST Filing',
  'Income Tax',
  'Audit',
  'ROC Filing',
  'Payroll',
  'Bookkeeping',
] as const;

const serviceAliases: Record<string, typeof CLIENT_SERVICE_OPTIONS[number]> = {
  ...Object.fromEntries(CLIENT_SERVICE_OPTIONS.map((service) => [service.toLowerCase().replace(/[^a-z0-9]/g, ''), service])),
  gst: 'GST Filing',
  gstfiling: 'GST Filing',
  gstreturn: 'GST Filing',
  gstreturns: 'GST Filing',
  incometax: 'Income Tax',
  incometaxfiling: 'Income Tax',
  itreturn: 'Income Tax',
  itreturns: 'Income Tax',
  statutoryaudit: 'Audit',
  rocfilling: 'ROC Filing',
  roc: 'ROC Filing',
  companyfiling: 'ROC Filing',
  accounts: 'Bookkeeping',
  accounting: 'Bookkeeping',
};

export type ClientImportRow = {
  rowNumber: number;
  name: string;
  type: string;
  pan: string;
  gstin: string;
  tan: string;
  cinLlpin: string;
  email: string;
  phone: string;
  services: string[];
  errors: string[];
};

export type ClientImportPreview = { rows: ClientImportRow[]; validRows: ClientImportRow[]; invalidRows: ClientImportRow[] };
type Cell = string | number | boolean | Date | null;

const normalizeHeader = (value: Cell) => String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
const csvLine = (line: string) => {
  const values: string[] = []; let current = ''; let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && line[index + 1] === '"' && quoted) { current += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === ',' && !quoted) { values.push(current); current = ''; }
    else current += character;
  }
  values.push(current); return values;
};

const readRows = async (file: File): Promise<Cell[][]> => {
  if (/\.csv$/i.test(file.name)) return (await file.text()).split(/\r?\n/).filter(Boolean).map(csvLine);
  if (/\.xlsx$/i.test(file.name)) return (await readXlsxFile(file)) as unknown as Cell[][];
  throw new Error('Use the CAATH client-import CSV or an XLSX file.');
};

const valueAt = (row: Cell[], headers: string[], aliases: string[]) => String(row[headers.findIndex((header) => aliases.includes(header))] ?? '').trim();

const normalizeService = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
const parseServices = (value: string) => {
  const typed = value.split(/[|;,\n/]+/).map((item) => item.trim()).filter(Boolean);
  const mapped = typed.map((item) => ({ original: item, service: serviceAliases[normalizeService(item)] }));
  return {
    services: [...new Set(mapped.flatMap((item) => item.service ? [item.service] : []))],
    unknown: mapped.filter((item) => !item.service).map((item) => item.original),
  };
};

export const parseClientImportFile = async (file: File, existingPans: string[]): Promise<ClientImportPreview> => {
  const sheet = await readRows(file);
  if (sheet.length < 2) throw new Error('The file has no client records. Download the template and add at least one client.');
  if (sheet.length > 501) throw new Error('Import up to 500 clients at a time.');
  const headers = sheet[0].map(normalizeHeader);
  if (!headers.some((header) => ['clientname', 'name'].includes(header)) || !headers.includes('pan') || !headers.some((header) => ['type', 'clienttype', 'businesstype'].includes(header))) {
    throw new Error('The import requires Client Name, Type and PAN columns.');
  }
  const seenPans = new Set(existingPans.map((pan) => pan.toUpperCase()));
  const rows = sheet.slice(1).filter((row) => row.some((cell) => String(cell ?? '').trim())).map((row, index) => {
    const name = valueAt(row, headers, ['clientname', 'name']);
    const type = valueAt(row, headers, ['type', 'clienttype', 'businesstype']);
    const pan = valueAt(row, headers, ['pan']).toUpperCase();
    const gstin = valueAt(row, headers, ['gstin']).toUpperCase();
    const tan = valueAt(row, headers, ['tan']).toUpperCase();
    const cinLlpin = valueAt(row, headers, ['cin', 'llpin', 'cinllpin']).toUpperCase();
    const email = valueAt(row, headers, ['email']);
    const phone = valueAt(row, headers, ['phone', 'mobile', 'mobilenumber']);
    const parsedServices = parseServices(valueAt(row, headers, ['services', 'service']));
    const errors = [
      !name ? 'Client name is required.' : '', !type ? 'Client type is required.' : '', validatePAN(pan).error || '', validateGSTIN(gstin).error || '',
      parsedServices.unknown.length ? `Unrecognised service: ${parsedServices.unknown.join(', ')}. Use ${CLIENT_SERVICE_OPTIONS.join(', ')}.` : '',
      seenPans.has(pan) ? 'PAN is already present in CAATH or repeated in this file.' : '',
    ].filter(Boolean);
    if (pan && !errors.some((error) => error.startsWith('Please enter a valid PAN'))) seenPans.add(pan);
    return { rowNumber: index + 2, name, type, pan, gstin, tan, cinLlpin, email, phone, services: parsedServices.services, errors };
  });
  return { rows, validRows: rows.filter((row) => row.errors.length === 0), invalidRows: rows.filter((row) => row.errors.length > 0) };
};

export const importClientRows = async (user: User, rows: ClientImportRow[]) => {
  if (!user.firmId) throw new Error('A firm workspace is required.');
  const { createClient } = await import('./clientService');
  const imported: string[] = []; const failed: Array<{ rowNumber: number; error: string }> = [];
  for (const row of rows) {
    try {
      await createClient({ firmId: user.firmId, name: row.name, type: row.type, pan: row.pan, gstin: row.gstin, tan: row.tan, cinLlpin: row.cinLlpin, email: row.email, phone: row.phone, services: row.services, user });
      imported.push(row.name);
    } catch (error) { failed.push({ rowNumber: row.rowNumber, error: error instanceof Error ? error.message : 'Unable to import this client.' }); }
  }
  return { imported, failed };
};

const downloadBlob = (blob: Blob, name: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click(); URL.revokeObjectURL(url);
};

const xml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
const cellRef = (column: number, row: number) => `${String.fromCharCode(65 + column)}${row}`;
const textCell = (column: number, row: number, value: string) => `<c r="${cellRef(column, row)}" t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`;
const crc32 = (value: Uint8Array) => {
  let crc = -1;
  for (const byte of value) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
  }
  return (crc ^ -1) >>> 0;
};
const littleEndian = (value: number, bytes: number) => Array.from({ length: bytes }, (_, index) => (value >>> (8 * index)) & 0xff);
const zip = (files: Array<{ name: string; content: string }>) => {
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = []; const directory: Uint8Array[] = []; let offset = 0;
  for (const file of files) {
    const name = encoder.encode(file.name); const content = encoder.encode(file.content); const crc = crc32(content);
    const local = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0, ...littleEndian(crc, 4), ...littleEndian(content.length, 4), ...littleEndian(content.length, 4), ...littleEndian(name.length, 2), 0, 0, ...name, ...content]);
    parts.push(local);
    directory.push(new Uint8Array([0x50, 0x4b, 0x01, 0x02, 20, 0, 20, 0, 0, 0, 0, 0, 0, 0, ...littleEndian(crc, 4), ...littleEndian(content.length, 4), ...littleEndian(content.length, 4), ...littleEndian(name.length, 2), 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, ...littleEndian(offset, 4), ...name]));
    offset += local.length;
  }
  const directorySize = directory.reduce((size, part) => size + part.length, 0);
  const end = new Uint8Array([0x50, 0x4b, 0x05, 0x06, 0, 0, 0, 0, ...littleEndian(files.length, 2), ...littleEndian(files.length, 2), ...littleEndian(directorySize, 4), ...littleEndian(offset, 4), 0, 0]);
  return new Blob([...parts, ...directory, end], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};

const serviceCombinations = CLIENT_SERVICE_OPTIONS.flatMap((_, index) => CLIENT_SERVICE_OPTIONS.slice(index).reduce<string[]>((all, service) => {
  const previous = all.map((value) => `${value} | ${service}`);
  return [...all, service, ...previous];
}, [])).filter((value, index, values) => values.indexOf(value) === index);

export const downloadClientImportTemplate = () => {
  const headers = ['Client Name', 'Type', 'PAN', 'GSTIN', 'TAN', 'CIN/LLPIN', 'Email', 'Phone', 'Services'];
  const sample = ['Aarav Exports Pvt Ltd', 'Private Limited Company', 'AABCA1234F', '33AABCA1234F1Z5', 'ABCD12345E', 'U12345TN2020PTC123456', 'accounts@aaravexports.example', '9876543210', 'GST Filing | Income Tax'];
  const sheetRows = [headers, sample].map((row, rowIndex) => `<row r="${rowIndex + 1}">${row.map((value, column) => textCell(column, rowIndex + 1, value)).join('')}</row>`).join('');
  const serviceRows = serviceCombinations.map((service, index) => `<row r="${index + 1}">${textCell(0, index + 1, service)}</row>`).join('');
  const files = [
    { name: '[Content_Types].xml', content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>' },
    { name: '_rels/.rels', content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
    { name: 'xl/workbook.xml', content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Client Import" sheetId="1" r:id="rId1"/><sheet name="Service Lists" sheetId="2" state="hidden" r:id="rId2"/></sheets></workbook>' },
    { name: 'xl/_rels/workbook.xml.rels', content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/></Relationships>' },
    { name: 'xl/worksheets/sheet1.xml', content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:I501"/><sheetData>${sheetRows}</sheetData><dataValidations count="1"><dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="1" sqref="I2:I501"><formula1>&apos;Service Lists&apos;!$A$1:$A$${serviceCombinations.length}</formula1></dataValidation></dataValidations></worksheet>` },
    { name: 'xl/worksheets/sheet2.xml', content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${serviceRows}</sheetData></worksheet>` },
  ];
  downloadBlob(zip(files), 'CAATH-client-import-template.xlsx');
};

export const downloadClientImportCsvTemplate = () => {
  const csv = 'Client Name,Type,PAN,GSTIN,TAN,CIN/LLPIN,Email,Phone,Services\nAarav Exports Pvt Ltd,Private Limited Company,AABCA1234F,33AABCA1234F1Z5,ABCD12345E,U12345TN2020PTC123456,accounts@aaravexports.example,9876543210,"GST Filing|Income Tax"';
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), 'CAATH-client-import-template.csv');
};
