import { supabase } from '../lib/supabase';
import { User } from '../types';

const BUCKET = 'firm-branding';
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

export const getFirmLogoUrl = async (firmId: string): Promise<string | null> => {
  const { data, error } = await supabase.from('firm_branding').select('logo_path').eq('firm_id', firmId).maybeSingle();
  if (error) throw error;
  if (!data?.logo_path) return null;
  const signed = await supabase.storage.from(BUCKET).createSignedUrl(data.logo_path, 3600);
  if (signed.error) throw signed.error;
  return signed.data.signedUrl;
};

export const uploadFirmLogo = async (file: File, user: User): Promise<string> => {
  if (!user.firmId) throw new Error('A firm workspace is required.');
  if (user.role !== 'SuperAdmin') throw new Error('Only the Super Admin can change the firm logo.');
  if (!ALLOWED_TYPES.has(file.type)) throw new Error('Please upload a PNG, JPG or WebP logo.');
  if (file.size <= 0 || file.size > 2 * 1024 * 1024) throw new Error('Logo must be smaller than 2 MB.');
  const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `${user.firmId}/invoice-logo.${extension}`;
  const upload = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true, contentType: file.type, cacheControl: '3600' });
  if (upload.error) throw upload.error;
  const { error } = await supabase.from('firm_branding').upsert({ firm_id: user.firmId, logo_path: path, updated_by: user.id, updated_at: new Date().toISOString() });
  if (error) throw error;
  const url = await getFirmLogoUrl(user.firmId);
  if (!url) throw new Error('Logo was uploaded but could not be previewed.');
  return url;
};
