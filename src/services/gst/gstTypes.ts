/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type GSTFilingStatus = 'Filed' | 'Pending' | 'Late' | 'Not Filed';
export type ReportType = 'GSTR1 vs GSTR3B' | 'GSTR2B vs Purchase' | 'E-Invoice Reconciliation' | 'Filing Delay' | 'Client Health Score';

export interface GSTRFiling {
  id: string;
  client_id: string;
  gstin: string;
  return_type: 'GSTR1' | 'GSTR3B' | 'GSTR2A' | 'GSTR2B';
  period: string;
  filing_date: string | null;
  due_date: string;
  status: GSTFilingStatus;
  taxable_value: number;
  igst: number;
  cgst: number;
  sgst: number;
  cess: number;
  tax_collected: number;
  tax_claimed: number;
  late_fee: number;
  interest: number;
  created_at: string;
}

export interface GSTR1Data {
  id: string;
  client_id: string;
  gstin: string;
  period: string;
  b2b_invoices: number;
  b2c_invoices: number;
  export_invoices: number;
  total_taxable_value: number;
  igst_collected: number;
  cgst_collected: number;
  sgst_collected: number;
  total_cess: number;
  debit_notes: number;
  credit_notes: number;
  amended_invoices: number;
  hsn_summary: Record<string, { count: number; value: number; tax: number }>;
  created_at: string;
}

export interface GSTR3BData {
  id: string;
  client_id: string;
  gstin: string;
  period: string;
  total_taxable_supply: number;
  total_igst: number;
  total_cgst: number;
  total_sgst: number;
  total_cess: number;
  itc_available: number;
  itc_claimed: number;
  reverse_charge: number;
  late_fee_interest: number;
  tax_paid: number;
  cash_paid: number;
  credit_paid: number;
  created_at: string;
}

export interface PurchaseRegisterEntry {
  id: string;
  client_id: string;
  vendor_gstin: string;
  vendor_name: string;
  invoice_number: string;
  invoice_date: string;
  taxable_value: number;
  igst: number;
  cgst: number;
  sgst: number;
  total_gst: number;
  itc_claimed: boolean;
  matched: boolean;
  mismatch_reason?: string;
}

export interface GSTR2BReconciliation {
  id: string;
  client_id: string;
  period: string;
  total_purchase_value: number;
  total_gstr2b_value: number;
  missing_itc: number;
  extra_itc: number;
  vendor_mismatches: number;
  matched_invoices: number;
  unmatched_invoices: number;
  details: {
    invoiceNumber: string;
    vendorGstin: string;
    purchaseValue: number;
    gstr2bValue: number;
    mismatchAmount: number;
    reason: string;
  }[];
  created_at: string;
}

export interface MismatchReport {
  type: 'GSTR1 vs GSTR3B' | 'GSTR2B vs Purchase' | 'E-Invoice';
  period: string;
  clientName: string;
  gstin: string;
  amount: number;
  description: string;
  severity: 'high' | 'medium' | 'low';
}

export interface FilingDelayAnalytics {
  client_id: string;
  client_name: string;
  gstin: string;
  return_type: string;
  due_date: string;
  filed_date: string | null;
  days_late: number;
  penalty: number;
  interest: number;
  total_exposure: number;
}

export interface ClientHealthScore {
  client_id: string;
  client_name: string;
  gstin: string;
  overall_score: number;
  timeliness_score: number;
  accuracy_score: number;
  compliance_score: number;
  mismatches: number;
  notices: number;
  last_filed: string | null;
  next_due: string | null;
}

export interface GSTDashboardSummary {
  totalClientsWithGST: number;
  clientsFilingOnTime: number;
  clientsWithMismatches: number;
  totalTaxExposed: number;
  pendingFilings: number;
  overdueFilings: number;
  monthlyTrend: { month: string; filed: number; late: number; pending: number }[];
}
