import { supabase } from '../lib/supabase';
import { User } from '../types';

export type AccountingAddonWorkspace = {
  id: string;
  firm_id: string;
  client_id: string;
  status: 'Pending' | 'Active' | 'Suspended' | 'Declined';
  plan: 'Client Books' | 'Client Books Pro';
  monthly_price: number | null;
  requested_at: string;
  activated_at: string | null;
  client?: { name?: string; type?: string; pan?: string; gstin?: string | null } | null;
  firm?: { name?: string; firm_name?: string } | null;
};

export const listPlatformAccountingAddons = async () => {
  const { data, error } = await supabase.from('accounting_addon_workspaces')
    .select('id,firm_id,client_id,status,plan,monthly_price,requested_at,activated_at,client:clients(name,type,pan,gstin),firm:firms(name,firm_name)')
    .order('requested_at', { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as AccountingAddonWorkspace[];
};

export const reviewAccountingAddon = async (
  id: string,
  action: 'activate' | 'decline' | 'suspend',
  monthlyPrice: number | null,
  approverId: string,
) => {
  if (action === 'activate' && (!Number.isFinite(monthlyPrice) || Number(monthlyPrice) < 0)) throw new Error('Please enter a valid monthly add-on price.');
  const status = action === 'activate' ? 'Active' : action === 'decline' ? 'Declined' : 'Suspended';
  const { error } = await supabase.from('accounting_addon_workspaces').update({
    status,
    monthly_price: action === 'activate' ? monthlyPrice : null,
    approved_by: approverId,
    activated_at: action === 'activate' ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  }).eq('id', id);
  if (error) throw error;
};

export type AccountingClientOption = {
  id: string;
  name: string;
  type: string;
  pan: string;
  gstin: string | null;
};

export type AccountingFinancialYear = {
  id: string;
  firm_id: string;
  client_id: string;
  label: string;
  starts_on: string;
  ends_on: string;
  status: 'Open' | 'Closed';
  created_at: string;
};

export type AccountingBookSummary = {
  accounts: number;
  draftVouchers: number;
  postedVouchers: number;
};

export const listAccountingAddon = async (firmId: string) => {
  const [clientsResult, workspacesResult] = await Promise.all([
    supabase.from('clients').select('id,name,type,pan,gstin').eq('firm_id', firmId).order('name'),
    supabase.from('accounting_addon_workspaces')
      .select('id,firm_id,client_id,status,plan,monthly_price,requested_at,activated_at,client:clients(name,type,pan,gstin)')
      .eq('firm_id', firmId)
      .order('requested_at', { ascending: false }),
  ]);
  if (clientsResult.error) throw clientsResult.error;
  if (workspacesResult.error) throw workspacesResult.error;
  return {
    clients: (clientsResult.data || []) as AccountingClientOption[],
    workspaces: (workspacesResult.data || []) as unknown as AccountingAddonWorkspace[],
  };
};

export const requestAccountingAddon = async (
  clientId: string,
  plan: AccountingAddonWorkspace['plan'],
  user: User,
) => {
  if (!user.firmId) throw new Error('A firm workspace is required.');
  if (user.role !== 'SuperAdmin') throw new Error('Only the Super Admin can request a paid accounting add-on.');
  if (!clientId) throw new Error('Please choose a client.');
  const { error } = await supabase.from('accounting_addon_workspaces').insert({
    firm_id: user.firmId,
    client_id: clientId,
    plan,
    status: 'Pending',
    requested_by: user.id,
  });
  if (error?.code === '23505') throw new Error('This client already has an accounting add-on request or workspace.');
  if (error) throw error;
};

export const listAccountingFinancialYears = async (firmId: string) => {
  const { data, error } = await supabase
    .from('accounting_financial_years')
    .select('id,firm_id,client_id,label,starts_on,ends_on,status,created_at')
    .eq('firm_id', firmId)
    .order('starts_on', { ascending: false });
  if (error) throw error;
  return (data || []) as AccountingFinancialYear[];
};

export const initializeAccountingBooks = async (params: {
  clientId: string;
  label: string;
  startsOn: string;
  endsOn: string;
}) => {
  const { data, error } = await supabase.rpc('initialize_accounting_books', {
    p_client_id: params.clientId,
    p_label: params.label,
    p_starts_on: params.startsOn,
    p_ends_on: params.endsOn,
  });
  if (error) throw error;
  return data as string;
};

export const getAccountingBookSummary = async (financialYearId: string): Promise<AccountingBookSummary> => {
  const [accounts, drafts, posted] = await Promise.all([
    supabase.from('accounting_accounts').select('id', { count: 'exact', head: true }).eq('financial_year_id', financialYearId).eq('is_active', true),
    supabase.from('accounting_vouchers').select('id', { count: 'exact', head: true }).eq('financial_year_id', financialYearId).eq('status', 'Draft'),
    supabase.from('accounting_vouchers').select('id', { count: 'exact', head: true }).eq('financial_year_id', financialYearId).eq('status', 'Posted'),
  ]);
  const error = accounts.error || drafts.error || posted.error;
  if (error) throw error;
  return { accounts: accounts.count || 0, draftVouchers: drafts.count || 0, postedVouchers: posted.count || 0 };
};
