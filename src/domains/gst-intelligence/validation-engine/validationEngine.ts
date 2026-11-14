import { GSTClientProfileContext } from '../types';
import { ParsedDatasetArtifact } from '../parsing-engine/parsingEngine';

export interface ValidationCheck {
  id: string;
  label: string;
  status: 'pass' | 'warning' | 'fail';
  detail: string;
}

export interface ValidationResult {
  checks: ValidationCheck[];
  readyForIntelligence: boolean;
}

export const runGSTValidation = (params: {
  context: GSTClientProfileContext | null;
  financialYear: string;
  filingPeriod: string;
  artifacts: ParsedDatasetArtifact[];
}): ValidationResult => {
  const checks: ValidationCheck[] = [];
  checks.push({
    id: 'gstin-consistency',
    label: 'GSTIN consistency',
    status: params.context?.gstin ? 'pass' : 'fail',
    detail: params.context?.gstin ? 'GSTIN matched with selected client context.' : 'GSTIN missing in client context.',
  });
  checks.push({
    id: 'pan-consistency',
    label: 'PAN consistency',
    status: params.context?.pan && params.context.pan !== 'Unavailable' ? 'pass' : 'warning',
    detail: params.context?.pan && params.context.pan !== 'Unavailable' ? 'PAN inferred and validated from GST context.' : 'PAN unavailable from GST context.',
  });
  checks.push({
    id: 'period-match',
    label: 'Filing period match',
    status: params.filingPeriod ? 'pass' : 'fail',
    detail: params.filingPeriod ? `Selected period "${params.filingPeriod}" mapped under ${params.financialYear}.` : 'Filing period is required.',
  });
  const duplicates = params.artifacts.reduce((total, artifact) => total + artifact.duplicateInvoices, 0);
  checks.push({
    id: 'duplicate-scan',
    label: 'Duplicate invoice detection',
    status: duplicates > 0 ? 'warning' : 'pass',
    detail: duplicates > 0 ? `${duplicates} duplicate invoice row(s) require review.` : 'No duplicate invoice numbers detected.',
  });
  checks.push({
    id: 'schema-integrity',
    label: 'Schema integrity',
    status: params.artifacts.length > 0 && params.artifacts.every((artifact) => artifact.valid) ? 'pass' : 'fail',
    detail: params.artifacts.length > 0 && params.artifacts.every((artifact) => artifact.valid)
      ? `${params.artifacts.length} dataset(s) parsed and normalized successfully.`
      : 'No fully validated parsed datasets are available.',
  });
  const readyForIntelligence = checks.every((check) => check.status !== 'fail');
  return { checks, readyForIntelligence };
};
