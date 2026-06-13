/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../../lib/supabase';
import { User } from '../../types';
import { Invoice, InvoiceInput, InvoiceLineItem, InvoiceStatus } from './invoiceTypes';
import { generateInvoiceNumber, calculateTax } from './invoiceGenerationService';
import { writeFinancialAudit } from './invoiceAuditService';
import { publishEnterpriseEvent } from '../enterpriseEventBusService';

export const createInvoice = async (input: InvoiceInput): Promise<Invoice> => {
  const { firmId, clientId, clientName, placeOfSupply, gstTreatment, billingCategory, issueDate, dueDate, lineItems, notes, terms, user } = input;

  // Calculate line items with tax
  let subtotal = 0;
  let totalDiscount = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;

  const processedLineItems: InvoiceLineItem[] = lineItems.map(item => {
    const baseAmount = (item.quantity * item.rate) - item.discount;
    const tax = calculateTax(baseAmount, item.gstRate, placeOfSupply, gstTreatment);

    subtotal += item.quantity * item.rate;
    totalDiscount += item.discount;
    totalCgst += tax.cgst;
    totalSgst += tax.sgst;
    totalIgst += tax.igst;

    return {
      ...item,
      amount: baseAmount,
      cgst: tax.cgst,
      sgst: tax.sgst,
      igst: tax.igst,
    };
  });

  const totalGst = totalCgst + totalSgst + totalIgst;
  const total = (subtotal - totalDiscount) + totalGst;

  // Generate invoice number
  const invoiceNumber = await generateInvoiceNumber(firmId);

  const { data, error } = await supabase
    .from('invoices')
    .insert([{
      firm_id: firmId,
      client_id: clientId,
      invoice_number: invoiceNumber,
      financial_year: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
      issue_date: issueDate,
      due_date: dueDate,
      place_of_supply: placeOfSupply,
      gst_treatment: gstTreatment,
      billing_category: billingCategory,
      subtotal,
      discount: totalDiscount,
      cgst_amount: totalCgst,
      sgst_amount: totalSgst,
      igst_amount: totalIgst,
      total_gst: totalGst,
      total,
      status: 'Draft',
      notes: notes || null,
      terms: terms || null,
      line_items: processedLineItems,
      paid_amount: 0,
      pending_amount: total,
      created_by: user.id,
      updated_by: user.id,
    }])
    .select()
    .single();

  if (error) throw error;

  await writeFinancialAudit({
    firmId,
    user,
    action: 'Invoice Created',
    entityType: 'Invoice',
    entityId: data.id,
    details: `Invoice ${invoiceNumber} created for ${clientName}`,
    afterState: { total, status: 'Draft' },
  });

  await publishEnterpriseEvent({
    eventName: 'invoice_generated',
    firmId,
    sourceService: 'billing.invoiceCoreService.createInvoice',
    actor: { id: user.id, name: user.name, role: user.role },
    workflowType: 'invoices',
    workflowId: data.id,
    payload: {
      invoiceNumber,
      clientId,
      total,
      status: 'Draft',
    },
  });

  return data as Invoice;
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
