import { GSTDatasetType } from '../dataset-registry/registry';
import { UploadSessionState } from '../upload-orchestrator/uploadOrchestrator';
import { readSheet } from 'read-excel-file/browser';

export interface ParsedDatasetArtifact {
  dataset: GSTDatasetType;
  records: number;
  parser: string;
  normalizedSchema: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
  duplicateInvoices: number;
  taxableValue: number;
  taxAmount: number;
  gstins: string[];
  invoices: NormalizedGSTInvoice[];
}

export interface NormalizedGSTInvoice {
  invoiceNumber: string;
  gstin: string;
  invoiceDate: string | null;
  taxableValue: number;
  taxAmount: number;
}

const parserByDataset: Record<GSTDatasetType, string> = {
  GSTR1_JSON: 'gst_json_parser',
  GSTR2B_JSON: 'gst_json_parser',
  GSTR3B_JSON: 'gst_json_parser',
  PURCHASE_REGISTER: 'excel_invoice_parser',
  SALES_REGISTER: 'excel_invoice_parser',
  EWAY_BILL_EXPORT: 'csv_tabular_parser',
  VENDOR_MASTER: 'csv_tabular_parser',
  GST_PORTAL_EXPORT: 'archive_extractor',
  RECONCILIATION_HISTORY: 'csv_tabular_parser',
};

const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const invoiceAliases = ['invoice_number', 'invoice_no', 'invoice number', 'invoice no', 'inum', 'doc_no'];
const dateAliases = ['invoice_date', 'invoice date', 'idt', 'document_date', 'doc_date'];
const gstinAliases = ['gstin', 'vendor_gstin', 'recipient_gstin', 'supplier_gstin', 'ctin', 'from_gstin', 'to_gstin'];
const taxableAliases = ['taxable_value', 'taxable value', 'taxable_amount', 'txval'];
const taxAliases = ['tax_amount', 'tax amount', 'igst', 'cgst', 'sgst', 'cess', 'iamt', 'camt', 'samt', 'csamt'];

type DataRow = Record<string, unknown>;

const normalizeKey = (value: unknown) => String(value ?? '').trim().toLowerCase().replace(/[-_]+/g, '_').replace(/\s+/g, ' ');
const valueFor = (row: DataRow, aliases: string[]) => {
  const wanted = new Set(aliases.map(normalizeKey));
  const key = Object.keys(row).find((candidate) => wanted.has(normalizeKey(candidate)));
  return key ? row[key] : undefined;
};
const numericValue = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? '').replace(/[,₹\s]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};
const validDate = (value: unknown) => {
  if (value instanceof Date) return !Number.isNaN(value.getTime());
  if (value === null || value === undefined || value === '') return false;
  const text = String(value).trim();
  if (/^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/.test(text)) return true;
  return !Number.isNaN(Date.parse(text));
};

const parseCsv = (text: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"' && quoted && text[index + 1] === '"') { cell += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { row.push(cell.trim()); cell = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[index + 1] === '\n') index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = []; cell = '';
    } else cell += char;
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  if (quoted) throw new Error('CSV contains an unclosed quoted value.');
  return rows;
};

const rowsToObjects = (rows: unknown[][]): DataRow[] => {
  const firstPopulatedRow = rows.findIndex((row) => row.some((cell) => cell !== null && cell !== undefined && String(cell).trim() !== ''));
  if (firstPopulatedRow < 0 || rows.length <= firstPopulatedRow + 1) return [];
  const headers = rows[firstPopulatedRow].map((cell, index) => String(cell ?? '').trim() || `column_${index + 1}`);
  return rows.slice(firstPopulatedRow + 1).filter((row) => row.some((cell) => cell !== null && cell !== undefined && String(cell).trim() !== ''))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? null])));
};

const collectJsonRows = (value: unknown, output: DataRow[] = [], inheritedGstin = ''): DataRow[] => {
  if (Array.isArray(value)) {
    value.forEach((entry) => collectJsonRows(entry, output, inheritedGstin));
  } else if (value && typeof value === 'object') {
    const row = value as DataRow;
    const currentGstin = String(valueFor(row, gstinAliases) ?? inheritedGstin).trim().toUpperCase();
    if (invoiceAliases.some((alias) => valueFor(row, [alias]) !== undefined)) {
      output.push(valueFor(row, gstinAliases) === undefined && currentGstin ? { ...row, gstin: currentGstin } : row);
    }
    Object.values(row).forEach((entry) => {
      if (entry && typeof entry === 'object') collectJsonRows(entry, output, currentGstin);
    });
  }
  return output;
};

const collectJsonObjects = (value: unknown, output: DataRow[] = []): DataRow[] => {
  if (Array.isArray(value)) value.forEach((entry) => collectJsonObjects(entry, output));
  else if (value && typeof value === 'object') {
    const row = value as DataRow;
    output.push(row);
    Object.values(row).forEach((entry) => collectJsonObjects(entry, output));
  }
  return output;
};

const summarizeRows = (dataset: GSTDatasetType, rows: DataRow[], fallbackRoot?: DataRow) => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const gstins = new Set<string>();
  const invoiceCounts = new Map<string, number>();
  let invalidDates = 0;
  let invalidValues = 0;
  let taxableValue = 0;
  let taxAmount = 0;

  rows.forEach((row) => {
    const invoice = String(valueFor(row, invoiceAliases) ?? '').trim().toUpperCase();
    if (invoice) invoiceCounts.set(invoice, (invoiceCounts.get(invoice) || 0) + 1);
    const date = valueFor(row, dateAliases);
    if (date !== undefined && !validDate(date)) invalidDates += 1;
    const taxable = valueFor(row, taxableAliases);
    if (taxable !== undefined && !Number.isFinite(Number(String(taxable).replace(/[,₹\s]/g, '')))) invalidValues += 1;
    taxableValue += numericValue(taxable);
    taxAmount += taxAliases.reduce((total, alias) => total + numericValue(valueFor(row, [alias])), 0);
    gstinAliases.forEach((alias) => {
      const gstin = String(valueFor(row, [alias]) ?? '').trim().toUpperCase();
      if (gstin) gstins.add(gstin);
    });
  });
  gstinAliases.forEach((alias) => {
    const gstin = String(valueFor(fallbackRoot || {}, [alias]) ?? '').trim().toUpperCase();
    if (gstin) gstins.add(gstin);
  });

  const invalidGstins = [...gstins].filter((gstin) => !GSTIN_PATTERN.test(gstin));
  const duplicateInvoices = [...invoiceCounts.values()].reduce((total, count) => total + Math.max(0, count - 1), 0);
  if (rows.length === 0) errors.push('No invoice or data records were found.');
  if (invalidGstins.length) errors.push(`${invalidGstins.length} invalid GSTIN value(s) found.`);
  if (invalidDates) errors.push(`${invalidDates} invalid invoice date(s) found.`);
  if (invalidValues) errors.push(`${invalidValues} invalid taxable value(s) found.`);
  if (duplicateInvoices) warnings.push(`${duplicateInvoices} duplicate invoice row(s) detected.`);
  if (!gstins.size && !['RECONCILIATION_HISTORY'].includes(dataset)) warnings.push('No GSTIN column/value was detected.');
  return { errors, warnings, duplicateInvoices, taxableValue, taxAmount, gstins: [...gstins] };
};

const normalizeInvoices = (rows: DataRow[]): NormalizedGSTInvoice[] => rows.flatMap((row) => {
  const invoiceNumber = String(valueFor(row, invoiceAliases) ?? '').trim().toUpperCase();
  if (!invoiceNumber) return [];
  const gstin = String(valueFor(row, gstinAliases) ?? '').trim().toUpperCase();
  const rawDate = valueFor(row, dateAliases);
  const invoiceDate = rawDate instanceof Date
    ? rawDate.toISOString().slice(0, 10)
    : rawDate === undefined || rawDate === null ? null : String(rawDate).trim();
  const invoiceObjects = collectJsonObjects(row);
  const nestedTaxableValue = invoiceObjects.reduce((total, item) => total + numericValue(valueFor(item, taxableAliases)), 0);
  const nestedTaxAmount = invoiceObjects.reduce((total, item) => total + taxAliases.reduce((taxTotal, alias) => taxTotal + numericValue(valueFor(item, [alias])), 0), 0);
  return [{
    invoiceNumber,
    gstin,
    invoiceDate,
    taxableValue: nestedTaxableValue,
    taxAmount: nestedTaxAmount,
  }];
});

export const parseGSTDatasetFile = async (dataset: GSTDatasetType, file: File): Promise<NonNullable<UploadSessionState['datasets'][number]['parseSummary']>> => {
  if (file.size === 0) throw new Error('The selected file is empty.');
  if (file.size > MAX_FILE_BYTES) throw new Error('The file exceeds the 20 MB safety limit.');
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const allowed = dataset.includes('JSON') ? ['json'] : dataset === 'GST_PORTAL_EXPORT' ? ['json', 'xlsx'] : ['csv', 'xlsx', 'json'];
  if (!allowed.includes(extension)) throw new Error(`.${extension || 'unknown'} is not supported here. Upload ${allowed.join(', ').toUpperCase()}.`);

  let rows: DataRow[] = [];
  let analysisRows: DataRow[] = [];
  let root: DataRow | undefined;
  if (extension === 'json') {
    let parsed: unknown;
    try { parsed = JSON.parse(await file.text()); } catch { throw new Error('The JSON file is malformed and could not be parsed.'); }
    root = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as DataRow : undefined;
    rows = collectJsonRows(parsed);
    if (!rows.length && Array.isArray(parsed)) rows = parsed.filter((item): item is DataRow => Boolean(item && typeof item === 'object'));
    if (!rows.length && root && Object.keys(root).length > 0) rows = [root];
    analysisRows = collectJsonObjects(parsed);
  } else if (extension === 'csv') {
    rows = rowsToObjects(parseCsv(await file.text()));
    analysisRows = rows;
  } else {
    rows = rowsToObjects(await readSheet(file) as unknown[][]);
    analysisRows = rows;
  }
  const quality = summarizeRows(dataset, analysisRows, root);
  const invoices = normalizeInvoices(rows);
  return {
    records: rows.length,
    parser: parserByDataset[dataset],
    normalizedSchema: `gst.normalized.${dataset.toLowerCase()}.v1`,
    valid: quality.errors.length === 0,
    invoices,
    ...quality,
  };
};

export const parseAndNormalizeSession = (session: UploadSessionState): ParsedDatasetArtifact[] => {
  return session.datasets
    .filter((item) => ['uploaded', 'parsed', 'validated', 'ready'].includes(item.status))
    .map((item) => ({ dataset: item.dataset, ...item.parseSummary! }))
    .filter((item) => Boolean(item.records) && item.valid);
};
