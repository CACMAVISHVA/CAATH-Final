/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../../lib/supabase';
import { User } from '../../types';
import { Invoice, PaymentEntry, InvoiceStatus, InvoiceInput } from './invoiceTypes';

export const writeFinancialAudit = async (params: {
  firmId: string;
  user: User;
  action: string;
  entityType: 'Invoice' | 'Payment' | 'Expense';
  entityId: string;
  details: string;
  beforeState?: Record<string, unknown>;
  afterState?: Record<string, unknown>;
}) => {
  await supabase.from('audit_logs').insert([{
    firm_id: params.firmId,
    user_id: params.user.id,
    user_name: params.user.name,
    user_role: params.user.role,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId,
    details: params.details,
    before_state: params.beforeState ? JSON.stringify(params.beforeState) : null,
    after_state: params.afterState ? JSON.stringify(params.afterState) : null,
  }]);
};

export const generateInvoiceNumber = async (firmId: string): Promise<string> => {
  const year = new Date().getFullYear();
  const shortYear = year.toString().slice(-2);
  const nextYear = (year + 1).toString().slice(-2);
  const FY = `${shortYear}-${nextYear}`;

  const { data: lastInvoice } = await supabase
    .from('invoices')
    .select('invoice_number')
    .eq('firm_id', firmId)
    .like('invoice_number', `INV-${FY}%`)
    .order('invoice_number', { ascending: false })
    .limit(1)
    .single();

  let sequence = 1;
  if (lastInvoice) {
    const lastSeq = parseInt(lastInvoice.invoice_number.split('-')[2] || '0');
    sequence = lastSeq + 1;
  }

  return `INV-${FY}-${sequence.toString().padStart(4, '0')}`;
};

export const getInvoices = async (firmId: string): Promise<Invoice[]> => {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('firm_id', firmId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as Invoice[];
};

export const getClientInvoices = async (clientId: string): Promise<Invoice[]> => {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as Invoice[];
};

export const getInvoice = async (invoiceId: string): Promise<Invoice | null> => {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', invoiceId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data as Invoice | null;
};

export const updateInvoice = async (
  invoiceId: string,
  updates: Partial<{
    status: InvoiceStatus;
    notes: string;
    terms: string;
    due_date: string;
  }>,
  user: User,
  firmId: string
) => {
  const { error } = await supabase
    .from('invoices')
    .update({
      ...updates,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', invoiceId);

  if (error) throw error;

  await writeFinancialAudit({
    firmId,
    user,
    action: 'Invoice Updated',
    entityType: 'Invoice',
    entityId: invoiceId,
    details: `Invoice updated`,
  });
};

export const addPayment = async (
  invoiceId: string,
  amount: number,
  paymentMode: PaymentEntry['payment_mode'],
  reference: string,
  receivedBy: string,
  remarks: string,
  user: User,
  firmId: string
): Promise<PaymentEntry> => {
  const invoice = await getInvoice(invoiceId);
  if (!invoice) throw new Error('Invoice not found');

  const paymentDate = new Date().toISOString();

  const { data: payment, error: paymentError } = await supabase
    .from('invoice_payments')
    .insert([{
      invoice_id: invoiceId,
      amount,
      payment_date: paymentDate,
      payment_mode: paymentMode,
      reference,
      received_by: receivedBy,
      remarks,
    }])
    .select()
    .single();

  if (paymentError) throw paymentError;

  const newPaidAmount = invoice.paid_amount + amount;
  const newPendingAmount = invoice.pending_amount - amount;

  let newStatus: InvoiceStatus = invoice.status;
  if (newPendingAmount <= 0) {
    newStatus = 'Paid';
  } else if (newPaidAmount > 0) {
    newStatus = 'Partially Paid';
  }

  if (newStatus !== 'Paid' && new Date(invoice.due_date) < new Date()) {
    newStatus = 'Overdue';
  }

  await supabase
    .from('invoices')
    .update({
      paid_amount: newPaidAmount,
      pending_amount: Math.max(0, newPendingAmount),
      status: newStatus,
      paid_date: newStatus === 'Paid' ? paymentDate : invoice.paid_date,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', invoiceId);

  await writeFinancialAudit({
    firmId,
    user,
    action: 'Payment Received',
    entityType: 'Payment',
    entityId: payment.id,
    details: `Payment of ₹${amount.toLocaleString()} received for invoice ${invoice.invoice_number}`,
    afterState: { amount, mode: paymentMode },
  });

  return payment as PaymentEntry;
};

export const getInvoicePayments = async (invoiceId: string): Promise<PaymentEntry[]> => {
  const { data, error } = await supabase
    .from('invoice_payments')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('payment_date', { ascending: false });

  if (error) throw error;
  return (data || []) as PaymentEntry[];
};

export const cancelInvoice = async (invoiceId: string, reason: string, user: User, firmId: string) => {
  const invoice = await getInvoice(invoiceId);
  if (!invoice) throw new Error('Invoice not found');

  if (invoice.paid_amount > 0) {
    throw new Error('Cannot cancel invoice with payments. Reverse payments first.');
  }

  await supabase
    .from('invoices')
    .update({
      status: 'Cancelled',
      cancelled_date: new Date().toISOString(),
      cancelled_reason: reason,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', invoiceId);

  await writeFinancialAudit({
    firmId,
    user,
    action: 'Invoice Cancelled',
    entityType: 'Invoice',
    entityId: invoiceId,
    details: `Invoice ${invoice.invoice_number} cancelled. Reason: ${reason}`,
  });
};

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

    summary.byStatus[inv.status] = (summary.byStatus[inv.status] || 0) + inv.pending_amount;

    if (inv.pending_amount > 0 && inv.status !== 'Paid') {
      const daysOverdue = Math.floor((today.getTime() - new Date(inv.due_date).getTime()) / (1000 * 60 * 60 * 24));

      if (daysOverdue <= 0) {
        summary.byAging['0-30'] += inv.pending_amount;
      } else if (daysOverdue <= 30) {
        summary.byAging['0-30'] += inv.pending_amount;
      } else if (daysOverdue <= 60) {
        summary.byAging['31-60'] += inv.pending_amount;
      } else if (daysOverdue <= 90) {
        summary.byAging['61-90'] += inv.pending_amount;
      } else {
        summary.byAging['90+'] += inv.pending_amount;
        summary.totalOverdue += inv.pending_amount;
      }
    }
  });

  return summary;
};

export const getClientFinancialSummary = async (clientId: string) => {
  const invoices = await getClientInvoices(clientId);

  const totalBilled = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalReceived = invoices.reduce((sum, inv) => sum + inv.paid_amount, 0);
  const totalPending = invoices.reduce((sum, inv) => sum + inv.pending_amount, 0);

  const paidInvoices = invoices.filter(inv => inv.status === 'Paid').length;
  const pendingInvoices = invoices.filter(inv => ['Partially Paid', 'Sent', 'Viewed', 'Generated'].includes(inv.status)).length;
  const overdueInvoices = invoices.filter(inv => inv.status === 'Overdue').length;

  return {
    totalBilled,
    totalReceived,
    totalPending,
    collectionEfficiency: totalBilled > 0 ? Math.round((totalReceived / totalBilled) * 100) : 0,
    invoiceCount: invoices.length,
    paidInvoices,
    pendingInvoices,
    overdueInvoices,
  };
};
