import { GSTDatasetType } from '../dataset-registry/registry';
import { ParsedDatasetArtifact } from '../parsing-engine/parsingEngine';

export interface GSTDatasetLineageRecord {
  dataset: GSTDatasetType;
  normalizedSchema: string;
  records: number;
  uploadedAt: string;
}

export interface GSTIntelligenceStorageEnvelope {
  tenantId: string;
  clientId: string;
  financialYear: string;
  filingPeriod: string;
  lineage: GSTDatasetLineageRecord[];
  processingStage: 'parsed' | 'validated' | 'ready';
}

export const buildStorageEnvelope = (params: {
  tenantId: string;
  clientId: string;
  financialYear: string;
  filingPeriod: string;
  artifacts: ParsedDatasetArtifact[];
  stage: GSTIntelligenceStorageEnvelope['processingStage'];
}): GSTIntelligenceStorageEnvelope => ({
  tenantId: params.tenantId,
  clientId: params.clientId,
  financialYear: params.financialYear,
  filingPeriod: params.filingPeriod,
  processingStage: params.stage,
  lineage: params.artifacts.map((item) => ({
    dataset: item.dataset,
    normalizedSchema: item.normalizedSchema,
    records: item.records,
    uploadedAt: new Date().toISOString(),
  })),
});
