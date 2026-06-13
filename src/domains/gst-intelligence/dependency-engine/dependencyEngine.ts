import { GSTDatasetType } from '../dataset-registry/registry';

export interface GSTDependencyResolution {
  required: GSTDatasetType[];
  optional: GSTDatasetType[];
  rationale: string[];
}

const PRESET_DEPENDENCIES: Record<string, GSTDependencyResolution> = {
  'quick-health-scan': {
    required: ['GST_PORTAL_EXPORT'],
    optional: ['GSTR3B_JSON', 'RECONCILIATION_HISTORY'],
    rationale: ['Quick scan uses summarized filing posture with optional consistency enhancement.'],
  },
  'monthly-compliance-review': {
    required: ['GSTR1_JSON', 'GSTR3B_JSON', 'GST_PORTAL_EXPORT'],
    optional: ['RECONCILIATION_HISTORY', 'VENDOR_MASTER'],
    rationale: ['Monthly compliance requires outward, summary return, and portal continuity context.'],
  },
  'itc-deep-analysis': {
    required: ['GSTR2B_JSON', 'PURCHASE_REGISTER'],
    optional: ['VENDOR_MASTER', 'RECONCILIATION_HISTORY'],
    rationale: ['ITC deep analysis requires supplier-side 2B and books-side purchase register.'],
  },
  'audit-preparation-mode': {
    required: ['GSTR1_JSON', 'GSTR3B_JSON', 'GSTR2B_JSON', 'PURCHASE_REGISTER', 'SALES_REGISTER'],
    optional: ['EWAY_BILL_EXPORT', 'VENDOR_MASTER'],
    rationale: ['Audit prep requires full outward/inward/books triangulation.'],
  },
  'litigation-defense-mode': {
    required: ['GSTR1_JSON', 'GSTR3B_JSON', 'SALES_REGISTER'],
    optional: ['EWAY_BILL_EXPORT', 'GST_PORTAL_EXPORT'],
    rationale: ['Defense mode prioritizes return consistency and outward evidence continuity.'],
  },
  'cfo-intelligence-report': {
    required: ['GSTR3B_JSON', 'SALES_REGISTER', 'GST_PORTAL_EXPORT'],
    optional: ['PURCHASE_REGISTER', 'RECONCILIATION_HISTORY'],
    rationale: ['CFO view requires liability/cashflow context and sales-side business signal.'],
  },
  'ai-risk-scan': {
    required: ['GSTR2B_JSON', 'PURCHASE_REGISTER', 'GST_PORTAL_EXPORT'],
    optional: ['VENDOR_MASTER', 'RECONCILIATION_HISTORY', 'EWAY_BILL_EXPORT'],
    rationale: ['AI risk scan relies on mismatch, continuity, and optional vendor/logistics enrichments.'],
  },
};

export const resolveDatasetDependencies = (presetId: string, selectedModules: string[]): GSTDependencyResolution => {
  const base = PRESET_DEPENDENCIES[presetId] || PRESET_DEPENDENCIES['monthly-compliance-review'];
  const required = new Set<GSTDatasetType>(base.required);
  const optional = new Set<GSTDatasetType>(base.optional);

  if (selectedModules.includes('ewb-reconciliation')) optional.add('EWAY_BILL_EXPORT');
  if (selectedModules.includes('vendor-compliance-monitoring') || selectedModules.includes('high-risk-vendor-detection')) optional.add('VENDOR_MASTER');
  if (selectedModules.includes('sales-trend-analysis') || selectedModules.includes('gst-rate-anomaly')) required.add('SALES_REGISTER');
  if (selectedModules.includes('gstr2b-reconciliation')) required.add('GSTR2B_JSON');

  required.forEach((dataset) => optional.delete(dataset));
  return {
    required: [...required],
    optional: [...optional],
    rationale: base.rationale,
  };
};
