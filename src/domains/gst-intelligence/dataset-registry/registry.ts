export type GSTDatasetType =
  | 'GSTR1_JSON'
  | 'GSTR2B_JSON'
  | 'GSTR3B_JSON'
  | 'PURCHASE_REGISTER'
  | 'SALES_REGISTER'
  | 'EWAY_BILL_EXPORT'
  | 'VENDOR_MASTER'
  | 'GST_PORTAL_EXPORT'
  | 'RECONCILIATION_HISTORY';

export type GSTDatasetFormat = 'json' | 'xlsx' | 'xls' | 'csv' | 'zip';

export interface GSTDatasetDefinition {
  type: GSTDatasetType;
  label: string;
  description: string;
  acceptedFormats: GSTDatasetFormat[];
  supportedAnalyses: string[];
  parsingStrategy: 'gst_json_parser' | 'excel_invoice_parser' | 'csv_tabular_parser' | 'archive_extractor';
  normalizationContract: string;
  schemaHints: string[];
}

export const GST_DATASET_REGISTRY: Record<GSTDatasetType, GSTDatasetDefinition> = {
  GSTR1_JSON: {
    type: 'GSTR1_JSON',
    label: 'GSTR-1 JSON',
    description: 'Outward supply declarations for sales-side compliance analysis.',
    acceptedFormats: ['json', 'zip'],
    supportedAnalyses: ['audit-preparation-mode', 'litigation-defense-mode', 'monthly-compliance-review'],
    parsingStrategy: 'gst_json_parser',
    normalizationContract: 'gst.gstr1.v1',
    schemaHints: ['gstin', 'fp', 'b2b', 'b2cl'],
  },
  GSTR2B_JSON: {
    type: 'GSTR2B_JSON',
    label: 'GSTR-2B JSON',
    description: 'ITC eligibility and supplier-reported invoice data.',
    acceptedFormats: ['json', 'zip'],
    supportedAnalyses: ['itc-deep-analysis', 'audit-preparation-mode', 'ai-risk-scan', 'monthly-compliance-review'],
    parsingStrategy: 'gst_json_parser',
    normalizationContract: 'gst.gstr2b.v1',
    schemaHints: ['gstin', 'fp', 'b2b', 'cdnr'],
  },
  GSTR3B_JSON: {
    type: 'GSTR3B_JSON',
    label: 'GSTR-3B JSON',
    description: 'Summary return dataset for liability/ITC consistency checks.',
    acceptedFormats: ['json', 'zip'],
    supportedAnalyses: ['audit-preparation-mode', 'monthly-compliance-review', 'litigation-defense-mode'],
    parsingStrategy: 'gst_json_parser',
    normalizationContract: 'gst.gstr3b.v1',
    schemaHints: ['gstin', 'ret_period', 'sup_details', 'itc_elg'],
  },
  PURCHASE_REGISTER: {
    type: 'PURCHASE_REGISTER',
    label: 'Purchase Register',
    description: 'Books-side inward invoices for ITC reconciliation.',
    acceptedFormats: ['xlsx', 'xls', 'csv'],
    supportedAnalyses: ['itc-deep-analysis', 'audit-preparation-mode', 'monthly-compliance-review'],
    parsingStrategy: 'excel_invoice_parser',
    normalizationContract: 'gst.purchase_register.v1',
    schemaHints: ['invoice_number', 'invoice_date', 'vendor_gstin', 'taxable_value'],
  },
  SALES_REGISTER: {
    type: 'SALES_REGISTER',
    label: 'Sales Register',
    description: 'Books-side outward invoices for sales and rate anomaly analysis.',
    acceptedFormats: ['xlsx', 'xls', 'csv'],
    supportedAnalyses: ['audit-preparation-mode', 'cfo-intelligence-report', 'litigation-defense-mode'],
    parsingStrategy: 'excel_invoice_parser',
    normalizationContract: 'gst.sales_register.v1',
    schemaHints: ['invoice_number', 'invoice_date', 'recipient_gstin', 'taxable_value'],
  },
  EWAY_BILL_EXPORT: {
    type: 'EWAY_BILL_EXPORT',
    label: 'E-Way Bill Export',
    description: 'Movement declarations for logistics and supply-chain anomaly checks.',
    acceptedFormats: ['xlsx', 'csv', 'zip'],
    supportedAnalyses: ['audit-preparation-mode', 'litigation-defense-mode'],
    parsingStrategy: 'csv_tabular_parser',
    normalizationContract: 'gst.eway_bill.v1',
    schemaHints: ['ewb_no', 'doc_no', 'from_gstin', 'to_gstin'],
  },
  VENDOR_MASTER: {
    type: 'VENDOR_MASTER',
    label: 'Vendor Master',
    description: 'Vendor profile metadata for dependency and risk segmentation.',
    acceptedFormats: ['xlsx', 'csv'],
    supportedAnalyses: ['itc-deep-analysis', 'ai-risk-scan', 'audit-preparation-mode'],
    parsingStrategy: 'csv_tabular_parser',
    normalizationContract: 'gst.vendor_master.v1',
    schemaHints: ['vendor_name', 'vendor_gstin', 'state', 'risk_tier'],
  },
  GST_PORTAL_EXPORT: {
    type: 'GST_PORTAL_EXPORT',
    label: 'GST Portal Export',
    description: 'Portal-level consolidated export for compliance continuity.',
    acceptedFormats: ['zip', 'json', 'xlsx'],
    supportedAnalyses: ['monthly-compliance-review', 'quick-health-scan', 'cfo-intelligence-report'],
    parsingStrategy: 'archive_extractor',
    normalizationContract: 'gst.portal_export.v1',
    schemaHints: ['return_type', 'period', 'status', 'filed_on'],
  },
  RECONCILIATION_HISTORY: {
    type: 'RECONCILIATION_HISTORY',
    label: 'Reconciliation History',
    description: 'Prior mismatch closure history for trend and repeat-risk analysis.',
    acceptedFormats: ['xlsx', 'csv', 'json'],
    supportedAnalyses: ['itc-deep-analysis', 'ai-risk-scan'],
    parsingStrategy: 'csv_tabular_parser',
    normalizationContract: 'gst.reconciliation_history.v1',
    schemaHints: ['invoice_number', 'status', 'closed_on', 'remarks'],
  },
};

export const getDatasetDefinition = (type: GSTDatasetType) => GST_DATASET_REGISTRY[type];
