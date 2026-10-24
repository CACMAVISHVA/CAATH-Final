/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GSTRFiling, GSTDashboardSummary } from './gstTypes';
import { gstService } from '../../domains/gst/services/gstService';
import { supabase } from '../../lib/supabase';

export const createGSTRFiling = async (filing: Omit<GSTRFiling, 'id' | 'created_at'>): Promise<GSTRFiling> => {
  return gstService.createGSTRFiling(filing);
};

export const getGSTRFilings = async (clientId: string): Promise<GSTRFiling[]> => {
  return gstService.getGSTRFilings(clientId);
};

export const getAllGSTRFilings = async (firmId: string): Promise<GSTRFiling[]> => {
  return gstService.getAllGSTRFilings(firmId);
};

export const getGSTDashboardSummary = async (firmId: string): Promise<GSTDashboardSummary> => {
  const [filings, gstClientsResult] = await Promise.all([
    getAllGSTRFilings(firmId),
    supabase.from('clients').select('id', { count: 'exact', head: true }).eq('firm_id', firmId).contains('services', ['GST Filing']),
  ]);
  if (gstClientsResult.error) throw gstClientsResult.error;

  const summary: GSTDashboardSummary = {
    totalClientsWithGST: 0,
    clientsFilingOnTime: 0,
    clientsWithMismatches: 0,
    totalTaxExposed: 0,
    pendingFilings: 0,
    overdueFilings: 0,
    monthlyTrend: [],
  };

  // A GST client belongs in the firm summary as soon as GST Filing is assigned;
  // GSTIN collection is a setup requirement, not a reason to hide active work.
  summary.totalClientsWithGST = gstClientsResult.count || 0;

  const today = new Date();

  filings.forEach(filing => {
    if (filing.status === 'Pending') summary.pendingFilings++;
    if (filing.status === 'Late' || (filing.filing_date && new Date(filing.filing_date) > new Date(filing.due_date))) {
      summary.overdueFilings++;
      summary.totalTaxExposed += filing.late_fee + filing.interest;
    }
    if (filing.status === 'Filed' && filing.filing_date) {
      const filedDate = new Date(filing.filing_date);
      const dueDate = new Date(filing.due_date);
      if (filedDate <= dueDate) summary.clientsFilingOnTime++;
    }
  });

  return summary;
};
