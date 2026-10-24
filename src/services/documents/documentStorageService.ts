import { supabase } from '../../lib/supabase';

export const documentObjectPath = (storedPath: string): string => {
  const prefix = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/documents/`;
  if (storedPath.startsWith(prefix)) return decodeURIComponent(storedPath.slice(prefix.length));
  if (storedPath.includes('://') || storedPath.startsWith('/') || storedPath.split('/').includes('..')) {
    throw new Error('Unrecognized document location.');
  }
  return storedPath;
};

export const previewDocumentUrl = async (storedPath: string) => {
  const { data, error } = await supabase.storage.from('documents').createSignedUrl(documentObjectPath(storedPath), 300);
  if (error) throw new Error(`Unable to open document: ${error.message}`);
  return data.signedUrl;
};

export const downloadVaultDocument = async (storedPath: string, name: string) => {
  const { data, error } = await supabase.storage.from('documents').download(documentObjectPath(storedPath));
  if (error) throw new Error(`Unable to download document: ${error.message}`);
  const url = URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = url; link.download = name; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};
