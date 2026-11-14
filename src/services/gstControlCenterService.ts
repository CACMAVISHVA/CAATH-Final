import { supabase } from '../lib/supabase';
import { User } from '../types';
import { scheduleFollowup } from './clientInteractionService';
import type { GSTControlRow } from './gstControlCenterPolicy';

export { buildGSTControlRows } from './gstControlCenterPolicy';

const followupSubject = (financialYear: string, taxPeriod: string) => `GST data follow-up · ${financialYear} · ${taxPeriod}`;

export const prepareGSTDataFollowups = async (user: User, rows: GSTControlRow[], financialYear: string, taxPeriod: string, followupDate: string) => {
  if (!user.firmId) throw new Error('A firm workspace is required.');
  const candidates = rows.filter((row) => row.action === 'Request data');
  if (!candidates.length) return { created: 0, skipped: 0 };

  const subject = followupSubject(financialYear, taxPeriod);
  const { data, error } = await supabase
    .from('client_interactions')
    .select('client_id,subject')
    .in('client_id', candidates.map((row) => row.client.id))
    .eq('subject', subject);
  if (error) throw error;

  const alreadyQueued = new Set((data || []).map((item) => item.client_id));
  const pending = candidates.filter((row) => !alreadyQueued.has(row.client.id));
  await Promise.all(pending.map((row) => scheduleFollowup(
    row.client.id,
    user,
    subject,
    `Request the documents and sales data needed to prepare ${row.outstandingReturns.join(' and ')} for ${taxPeriod}. CAATH created this follow-up from the GST Control Centre.`,
    followupDate,
  )));
  return { created: pending.length, skipped: candidates.length - pending.length };
};
