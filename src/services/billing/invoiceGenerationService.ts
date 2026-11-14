/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../../lib/supabase';
import { GSTTreatment, PlaceOfSupply } from './invoiceTypes';
import { calculateInvoiceTax } from './taxCalculation';

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

export const calculateTax = (
  amount: number,
  gstRate: number,
  placeOfSupply: PlaceOfSupply,
  clientGstTreatment: GSTTreatment
): { cgst: number; sgst: number; igst: number } => {
  return calculateInvoiceTax(amount, gstRate, placeOfSupply, clientGstTreatment);
};
