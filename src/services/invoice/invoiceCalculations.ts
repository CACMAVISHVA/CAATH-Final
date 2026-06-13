/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PlaceOfSupply, GSTTreatment } from './invoiceTypes';

export const GST_RATES = [0, 5, 12, 18, 28];

export const INVOICE_STATUS_COLORS: Record<string, string> = {
  'Draft': 'bg-slate-500/10 text-slate-400',
  'Generated': 'bg-blue-500/10 text-blue-400',
  'Sent': 'bg-purple-500/10 text-purple-400',
  'Viewed': 'bg-cyan-500/10 text-cyan-400',
  'Partially Paid': 'bg-amber-500/10 text-amber-400',
  'Paid': 'bg-emerald-500/10 text-emerald-400',
  'Overdue': 'bg-red-500/10 text-red-400',
  'Cancelled': 'bg-slate-700/10 text-slate-600',
};

export const calculateTax = (
  amount: number,
  gstRate: number,
  placeOfSupply: PlaceOfSupply,
  clientGstTreatment: GSTTreatment
): { cgst: number; sgst: number; igst: number } => {
  if (clientGstTreatment === 'RCM' || clientGstTreatment === 'Export' || clientGstTreatment === 'SEZ') {
    return { cgst: 0, sgst: 0, igst: 0 };
  }

  if (placeOfSupply === 'Within State') {
    const tax = (amount * gstRate) / 100;
    return { cgst: tax / 2, sgst: tax / 2, igst: 0 };
  }

  return { cgst: 0, sgst: 0, igst: (amount * gstRate) / 100 };
};

export const formatINR = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(amount);
};
