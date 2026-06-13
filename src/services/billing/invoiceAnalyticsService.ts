/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { InvoiceStatus } from './invoiceTypes';
import { getInvoices } from './invoiceCoreService';

export const getReceivablesSummary = async (firmId: string) => {
  const invoices = await getInvoices(firmId);

  const summary = {
    totalBilled: 0,
    totalReceived: 0,
    totalPending: 0,
    totalOverdue: 0,
    byStatus: {} as Record<InvoiceStatus, number>,
    byAging: {
      '0-30': 0,
      '31-60': 0,
      '61-90': 0,
      '90+': 0,
    },
  };

  const today = new Date();

  invoices.forEach(inv => {
    if (inv.status === 'Cancelled') return;

    summary.totalBilled += inv.total;
    summary.totalReceived += inv.paid_amount;
    summary.totalPending += inv.pending_amount;

    // Status counts
    summary.byStatus[inv.status] = (summary.byStatus[inv.status] || 0) + 1;

    // Overdue
    if (new Date(inv.due_date) < today && inv.pending_amount > 0) {
      summary.totalOverdue += inv.pending_amount;
    }

    // Aging analysis
    if (inv.pending_amount > 0) {
      const daysSinceDue = Math.floor((today.getTime() - new Date(inv.due_date).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceDue <= 30) {
        summary.byAging['0-30'] += inv.pending_amount;
      } else if (daysSinceDue <= 60) {
        summary.byAging['31-60'] += inv.pending_amount;
      } else if (daysSinceDue <= 90) {
        summary.byAging['61-90'] += inv.pending_amount;
      } else {
        summary.byAging['90+'] += inv.pending_amount;
      }
    }
  });

  return summary;
};
