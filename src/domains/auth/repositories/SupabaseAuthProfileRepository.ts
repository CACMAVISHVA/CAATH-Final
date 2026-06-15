import { supabase } from '../../../lib/supabase';
import { AuthProfileDto, CreateProfileDto } from '../dto/authDtos';
import { WorkspaceFirm, WorkspaceSubscriptionPlan, SubscriptionStatus } from '../../../types';

type UserProfileRow = {
  id: string;
  auth_id: string;
  firm_id: string | null;
  name: string;
  email: string;
  role: string;
  status: string;
  is_workspace_owner?: boolean | null;
  created_at: string;
  firms?: FirmRow | FirmRow[] | null;
};

type FirmRow = {
  id: string;
  name?: string | null;
  firm_name?: string | null;
  workspace_code?: string | null;
  subscription_plan?: string | null;
  subscription_status?: string | null;
  subscription_start_date?: string | null;
  subscription_expiry_date?: string | null;
  max_admins?: number | null;
  max_staff?: number | null;
  max_clients?: number | null;
  created_by_auth_id?: string | null;
  created_at?: string | null;
};

const mapFirm = (value: FirmRow | FirmRow[] | null | undefined): WorkspaceFirm | undefined => {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row) return undefined;
  return {
    id: row.id,
    name: row.firm_name || row.name || 'Workspace',
    workspaceCode: row.workspace_code || undefined,
    subscriptionPlan: (row.subscription_plan || 'Starter') as WorkspaceSubscriptionPlan,
    subscriptionStatus: (row.subscription_status || 'Pending Payment') as SubscriptionStatus,
    subscriptionStartDate: row.subscription_start_date || undefined,
    subscriptionExpiryDate: row.subscription_expiry_date || undefined,
    maxAdmins: row.max_admins ?? 1,
    maxStaff: row.max_staff ?? 3,
    maxClients: row.max_clients ?? 25,
    createdByAuthId: row.created_by_auth_id || undefined,
    createdAt: row.created_at || undefined,
  };
};

const mapRow = (row: UserProfileRow): AuthProfileDto => ({
  id: row.id,
  authId: row.auth_id,
  firmId: row.firm_id ?? undefined,
  name: row.name,
  email: row.email,
  role: row.role as AuthProfileDto['role'],
  status: row.status,
  isWorkspaceOwner: Boolean(row.is_workspace_owner),
  firm: mapFirm(row.firms),
  createdAt: row.created_at,
});

export const authProfileRepository = {
  async findByAuthId(authId: string): Promise<AuthProfileDto | null> {
    const { data, error } = await supabase
      .from('users')
      .select('id, auth_id, firm_id, name, email, role, status, is_workspace_owner, created_at, firms(id, name, firm_name, workspace_code, subscription_plan, subscription_status, subscription_start_date, subscription_expiry_date, max_admins, max_staff, max_clients, created_by_auth_id, created_at)')
      .eq('auth_id', authId)
      .maybeSingle();
    if (error) throw error;
    return data ? mapRow(data as unknown as UserProfileRow) : null;
  },

  async createProfile(payload: CreateProfileDto): Promise<AuthProfileDto> {
    const { data, error } = await supabase
      .from('users')
      .insert([{
        auth_id: payload.authId,
        email: payload.email,
        name: payload.name,
        role: payload.role,
        status: 'Active',
        firm_id: payload.firmId,
        is_workspace_owner: Boolean(payload.isWorkspaceOwner),
      }])
      .select('id, auth_id, firm_id, name, email, role, status, is_workspace_owner, created_at, firms(id, name, firm_name, workspace_code, subscription_plan, subscription_status, subscription_start_date, subscription_expiry_date, max_admins, max_staff, max_clients, created_by_auth_id, created_at)')
      .single();
    if (error) throw error;
    return mapRow(data as unknown as UserProfileRow);
  },
};
