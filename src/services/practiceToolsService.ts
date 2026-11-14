import { supabase } from '../lib/supabase';
import { firstValidationError, validatePAN, validateRequiredName } from '../lib/fieldValidation';
import { User } from '../types';

export type TimeEntry = {
  id: string; work_date: string; minutes: number; description: string; billable: boolean;
  status: 'Draft' | 'Submitted' | 'Approved'; user?: { name?: string } | null; client?: { name?: string } | null;
};

export type DigitalSignatureCertificate = {
  id: string; holder_name: string; holder_pan: string | null; certificate_provider: string;
  certificate_serial: string; valid_from: string; valid_until: string; alert_days: number;
  client?: { name?: string } | null;
};

export const listPracticeTools = async (firmId: string) => {
  const [timeResult, certificateResult, clientResult] = await Promise.all([
    supabase.from('time_entries').select('id,work_date,minutes,description,billable,status,user:users(name),client:clients(name)').eq('firm_id', firmId).order('work_date', { ascending: false }).limit(100),
    supabase.from('digital_signature_certificates').select('id,holder_name,holder_pan,certificate_provider,certificate_serial,valid_from,valid_until,alert_days,client:clients(name)').eq('firm_id', firmId).order('valid_until', { ascending: true }),
    supabase.from('clients').select('id,name').eq('firm_id', firmId).order('name'),
  ]);
  if (timeResult.error) throw timeResult.error;
  if (certificateResult.error) throw certificateResult.error;
  if (clientResult.error) throw clientResult.error;
  return { timeEntries: timeResult.data as unknown as TimeEntry[], certificates: certificateResult.data as unknown as DigitalSignatureCertificate[], clients: clientResult.data || [] };
};

export const addTimeEntry = async (input: { date: string; hours: number; description: string; clientId?: string; billable: boolean }, user: User) => {
  if (!user.firmId) throw new Error('A firm workspace is required.');
  if (!input.date || Number.isNaN(Date.parse(input.date))) throw new Error('Please enter a valid work date.');
  if (!Number.isFinite(input.hours) || input.hours <= 0 || input.hours > 24) throw new Error('Please enter time between 0.1 and 24 hours.');
  const descriptionError = validateRequiredName(input.description, 'Work description');
  if (!descriptionError.valid) throw new Error(descriptionError.error);
  const { error } = await supabase.from('time_entries').insert({
    firm_id: user.firmId, user_id: user.id, client_id: input.clientId || null, work_date: input.date,
    minutes: Math.round(input.hours * 60), description: input.description.trim(), billable: input.billable, created_by: user.id,
  });
  if (error) throw error;
};

export const addDigitalSignatureCertificate = async (input: { holderName: string; pan?: string; provider: string; serial: string; validFrom: string; validUntil: string; alertDays: number; clientId?: string }, user: User) => {
  if (!user.firmId) throw new Error('A firm workspace is required.');
  if (!['SuperAdmin', 'Admin'].includes(user.role)) throw new Error('Only Super Admin or Admin can manage digital signatures.');
  const validationError = firstValidationError(
    validateRequiredName(input.holderName, 'Certificate holder name'),
    validatePAN(input.pan || '', false),
    validateRequiredName(input.provider, 'Certificate provider'),
  );
  if (validationError) throw new Error(validationError);
  if (!input.serial.trim() || input.serial.trim().length < 3) throw new Error('Please enter a valid certificate serial number.');
  if (!input.validFrom || !input.validUntil || input.validUntil < input.validFrom) throw new Error('Please enter a valid certificate validity period.');
  if (!Number.isInteger(input.alertDays) || input.alertDays < 1 || input.alertDays > 365) throw new Error('Alert period must be between 1 and 365 days.');
  const { error } = await supabase.from('digital_signature_certificates').insert({
    firm_id: user.firmId, client_id: input.clientId || null, holder_name: input.holderName.trim(),
    holder_pan: input.pan?.trim().toUpperCase() || null, certificate_provider: input.provider.trim(),
    certificate_serial: input.serial.trim(), valid_from: input.validFrom, valid_until: input.validUntil,
    alert_days: input.alertDays, created_by: user.id,
  });
  if (error) throw error;
};
