import readXlsxFile from 'read-excel-file/browser';
import { supabase } from '../lib/supabase';
import { User } from '../types';
import { GSTClientOption } from './gstComplianceLifecycleService';

export const GST_RETURN_TYPES = ['GSTR-1', 'GSTR-3B', 'GSTR-2A', 'GSTR-2B', 'GSTR-9', 'GSTR-9C', 'CMP-08'] as const;
export type GSTReturnType = typeof GST_RETURN_TYPES[number];
export type GSTReturnStatusValue = 'Filed' | 'Pending' | 'Not Applicable' | 'Unknown';

export type GSTReturnStatus = {
  id: string;
  firm_id: string;
  client_id: string;
  gstin: string;
  financial_year: string;
  return_type: GSTReturnType;
  tax_period: string;
  status: GSTReturnStatusValue;
  filed_on: string | null;
  arn: string | null;
  source: 'Manual' | 'Portal Import' | 'GSP';
  refreshed_at: string;
  client?: { name?: string } | null;
};

export type GSTClientAuthorization = {
  id: string;
  client_id: string;
  gstin: string;
  status: 'Active' | 'Revoked' | 'Expired';
  authorization_scope: string[];
  confirmed_at: string;
  expires_on: string | null;
  client?: { name?: string } | null;
};

export type GSTReturnProfileType = 'GSTR-1' | 'GSTR-3B' | 'GSTR-9' | 'GSTR-9C' | 'CMP-08';
export type GSTReturnProfile = { id: string; client_id: string; return_type: GSTReturnProfileType; filing_frequency: 'Monthly' | 'Quarterly' | 'Annual'; active_from: string | null; active_until: string | null };
export const GST_FILING_RETURN_TYPES: GSTReturnProfileType[] = ['GSTR-1', 'GSTR-3B', 'GSTR-9', 'GSTR-9C', 'CMP-08'];
export const gstReturnFrequency = (returnType: GSTReturnProfileType): GSTReturnProfile['filing_frequency'] => returnType === 'CMP-08' ? 'Quarterly' : returnType === 'GSTR-9' || returnType === 'GSTR-9C' ? 'Annual' : 'Monthly';

const requireFirm = (user: User) => {
  if (!user.firmId) throw new Error('A firm workspace is required.');
  return user.firmId;
};

export const loadGSTPracticeHub = async (firmId: string) => {
  const [clients, statuses, authorizations, profiles] = await Promise.all([
    supabase.from('clients').select('id,name,gstin,type,services').eq('firm_id', firmId).contains('services', ['GST Filing']).order('name'),
    supabase.from('gst_return_statuses').select('*,client:clients(name)').eq('firm_id', firmId).order('tax_period'),
    supabase.from('gst_client_authorizations').select('*,client:clients(name)').eq('firm_id', firmId).order('confirmed_at', { ascending: false }),
    supabase.from('gst_client_return_profiles').select('id,client_id,return_type,filing_frequency,active_from,active_until').eq('firm_id', firmId),
  ]);
  const error = clients.error || statuses.error || authorizations.error || profiles.error;
  if (error) throw error;
  return {
    clients: (clients.data || []) as GSTClientOption[],
    statuses: (statuses.data || []) as unknown as GSTReturnStatus[],
    authorizations: (authorizations.data || []) as unknown as GSTClientAuthorization[],
    profiles: (profiles.data || []) as unknown as GSTReturnProfile[],
  };
};

export const saveGSTReturnProfiles = async (user: User, client: GSTClientOption, returnTypes: GSTReturnProfileType[]) => {
  const firmId = requireFirm(user);
  if (user.role !== 'SuperAdmin' && user.role !== 'Admin') throw new Error('Only a Super Admin or Admin can configure a client return profile.');
  const { error: removeError } = await supabase.from('gst_client_return_profiles').delete().eq('firm_id', firmId).eq('client_id', client.id);
  if (removeError) throw removeError;
  if (!returnTypes.length) return;
  const { error } = await supabase.from('gst_client_return_profiles').insert(returnTypes.map((returnType) => ({ firm_id: firmId, client_id: client.id, return_type: returnType, filing_frequency: gstReturnFrequency(returnType), created_by: user.id })));
  if (error) throw error;
};

export const saveGSTReturnStatus = async (user: User, input: {
  client: GSTClientOption;
  financialYear: string;
  returnType: GSTReturnType;
  taxPeriod: string;
  status: GSTReturnStatusValue;
  arn?: string;
}) => {
  const firmId = requireFirm(user);
  if (!input.client.gstin) throw new Error('The selected client needs a valid GSTIN.');
  const payload = {
    firm_id: firmId,
    client_id: input.client.id,
    gstin: input.client.gstin,
    financial_year: input.financialYear,
    return_type: input.returnType,
    tax_period: input.taxPeriod,
    status: input.status,
    filed_on: input.status === 'Filed' ? new Date().toISOString().slice(0, 10) : null,
    arn: input.arn?.trim() || null,
    source: 'Manual',
    refreshed_at: new Date().toISOString(),
    updated_by: user.id,
  };
  const { error } = await supabase.from('gst_return_statuses').upsert(payload, {
    onConflict: 'firm_id,client_id,financial_year,return_type,tax_period',
  });
  if (error) throw error;
};

export const recordGSTClientAuthorization = async (user: User, input: {
  client: GSTClientOption;
  expiresOn?: string;
}) => {
  const firmId = requireFirm(user);
  if (user.role !== 'SuperAdmin' && user.role !== 'Admin') throw new Error('Only a Super Admin or Admin can record client authorization.');
  if (!input.client.gstin) throw new Error('The selected client needs a valid GSTIN.');
  const { error } = await supabase.from('gst_client_authorizations').insert({
    firm_id: firmId,
    client_id: input.client.id,
    gstin: input.client.gstin,
    authorization_scope: ['portal.login', 'returns.read', 'returns.download', 'reconciliation.prepare'],
    confirmed_by: user.id,
    expires_on: input.expiresOn || null,
  });
  if (error?.code === '23505') throw new Error('An active authorization is already recorded for this client.');
  if (error) throw error;
};

export const revokeGSTClientAuthorization = async (user: User, id: string) => {
  requireFirm(user);
  const { error } = await supabase.from('gst_client_authorizations').update({
    status: 'Revoked',
    revoked_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', id);
  if (error) throw error;
};

export const recordGSTPortalLaunch = async (user: User, client: GSTClientOption) => {
  const firmId = requireFirm(user);
  await supabase.from('audit_logs').insert({
    firm_id: firmId,
    user_id: user.id,
    user_name: user.name,
    user_role: user.role,
    action: 'GST Portal Launched',
    entity_type: 'GST Practice Hub',
    entity_id: client.id,
    details: JSON.stringify({ clientId: client.id, clientName: client.name, gstin: client.gstin, officialUrl: 'https://www.gst.gov.in/' }),
    severity: 'info',
  });
};

type Cell = string | number | boolean | Date | null;
export type LocalInvoice = { invoiceNumber: string; taxableValue: number; taxAmount: number; raw: Record<string, Cell> };
export type LocalFileSummary = { fileName: string; rows: LocalInvoice[]; totalTaxable: number; totalTax: number; skippedRows: number };
export type LocalReconciliation = {
  matched: number;
  missingInPortal: LocalInvoice[];
  missingInBooks: LocalInvoice[];
  valueMismatches: Array<{ invoiceNumber: string; booksTaxable: number; portalTaxable: number; difference: number }>;
};

const normalizedHeader = (value: Cell) => String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
const amount = (value: Cell) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? '').replace(/[₹,\s]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseCsvLine = (line: string) => {
  const values: string[] = [];
  let current = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && line[index + 1] === '"' && quoted) { current += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === ',' && !quoted) { values.push(current); current = ''; }
    else current += character;
  }
  values.push(current);
  return values;
};

const readRows = async (file: File): Promise<Cell[][]> => {
  if (/\.csv$/i.test(file.name)) return (await file.text()).split(/\r?\n/).filter(Boolean).map(parseCsvLine);
  if (/\.xlsx$/i.test(file.name)) return (await readXlsxFile(file)) as unknown as Cell[][];
  throw new Error('Use a CSV or XLSX file. Legacy XLS files must first be saved as XLSX.');
};

const findIndex = (headers: string[], candidates: string[]) => headers.findIndex((header) => candidates.includes(header));

export const parseLocalGSTInvoiceFile = async (file: File): Promise<LocalFileSummary> => {
  const sheet = await readRows(file);
  if (sheet.length < 2) throw new Error('The file has no invoice rows.');
  const headers = sheet[0].map(normalizedHeader);
  const invoiceIndex = findIndex(headers, ['invoicenumber', 'invoiceno', 'invno', 'documentnumber', 'docno', 'billno']);
  const taxableIndex = findIndex(headers, ['taxablevalue', 'taxableamount', 'taxable', 'assessablevalue']);
  const totalTaxIndex = findIndex(headers, ['totaltax', 'taxamount', 'gstamount']);
  const cgstIndex = findIndex(headers, ['cgst', 'cgstamount']);
  const sgstIndex = findIndex(headers, ['sgst', 'sgstamount', 'utgst', 'utgstamount']);
  const igstIndex = findIndex(headers, ['igst', 'igstamount']);
  const cessIndex = findIndex(headers, ['cess', 'cessamount']);
  if (invoiceIndex < 0 || taxableIndex < 0) throw new Error('The file needs Invoice Number and Taxable Value columns.');
  let skippedRows = 0;
  const rows = sheet.slice(1).flatMap((row) => {
    const invoiceNumber = String(row[invoiceIndex] ?? '').trim().toUpperCase();
    if (!invoiceNumber) { skippedRows += 1; return []; }
    const raw = Object.fromEntries(headers.map((header, index) => [header || `column${index + 1}`, row[index] ?? null]));
    const taxAmount = totalTaxIndex >= 0 ? amount(row[totalTaxIndex]) : [cgstIndex, sgstIndex, igstIndex, cessIndex].filter((index) => index >= 0).reduce((sum, index) => sum + amount(row[index]), 0);
    return [{ invoiceNumber, taxableValue: amount(row[taxableIndex]), taxAmount, raw }];
  });
  return {
    fileName: file.name,
    rows,
    totalTaxable: rows.reduce((sum, row) => sum + row.taxableValue, 0),
    totalTax: rows.reduce((sum, row) => sum + row.taxAmount, 0),
    skippedRows,
  };
};

export const reconcileLocalGSTInvoices = (books: LocalFileSummary, portal: LocalFileSummary): LocalReconciliation => {
  const booksByInvoice = new Map(books.rows.map((row) => [row.invoiceNumber, row]));
  const portalByInvoice = new Map(portal.rows.map((row) => [row.invoiceNumber, row]));
  const missingInPortal = books.rows.filter((row) => !portalByInvoice.has(row.invoiceNumber));
  const missingInBooks = portal.rows.filter((row) => !booksByInvoice.has(row.invoiceNumber));
  const valueMismatches = books.rows.flatMap((bookRow) => {
    const portalRow = portalByInvoice.get(bookRow.invoiceNumber);
    if (!portalRow) return [];
    const difference = Number((bookRow.taxableValue - portalRow.taxableValue).toFixed(2));
    return Math.abs(difference) > 1 ? [{ invoiceNumber: bookRow.invoiceNumber, booksTaxable: bookRow.taxableValue, portalTaxable: portalRow.taxableValue, difference }] : [];
  });
  return { matched: books.rows.length - missingInPortal.length - valueMismatches.length, missingInPortal, missingInBooks, valueMismatches };
};

const downloadText = (fileName: string, content: string, type: string) => {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
};

const csvCell = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;

export const downloadReturnStatusCsv = (rows: GSTReturnStatus[], fileName: string) => {
  const headings = ['Client', 'GSTIN', 'Financial Year', 'Return Type', 'Tax Period', 'Status', 'Filed On', 'ARN', 'Source', 'Last Refreshed'];
  const data = rows.map((row) => [row.client?.name || '', row.gstin, row.financial_year, row.return_type, row.tax_period, row.status, row.filed_on || '', row.arn || '', row.source, row.refreshed_at]);
  downloadText(fileName, [headings, ...data].map((row) => row.map(csvCell).join(',')).join('\n'), 'text/csv;charset=utf-8');
};

export const downloadReconciliationCsv = (result: LocalReconciliation, fileName: string) => {
  const rows = [
    ['Issue', 'Invoice Number', 'Books Taxable', 'Portal Taxable', 'Difference'],
    ...result.missingInPortal.map((row) => ['Missing in portal', row.invoiceNumber, row.taxableValue, '', '']),
    ...result.missingInBooks.map((row) => ['Missing in books', row.invoiceNumber, '', row.taxableValue, '']),
    ...result.valueMismatches.map((row) => ['Value mismatch', row.invoiceNumber, row.booksTaxable, row.portalTaxable, row.difference]),
  ];
  downloadText(fileName, rows.map((row) => row.map(csvCell).join(',')).join('\n'), 'text/csv;charset=utf-8');
};

export const downloadSalesRegisterTemplate = () => downloadText(
  'CAATH-GST-sales-register-template.csv',
  'Invoice Number,Invoice Date,Customer GSTIN,Taxable Value,CGST,SGST,IGST,Cess\nINV-001,2026-04-01,33ABCDE1234F1Z5,10000,900,900,0,0',
  'text/csv;charset=utf-8',
);
