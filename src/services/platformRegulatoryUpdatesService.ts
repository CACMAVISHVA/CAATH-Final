import { supabase } from '../lib/supabase';
import { User } from '../types';
import { RegulatoryArea, RegulatoryStatus } from './regulatoryUpdatesService';

export type PlatformRegulatoryUpdate = {
  id: string; area: RegulatoryArea; authority: string; title: string; summary: string; source_url: string; source_label: string;
  published_on: string | null; effective_on: string | null; status: RegulatoryStatus; created_by: string; verified_by: string | null;
  verified_at: string | null; published_at: string | null; created_at: string;
};
export type PlatformRegulatoryDraft = Pick<PlatformRegulatoryUpdate, 'area' | 'authority' | 'title' | 'summary' | 'source_url' | 'source_label' | 'published_on' | 'effective_on'>;
const ensure = (error: { message?: string } | null, fallback: string) => { if (error) throw new Error(error.message || fallback); };

export const listPlatformRegulatoryUpdates = async (publishedOnly = false) => {
  let query = supabase.from('platform_regulatory_updates').select('*').order('published_at', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false });
  if (publishedOnly) query = query.eq('status', 'PUBLISHED');
  const { data, error } = await query;
  ensure(error, 'Unable to load platform regulatory updates.');
  return (data || []) as PlatformRegulatoryUpdate[];
};
export const createPlatformRegulatoryUpdate = async (userId: string, draft: PlatformRegulatoryDraft) => {
  const { data, error } = await supabase.from('platform_regulatory_updates').insert([{ ...draft, created_by: userId, status: 'DRAFT' }]).select('*').single();
  ensure(error, 'Unable to save the platform review draft.'); return data as PlatformRegulatoryUpdate;
};
export const publishPlatformRegulatoryUpdate = async (id: string, user: User) => {
  if (user.role !== 'GodAdmin') throw new Error('Only God Admin can publish platform updates.');
  const { data, error } = await supabase.rpc('publish_platform_regulatory_update', { p_id: id });
  ensure(error, 'Unable to publish the platform update.');
  return data as PlatformRegulatoryUpdate;
};
export const archivePlatformRegulatoryUpdate = async (id: string) => {
  const { data, error } = await supabase.from('platform_regulatory_updates').update({ status: 'ARCHIVED' }).eq('id', id).select('*').single();
  ensure(error, 'Unable to archive the platform update.'); return data as PlatformRegulatoryUpdate;
};
