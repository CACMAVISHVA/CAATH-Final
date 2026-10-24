import { supabase } from '../lib/supabase';

export type RegulatoryArea = 'GST' | 'Direct Tax' | 'Company Law' | 'Financial Regulation' | 'Professional Practice';
export type RegulatoryStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type RegulatoryUpdateRecord = {
  id: string;
  firm_id: string;
  area: RegulatoryArea;
  authority: string;
  title: string;
  summary: string;
  source_url: string;
  source_label: string;
  published_on: string | null;
  effective_on: string | null;
  status: RegulatoryStatus;
  created_by: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
};

export type RegulatoryUpdateDraft = Pick<RegulatoryUpdateRecord, 'area' | 'authority' | 'title' | 'summary' | 'source_url' | 'source_label' | 'published_on' | 'effective_on'>;

const fail = (error: { message?: string } | null, fallback: string) => {
  if (error) throw new Error(error.message || fallback);
};

export const listRegulatoryUpdates = async (firmId: string) => {
  const { data, error } = await supabase.from('regulatory_updates').select('*').eq('firm_id', firmId).order('published_on', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false });
  fail(error, 'Unable to load regulatory updates.');
  return (data || []) as RegulatoryUpdateRecord[];
};

export const createRegulatoryUpdate = async (firmId: string, userId: string, draft: RegulatoryUpdateDraft) => {
  const { data, error } = await supabase.from('regulatory_updates').insert([{ ...draft, firm_id: firmId, created_by: userId, status: 'DRAFT' }]).select('*').single();
  fail(error, 'Unable to save regulatory update draft.');
  return data as RegulatoryUpdateRecord;
};

export const publishRegulatoryUpdate = async (id: string, userId: string) => {
  const { data, error } = await supabase.from('regulatory_updates').update({ status: 'PUBLISHED', reviewed_by: userId, reviewed_at: new Date().toISOString() }).eq('id', id).select('*').single();
  fail(error, 'Unable to publish regulatory update.');
  return data as RegulatoryUpdateRecord;
};

export const archiveRegulatoryUpdate = async (id: string) => {
  const { data, error } = await supabase.from('regulatory_updates').update({ status: 'ARCHIVED' }).eq('id', id).select('*').single();
  fail(error, 'Unable to archive regulatory update.');
  return data as RegulatoryUpdateRecord;
};
