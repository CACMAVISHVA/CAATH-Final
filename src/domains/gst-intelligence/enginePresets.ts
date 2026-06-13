import { GSTIntelligenceModule, GSTIntelligencePreset } from './types';

export const GST_INTELLIGENCE_MODULES: GSTIntelligenceModule[] = [
  { id: 'filing-delay-analysis', title: 'Filing Delay Analysis', category: 'compliance', description: 'Detect delayed return filing and aging exposure.' },
  { id: 'return-consistency-check', title: 'Return Consistency Check', category: 'compliance', description: 'Validate consistency across return submissions.' },
  { id: 'compliance-health-score', title: 'Compliance Health Score', category: 'compliance', description: 'Measure compliance posture for filing operations.' },
  { id: 'late-fee-risk', title: 'Late Fee/Penalty Risk Detection', category: 'compliance', description: 'Estimate penalty exposure from delayed filings.' },
  { id: 'gstr2b-reconciliation', title: 'GSTR-2B Reconciliation', category: 'itc', description: 'Reconcile purchase register with GSTR-2B claims.' },
  { id: 'missing-itc-detection', title: 'Missing ITC Detection', category: 'itc', description: 'Surface ITC entries missing from eligible credits.' },
  { id: 'excess-itc-detection', title: 'Excess ITC Detection', category: 'itc', description: 'Flag over-claimed input tax credits.' },
  { id: 'blocked-credit-detection', title: 'Blocked Credit Detection', category: 'itc', description: 'Identify potential blocked credit classifications.' },
  { id: 'sales-trend-analysis', title: 'Sales Trend Analysis', category: 'sales', description: 'Analyze monthly taxable sales movement.' },
  { id: 'gst-rate-anomaly', title: 'GST Rate Anomaly Detection', category: 'sales', description: 'Detect unusual effective tax rate behavior.' },
  { id: 'vendor-compliance-monitoring', title: 'Vendor Compliance Monitoring', category: 'vendor_risk', description: 'Track vendor filing behavior and consistency.' },
  { id: 'high-risk-vendor-detection', title: 'High-Risk Vendor Detection', category: 'vendor_risk', description: 'Prioritize vendors with mismatch concentration.' },
  { id: 'audit-risk-score', title: 'GST Audit Risk Score', category: 'audit', description: 'Score likelihood of audit/notice exposure.' },
  { id: 'notice-probability', title: 'Department Notice Probability', category: 'audit', description: 'Estimate risk of notice-triggering patterns.' },
  { id: 'liability-forecasting', title: 'GST Liability Forecasting', category: 'cash_flow', description: 'Forecast liability and near-term payment pressure.' },
  { id: 'itc-lockup-detection', title: 'ITC Lock-up Detection', category: 'cash_flow', description: 'Detect credits locked due to reconciliation issues.' },
  { id: 'workflow-delay-detection', title: 'Workflow Delay Detection', category: 'operational', description: 'Detect process latency and operational bottlenecks.' },
  { id: 'filing-efficiency-metrics', title: 'Filing Efficiency Metrics', category: 'operational', description: 'Track throughput and productivity of filing operations.' },
  { id: 'ewb-reconciliation', title: 'EWB vs GSTR Reconciliation', category: 'eway_bill', description: 'Compare movement declarations and GST returns.' },
  { id: 'ai-compliance-summary', title: 'AI Compliance Summary', category: 'ai', description: 'AI narrative summary of current compliance posture.' },
  { id: 'ai-risk-prioritization', title: 'AI Risk Prioritization', category: 'ai', description: 'Rank high-impact GST risks by operational urgency.' },
  { id: 'ai-workflow-optimization', title: 'AI Workflow Optimization Suggestions', category: 'ai', description: 'Suggest workflow acceleration opportunities.' },
];

const ids = (...values: string[]) => values;

export const GST_INTELLIGENCE_PRESETS: GSTIntelligencePreset[] = [
  {
    id: 'quick-health-scan',
    title: 'Quick Health Scan',
    description: 'Fast compliance posture snapshot for immediate operational review.',
    moduleIds: ids('compliance-health-score', 'return-consistency-check', 'filing-delay-analysis', 'ai-compliance-summary'),
  },
  {
    id: 'monthly-compliance-review',
    title: 'Monthly Compliance Review',
    description: 'Standard CA monthly compliance operations workflow.',
    moduleIds: ids('filing-delay-analysis', 'return-consistency-check', 'late-fee-risk', 'filing-efficiency-metrics', 'ai-risk-prioritization'),
  },
  {
    id: 'itc-deep-analysis',
    title: 'ITC Deep Analysis',
    description: 'High-depth ITC and reconciliation analysis pack.',
    moduleIds: ids('gstr2b-reconciliation', 'missing-itc-detection', 'excess-itc-detection', 'blocked-credit-detection', 'itc-lockup-detection', 'ai-risk-prioritization'),
  },
  {
    id: 'audit-preparation-mode',
    title: 'Audit Preparation Mode',
    description: 'Detailed risk and anomaly scan for audit readiness.',
    moduleIds: ids('audit-risk-score', 'notice-probability', 'gst-rate-anomaly', 'high-risk-vendor-detection', 'ai-compliance-summary', 'ai-risk-prioritization'),
  },
  {
    id: 'litigation-defense-mode',
    title: 'Litigation Defense Mode',
    description: 'Scrutiny-defense oriented compliance intelligence.',
    moduleIds: ids('notice-probability', 'return-consistency-check', 'gstr2b-reconciliation', 'ewb-reconciliation', 'ai-compliance-summary'),
  },
  {
    id: 'cfo-intelligence-report',
    title: 'CFO Intelligence Report',
    description: 'Executive GST risk and cash-flow intelligence bundle.',
    moduleIds: ids('liability-forecasting', 'sales-trend-analysis', 'itc-lockup-detection', 'compliance-health-score', 'ai-compliance-summary'),
  },
  {
    id: 'ai-risk-scan',
    title: 'AI Risk Scan',
    description: 'AI-assisted anomaly and operational risk prioritization.',
    moduleIds: ids('ai-risk-prioritization', 'ai-workflow-optimization', 'high-risk-vendor-detection', 'workflow-delay-detection', 'audit-risk-score'),
  },
];
