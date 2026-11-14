export type AccountingStorageMode = 'LOCAL' | 'CLOUD' | 'HYBRID';
export type VoucherStatus = 'Draft' | 'Posted';
export type VoucherType = 'Journal' | 'Receipt' | 'Payment' | 'Contra' | 'Sales' | 'Purchase' | 'Credit Note' | 'Debit Note';

export type VoucherLineDraft = {
  accountId: string;
  debit: number;
  credit: number;
  description?: string;
};

export type VoucherDraft = {
  clientId: string;
  financialYearId: string;
  voucherNumber: string;
  voucherDate: string;
  voucherType: VoucherType;
  narration?: string;
  lines: VoucherLineDraft[];
};

export type GSTNormalizedInvoice = {
  source: 'GSP' | 'JSON' | 'EXCEL' | 'CSV' | 'MANUAL';
  direction: 'OUTWARD' | 'INWARD';
  gstin: string;
  counterpartyGstin?: string;
  invoiceNumber: string;
  invoiceDate: string;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  totalValue: number;
  rawReference?: string;
};

export type GSTNormalizedReturnStatus = {
  gstin: string;
  returnType: string;
  period: string;
  status: 'FILED' | 'NOT_FILED' | 'UNKNOWN';
  filedAt?: string;
  acknowledgementNumber?: string;
};
