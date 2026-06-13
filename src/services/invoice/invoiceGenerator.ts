/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { InvoiceInput, Invoice } from './invoiceTypes';
import { generateInvoiceNumber, writeFinancialAudit } from './invoiceQueries';
import { calculateTax } from './invoiceCalculations';
import { supabase } from '../../lib/supabase';

export const createInvoice = async (input: InvoiceInput): Promise<Invoice> => {
  const { firmId, clientId, clientName, placeOfSupply, gstTreatment, billingCategory, issueDate, dueDate, lineItems, notes, terms, user } = input;

  let subtotal = 0;
  let totalDiscount = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;

  const processedLineItems = lineItems.map(item => {
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

  return data as Invoice;
};
