import { GSTDatasetType } from '../dataset-registry/registry';
import { UploadSessionState } from '../upload-orchestrator/uploadOrchestrator';

export interface ParsedDatasetArtifact {
  dataset: GSTDatasetType;
  records: number;
  parser: string;
  normalizedSchema: string;
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

export const parseAndNormalizeSession = (session: UploadSessionState): ParsedDatasetArtifact[] => {
  return session.datasets
    .filter((item) => ['uploaded', 'parsed', 'validated', 'ready'].includes(item.status))
    .map((item) => ({
      dataset: item.dataset,
      records: item.fileName ? 1 : 0,
      parser: parserByDataset[item.dataset],
      normalizedSchema: `gst.normalized.${item.dataset.toLowerCase()}.v1`,
    }));
};
