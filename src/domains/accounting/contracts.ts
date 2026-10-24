import { AccountingStorageMode, GSTNormalizedInvoice, GSTNormalizedReturnStatus, VoucherDraft } from './types';

export interface AccountingStorageAdapter {
  readonly mode: AccountingStorageMode;
  saveDraft(voucher: VoucherDraft): Promise<string>;
  loadDraft(voucherId: string): Promise<VoucherDraft | null>;
  removeDraft(voucherId: string): Promise<void>;
  syncPending?(): Promise<{ pushed: number; failed: number }>;
}

export interface AccountingDataConnector {
  readonly connectorId: string;
  readonly displayName: string;
  importChartOfAccounts(input: ArrayBuffer): Promise<Array<{ code: string; name: string; type: string }>>;
  importOpeningBalances(input: ArrayBuffer): Promise<Array<{ accountCode: string; debit: number; credit: number }>>;
  importTransactions(input: ArrayBuffer): Promise<VoucherDraft[]>;
  exportTransactions(vouchers: VoucherDraft[]): Promise<Blob>;
}

// Providers are adapters behind this boundary. The accounting and GST modules
// consume normalized CAATH models and never depend on provider-specific payloads.
export interface GSTGateway {
  readonly providerId: string;
  fetchReturnStatus(params: { gstin: string; fromPeriod: string; toPeriod: string }): Promise<GSTNormalizedReturnStatus[]>;
  fetchInvoices(params: { gstin: string; returnType: string; period: string }): Promise<GSTNormalizedInvoice[]>;
  testConnection(): Promise<{ available: boolean; message: string }>;
}

export interface GSTFileImporter {
  readonly format: 'JSON' | 'EXCEL' | 'CSV';
  parse(input: ArrayBuffer): Promise<GSTNormalizedInvoice[]>;
}
