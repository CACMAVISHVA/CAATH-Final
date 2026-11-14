import { GSTDatasetType, getDatasetDefinition } from '../dataset-registry/registry';

export interface UploadSessionDatasetState {
  dataset: GSTDatasetType;
  required: boolean;
  status: 'pending' | 'uploaded' | 'parsed' | 'validated' | 'ready' | 'failed';
  fileName?: string;
  message?: string;
  parseSummary?: {
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
    invoices: Array<{
      invoiceNumber: string;
      gstin: string;
      invoiceDate: string | null;
      taxableValue: number;
      taxAmount: number;
    }>;
  };
}

export interface UploadSessionState {
  id: string;
  datasets: UploadSessionDatasetState[];
  createdAt: string;
}

export const createAdaptiveUploadSession = (params: {
  required: GSTDatasetType[];
  optional: GSTDatasetType[];
}): UploadSessionState => {
  const makeRow = (dataset: GSTDatasetType, required: boolean): UploadSessionDatasetState => ({
    dataset,
    required,
    status: 'pending',
    message: required ? 'Required for selected analysis.' : 'Optional enrichment for higher accuracy.',
  });
  return {
    id: `gst_upload_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    datasets: [...params.required.map((dataset) => makeRow(dataset, true)), ...params.optional.map((dataset) => makeRow(dataset, false))],
    createdAt: new Date().toISOString(),
  };
};

export const markDatasetUploaded = (
  session: UploadSessionState,
  dataset: GSTDatasetType,
  fileName: string
): UploadSessionState => ({
  ...session,
  datasets: session.datasets.map((item) => item.dataset === dataset
    ? { ...item, status: 'uploaded', fileName, message: `Uploaded ${fileName}. Parsing queued.` }
    : item),
});

export const markDatasetParsed = (
  session: UploadSessionState,
  dataset: GSTDatasetType,
  fileName: string,
  parseSummary: NonNullable<UploadSessionDatasetState['parseSummary']>,
): UploadSessionState => ({
  ...session,
  datasets: session.datasets.map((item) => item.dataset === dataset
    ? {
      ...item,
      status: parseSummary.valid ? 'parsed' : 'failed',
      fileName,
      parseSummary,
      message: parseSummary.valid
        ? `${parseSummary.records} record(s) parsed and validated.`
        : parseSummary.errors.join(' '),
    }
    : item),
});

export const getUploadGuidance = (dataset: GSTDatasetType) => {
  const def = getDatasetDefinition(dataset);
  return `${def.label}: Accepted ${def.acceptedFormats.join(', ').toUpperCase()} formats.`;
};

export const requiredDatasetsReady = (session: UploadSessionState) =>
  session.datasets
    .filter((item) => item.required)
    .every((item) => ['uploaded', 'parsed', 'validated', 'ready'].includes(item.status));
