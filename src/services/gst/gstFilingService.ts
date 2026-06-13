/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GSTRFiling, GSTDashboardSummary } from './gstTypes';
import { gstService } from '../../domains/gst/services/gstService';

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
  const filings = await getAllGSTRFilings(firmId);

  const summary: GSTDashboardSummary = {
    totalClientsWithGST: 0,
    clientsFilingOnTime: 0,
    clientsWithMismatches: 0,
    totalTaxExposed: 0,
    pendingFilings: 0,
    overdueFilings: 0,
    monthlyTrend: [],
  };

  const clientsWithGST = new Set(filings.map(f => f.client_id));
  summary.totalClientsWithGST = clientsWithGST.size;

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
