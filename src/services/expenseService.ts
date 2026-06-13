/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../lib/supabase';
import { User } from '../types';

export type ExpenseCategory =
  | 'Salaries'
  | 'Rent'
  | 'Software'
  | 'Subscriptions'
  | 'Travel'
  | 'Audit Expenses'
  | 'Office Operations'
  | 'Professional Fees'
  | 'Marketing'
  | 'Utilities'
  | 'Insurance'
  | 'Other';

export type ExpenseStatus = 'Pending' | 'Approved' | 'Rejected' | 'Paid';

export interface Expense {
  id: string;
  firm_id: string;
  category: ExpenseCategory;
  description: string;
  vendor: string;
  amount: number;
  gst_rate: number;
  gst_amount: number;
  total: number;
  expense_date: string;
  payment_date: string | null;
  payment_mode: 'Bank Transfer' | 'UPI' | 'Cheque' | 'Cash' | 'Card' | null;
  status: ExpenseStatus;
  approved_by: string | null;
  approved_at: string | null;
  receipt_document_id: string | null;
  notes: string | null;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
}

export interface ExpenseInput {
  firmId: string;
  category: ExpenseCategory;
  description: string;
  vendor: string;
  amount: number;
  gstRate: number;
  expenseDate: string;
  paymentMode?: 'Bank Transfer' | 'UPI' | 'Cheque' | 'Cash' | 'Card';
  receiptDocumentId?: string;
  notes?: string;
  user: User;
}

// Write audit for expenses
const writeExpenseAudit = async (params: {
  firmId: string;
  user: User;
  action: string;
  entityId: string;
  details: string;
}) => {
  await supabase.from('audit_logs').insert([{
    firm_id: params.firmId,
    user_id: params.user.id,
    user_name: params.user.name,
    user_role: params.user.role,
    action: params.action,
    entity_type: 'Expense',
    entity_id: params.entityId,
    details: params.details,
  }]);
};

export const createExpense = async (input: ExpenseInput): Promise<Expense> => {
  const { firmId, category, description, vendor, amount, gstRate, expenseDate, paymentMode, receiptDocumentId, notes, user } = input;

  const gstAmount = (amount * gstRate) / 100;
  const total = amount + gstAmount;

  const { data, error } = await supabase
    .from('expenses')
    .insert([{
      firm_id: firmId,
      category,
      description,
      vendor,
      amount,
      gst_rate: gstRate,
      gst_amount: gstAmount,
      total,
      expense_date: expenseDate,
      payment_mode: paymentMode || null,
      status: 'Pending',
      receipt_document_id: receiptDocumentId || null,
      notes: notes || null,
      created_by: user.id,
      updated_by: user.id,
    }])
    .select()
    .single();

  if (error) throw error;

  await writeExpenseAudit({
    firmId,
    user,
    action: 'Expense Created',
    entityId: data.id,
    details: `Expense "${description}" of ₹${total.toLocaleString()} created`,
  });

  return data as Expense;
};

export const getExpenses = async (firmId: string): Promise<Expense[]> => {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('firm_id', firmId)
    .order('expense_date', { ascending: false });

  if (error) throw error;
  return (data || []) as Expense[];
};

export const getExpense = async (expenseId: string): Promise<Expense | null> => {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('id', expenseId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data as Expense | null;
};

export const approveExpense = async (expenseId: string, user: User, firmId: string) => {
  const expense = await getExpense(expenseId);
  if (!expense) throw new Error('Expense not found');

  const { error } = await supabase
    .from('expenses')
    .update({
      status: 'Approved',
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', expenseId);

  if (error) throw error;

  await writeExpenseAudit({
    firmId,
    user,
    action: 'Expense Approved',
    entityId: expenseId,
    details: `Expense "${expense.description}" approved`,
  });
};

export const rejectExpense = async (expenseId: string, reason: string, user: User, firmId: string) => {
  const expense = await getExpense(expenseId);
  if (!expense) throw new Error('Expense not found');

  const { error } = await supabase
    .from('expenses')
    .update({
      status: 'Rejected',
      notes: reason,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', expenseId);

  if (error) throw error;

  await writeExpenseAudit({
    firmId,
    user,
    action: 'Expense Rejected',
    entityId: expenseId,
    details: `Expense "${expense.description}" rejected: ${reason}`,
  });
};

export const markExpensePaid = async (expenseId: string, paymentMode: Expense['payment_mode'], user: User, firmId: string) => {
  const expense = await getExpense(expenseId);
  if (!expense) throw new Error('Expense not found');

  const { error } = await supabase
    .from('expenses')
    .update({
      status: 'Paid',
      payment_date: new Date().toISOString(),
      payment_mode: paymentMode,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', expenseId);

  if (error) throw error;

  await writeExpenseAudit({
    firmId,
    user,
    action: 'Expense Marked Paid',
    entityId: expenseId,
    details: `Expense "${expense.description}" marked as paid via ${paymentMode}`,
  });
};

export const deleteExpense = async (expenseId: string, user: User, firmId: string) => {
  const expense = await getExpense(expenseId);
  if (!expense) throw new Error('Expense not found');

  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', expenseId);

  if (error) throw error;

  await writeExpenseAudit({
    firmId,
    user,
    action: 'Expense Deleted',
    entityId: expenseId,
    details: `Expense "${expense.description}" deleted`,
  });
};

// Get expense summary
export const getExpenseSummary = async (firmId: string) => {
  const expenses = await getExpenses(firmId);

  const summary = {
    totalPending: 0,
    totalApproved: 0,
    totalPaid: 0,
    totalExpenses: 0,
    byCategory: {} as Record<ExpenseCategory, number>,
    byStatus: {} as Record<ExpenseStatus, number>,
    monthlyData: [] as { month: string; amount: number }[],
  };

  expenses.forEach(exp => {
    summary.totalExpenses += exp.total;
    summary.byCategory[exp.category] = (summary.byCategory[exp.category] || 0) + exp.total;
    summary.byStatus[exp.status] = (summary.byStatus[exp.status] || 0) + exp.total;

    if (exp.status === 'Pending') summary.totalPending += exp.total;
    if (exp.status === 'Approved') summary.totalApproved += exp.total;
    if (exp.status === 'Paid') summary.totalPaid += exp.total;
  });

  // Monthly aggregation
  const monthlyMap: Record<string, number> = {};
  expenses.forEach(exp => {
    const month = new Date(exp.expense_date).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    monthlyMap[month] = (monthlyMap[month] || 0) + exp.total;
  });
  summary.monthlyData = Object.entries(monthlyMap).map(([month, amount]) => ({ month, amount }));

  return summary;
};

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Salaries',
  'Rent',
  'Software',
  'Subscriptions',
  'Travel',
  'Audit Expenses',
  'Office Operations',
  'Professional Fees',
  'Marketing',
  'Utilities',
  'Insurance',
  'Other',
];

export const EXPENSE_STATUS_COLORS: Record<ExpenseStatus, string> = {
  'Pending': 'bg-amber-500/10 text-amber-400',
  'Approved': 'bg-blue-500/10 text-blue-400',
  'Rejected': 'bg-red-500/10 text-red-400',
  'Paid': 'bg-emerald-500/10 text-emerald-400',
};