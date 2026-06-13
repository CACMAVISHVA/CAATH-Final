import { supabase } from '../../../lib/supabase';
import { AuthProfileDto, CreateProfileDto } from '../dto/authDtos';

type UserProfileRow = {
  id: string;
  auth_id: string;
  firm_id: string | null;
  name: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
};

const mapRow = (row: UserProfileRow): AuthProfileDto => ({
  id: row.id,
  authId: row.auth_id,
  firmId: row.firm_id ?? undefined,
  name: row.name,
  email: row.email,
  role: row.role as AuthProfileDto['role'],
  status: row.status,
  createdAt: row.created_at,
});

export const authProfileRepository = {
  async findByAuthId(authId: string): Promise<AuthProfileDto | null> {
    const { data, error } = await supabase
      .from('users')
      .select('id, auth_id, firm_id, name, email, role, status, created_at')
      .eq('auth_id', authId)
      .maybeSingle();
    if (error) throw error;
    return data ? mapRow(data as UserProfileRow) : null;
  },

  async createProfile(payload: CreateProfileDto): Promise<AuthProfileDto> {
    const { data, error } = await supabase
      .from('users')
      .insert([{ auth_id: payload.authId, email: payload.email, name: payload.name, role: payload.role, status: 'Active', firm_id: payload.firmId }])
      .select('id, auth_id, firm_id, name, email, role, status, created_at')
      .single();
    if (error) throw error;
    return mapRow(data as UserProfileRow);
  },
};
