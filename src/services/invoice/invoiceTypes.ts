/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User } from '../../types';

export type InvoiceStatus =
  | 'Draft'
  | 'Generated'
  | 'Sent'
  | 'Viewed'
  | 'Partially Paid'
  | 'Paid'
  | 'Overdue'
  | 'Cancelled';

export type InvoiceCategory =
  | 'Professional Services'
  | 'Audit Services'
  | 'Tax Services'
  | 'ROC Services'
  | 'Payroll Services'
  | 'Consulting'
  | 'Other';

export type GSTTreatment =
  | 'Registered'
  | 'Unregistered'
  | 'Composition'
  | 'Export'
  | 'SEZ'
  | 'RCM';

export type PlaceOfSupply = 'Within State' | 'Inter State' | 'Export';

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  rate: number;
  discount: number;
  gstRate: number;
  amount: number;
  cgst: number;
  sgst: number;
  igst: number;
}

export interface Invoice {
  id: string;
  firm_id: string;
  client_id: string;
  invoice_number: string;
  financial_year: string;
  issue_date: string;
  due_date: string;
  place_of_supply: PlaceOfSupply;
  gst_treatment: GSTTreatment;
  billing_category: InvoiceCategory;
  subtotal: number;
  discount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total_gst: number;
  total: number;
  status: InvoiceStatus;
  notes: string;
  terms: string;
  line_items: InvoiceLineItem[];
  paid_amount: number;
  pending_amount: number;
  paid_date: string | null;
  sent_date: string | null;
  viewed_date: string | null;
  cancelled_date: string | null;
  cancelled_reason: string | null;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
}

export interface InvoiceInput {
  firmId: string;
  clientId: string;
  clientName: string;
  placeOfSupply: PlaceOfSupply;
  gstTreatment: GSTTreatment;
  billingCategory: InvoiceCategory;
  issueDate: string;
  dueDate: string;
  lineItems: Omit<InvoiceLineItem, 'amount' | 'cgst' | 'sgst' | 'igst'>[];
  notes?: string;
  terms?: string;
  user: User;
}

export interface PaymentEntry {
  id: string;
  invoice_id: string;
  amount: number;
  payment_date: string;
  payment_mode: 'Bank Transfer' | 'UPI' | 'Cheque' | 'Cash' | 'Card' | 'Other';
  reference?: string;
  received_by: string;
  remarks?: string;
  created_at: string;
}
