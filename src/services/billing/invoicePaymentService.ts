/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../../lib/supabase';
import { User } from '../../types';
import { PaymentEntry } from './invoiceTypes';
import { getInvoice } from './invoiceCoreService';
import { writeFinancialAudit } from './invoiceAuditService';
import { publishEnterpriseEvent } from '../enterpriseEventBusService';

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

  // Create payment record
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

  // Update invoice totals
  const newPaidAmount = invoice.paid_amount + amount;
  const newPendingAmount = invoice.pending_amount - amount;

  let newStatus = invoice.status;
  if (newPendingAmount <= 0) {
    newStatus = 'Paid';
  } else if (newPaidAmount > 0) {
    newStatus = 'Partially Paid';
  }

  // Check for overdue
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

  if (newStatus === 'Overdue') {
    await publishEnterpriseEvent({
      eventName: 'receivable_overdue',
      firmId,
      sourceService: 'billing.invoicePaymentService.addPayment',
      actor: { id: user.id, name: user.name, role: user.role },
      workflowType: 'invoices',
      workflowId: invoiceId,
      payload: {
        invoiceNumber: invoice.invoice_number,
        pendingAmount: Math.max(0, newPendingAmount),
        dueDate: invoice.due_date,
      },
    });
  }

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
