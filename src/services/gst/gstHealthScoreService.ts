/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ClientHealthScore, FilingDelayAnalytics, GSTRFiling } from './gstTypes';
import { getGSTRFilings, getAllGSTRFilings } from './gstFilingService';
import { gstService } from '../../domains/gst/services/gstService';

export const getFilingDelayAnalytics = async (firmId: string): Promise<FilingDelayAnalytics[]> => {
  const filings = await getAllGSTRFilings(firmId);
  const delays: FilingDelayAnalytics[] = [];

  const clients = await gstService.getGSTOperationalContext(firmId);
  const clientMap = new Map(clients.map((c) => [c.clientId, c.clientName]));

  filings.forEach(filing => {
    if (filing.filing_date) {
      const dueDate = new Date(filing.due_date);
      const filedDate = new Date(filing.filing_date);
      const daysLate = Math.floor((filedDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysLate > 0) {
        const penalty = daysLate * 50;
        const interest = filing.taxable_value * 0.18 * (daysLate / 365);

        delays.push({
          client_id: filing.client_id,
          client_name: clientMap.get(filing.client_id) || 'Unknown',
          gstin: filing.gstin,
          return_type: filing.return_type,
          due_date: filing.due_date,
          filed_date: filing.filing_date,
          days_late: daysLate,
          penalty,
          interest,
          total_exposure: penalty + interest,
        });
      }
    }
  });

  return delays.sort((a, b) => b.total_exposure - a.total_exposure);
};

export const getClientHealthScore = async (clientId: string): Promise<ClientHealthScore | null> => {
  const client = await gstService.getClientById(clientId);
  if (!client) return null;

  const filings = await getGSTRFilings(clientId);

  const totalFilings = filings.length;
  let timelinessScore = 100;
  let accuracyScore = 100;
  let complianceScore = 100;
  let mismatches = 0;
  let lastFiled: string | null = null;
  let nextDue: string | null = null;

  const sortedByDue = [...filings].sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  const upcoming = sortedByDue.filter(f => f.status !== 'Filed' && new Date(f.due_date) > new Date());
  if (upcoming.length > 0) nextDue = upcoming[0].due_date;

  filings.forEach(filing => {
    if (filing.status === 'Late') {
      timelinessScore -= 15;
      complianceScore -= 10;
    }
    if (filing.status === 'Not Filed') {
      timelinessScore -= 25;
      complianceScore -= 20;
    }
    if (filing.interest > 0 || filing.late_fee > 0) {
      accuracyScore -= 10;
      mismatches++;
    }
    if (filing.filing_date && (!lastFiled || new Date(filing.filing_date) > new Date(lastFiled))) {
      lastFiled = filing.filing_date;
    }
  });

  const overallScore = Math.max(0, Math.round((timelinessScore + accuracyScore + complianceScore) / 3));

  return {
    client_id: clientId,
    client_name: client.name || 'Unknown',
    gstin: filings[0]?.gstin || '',
    overall_score: overallScore,
    timeliness_score: Math.max(0, timelinessScore),
    accuracy_score: Math.max(0, accuracyScore),
    compliance_score: Math.max(0, complianceScore),
    mismatches,
    notices: 0,
    last_filed: lastFiled,
    next_due: nextDue,
  };
};

export const getAllClientsHealthScores = async (firmId: string): Promise<ClientHealthScore[]> => {
  const clients = await gstService.getGSTOperationalContext(firmId);
  if (!clients) return [];

  const scores: ClientHealthScore[] = [];
  for (const client of clients) {
    const score = await getClientHealthScore(client.clientId);
    if (score) scores.push(score);
  }

  return scores.sort((a, b) => b.overall_score - a.overall_score);
};
