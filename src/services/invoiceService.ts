/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Main export file for Invoice/Billing domain.
 * This file re-exports from domain-specific services for backward compatibility.
 */

// Types
export type {
  InvoiceStatus,
  InvoiceCategory,
  GSTTreatment,
  PlaceOfSupply,
  InvoiceLineItem,
  Invoice,
  InvoiceInput,
  PaymentEntry,
} from './billing/invoiceTypes';

// Generation Service
export {
  generateInvoiceNumber,
  calculateTax,
} from './billing/invoiceGenerationService';

// Core Service
export {
  createInvoice,
  getInvoices,
  getClientInvoices,
  getInvoice,
  updateInvoice,
  cancelInvoice,
} from './billing/invoiceCoreService';

// Payment Service
export {
  addPayment,
  getInvoicePayments,
} from './billing/invoicePaymentService';

// Audit Service
export {
  writeFinancialAudit,
} from './billing/invoiceAuditService';

// Analytics Service
export {
  getReceivablesSummary,
} from './billing/invoiceAnalyticsService';
