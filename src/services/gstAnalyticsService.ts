/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Main export file for GST analytics domain.
 * This file re-exports from domain-specific services for backward compatibility.
 */

// Types
export type {
  GSTFilingStatus,
  ReportType,
  GSTRFiling,
  GSTR1Data,
  GSTR3BData,
  PurchaseRegisterEntry,
  GSTR2BReconciliation,
  MismatchReport,
  FilingDelayAnalytics,
  ClientHealthScore,
  GSTDashboardSummary,
} from './gst/gstTypes';

// Filing Service
export {
  createGSTRFiling,
  getGSTRFilings,
  getAllGSTRFilings,
  getGSTDashboardSummary,
} from './gst/gstFilingService';

// Reconciliation Service
export {
  getGSTR1VsGSTR3BReconciliation,
  getGSTR2BvsPurchaseReconciliation,
} from './gst/gstReconciliationService';

// Health Score Service
export {
  getFilingDelayAnalytics,
  getClientHealthScore,
  getAllClientsHealthScores,
} from './gst/gstHealthScoreService';

// Export helpers and compatibility shims
export { exportGSTReport, getHealthScoreColor } from './gst/gstExportService';
