import { supabase } from '../lib/supabase';
import { User } from '../types';
import { BrandTheme, parseBrandTheme, validateBrandTheme } from '../shared/config/brandTheme';

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

/* -------------------------------------------------------------------------
 * Workspace branding: colour theme + light/dark workspace logos.
 * Stored per firm in firm_branding / the private firm-branding bucket; RLS limits
 * writes to the firm's SuperAdmin and reads to members of the same firm.
 * ---------------------------------------------------------------------- */

export type LogoVariant = 'light' | 'dark';

export interface WorkspaceBranding {
  theme: BrandTheme | null;
  logoLightUrl: string | null;
  logoDarkUrl: string | null;
  /** False when the branding migration has not been applied to this database yet. */
  schemaReady: boolean;
}

export interface PreparedLogo {
  blob: Blob;
  extension: 'webp' | 'png';
  width: number;
  height: number;
  previewUrl: string;
}

export const LOGO_LIMITS = {
  maxFileBytes: 2 * 1024 * 1024,
  maxSvgBytes: 512 * 1024,
  minSide: 32,
  maxSide: 6000,
  maxAspectRatio: 8,
  outputWidth: 640,
  outputHeight: 240,
} as const;

const LOGO_INPUT_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']);
const LOGO_EXTENSION = /\.(png|jpe?g|webp|svg)$/i;
const SIGNED_URL_SECONDS = 6 * 60 * 60;
const SCHEMA_FLAG = 'caath_branding_schema_pending';
const isMissingSchema = (error: { code?: string } | null) => Boolean(error && ['42703', 'PGRST204', '42P01', 'PGRST205'].includes(error.code ?? ''));

export const canManageBranding = (user: User | null | undefined): boolean => Boolean(user?.firmId && user.role === 'SuperAdmin');

const signedLogoUrl = async (path: string | null | undefined): Promise<string | null> => {
  if (!path) return null;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_SECONDS);
  return error ? null : data.signedUrl;
};

export const getWorkspaceBranding = async (firmId: string): Promise<WorkspaceBranding> => {
  const empty: WorkspaceBranding = { theme: null, logoLightUrl: null, logoDarkUrl: null, schemaReady: true };
  try { if (sessionStorage.getItem(SCHEMA_FLAG)) return { ...empty, schemaReady: false }; } catch { /* ignore */ }
  const { data, error } = await supabase.from('firm_branding').select('theme, logo_light_path, logo_dark_path').eq('firm_id', firmId).maybeSingle();
  if (isMissingSchema(error)) {
    try { sessionStorage.setItem(SCHEMA_FLAG, '1'); } catch { /* ignore */ }
    return { ...empty, schemaReady: false };
  }
  if (error) throw error;
  if (!data) return empty;
  const [logoLightUrl, logoDarkUrl] = await Promise.all([signedLogoUrl(data.logo_light_path), signedLogoUrl(data.logo_dark_path)]);
  return { theme: parseBrandTheme(data.theme), logoLightUrl, logoDarkUrl, schemaReady: true };
};

const requireBrandingAdmin = (user: User): string => {
  if (!user.firmId) throw new Error('A firm workspace is required.');
  if (!canManageBranding(user)) throw new Error('Only the workspace Super Admin can change organisation branding.');
  return user.firmId;
};

/** Saves the organisation theme. Passing null restores the CAATH default appearance. */
export const saveWorkspaceTheme = async (theme: BrandTheme | null, user: User): Promise<void> => {
  const firmId = requireBrandingAdmin(user);
  if (theme) {
    const blocking = validateBrandTheme(theme).find((issue) => issue.level === 'error');
    if (blocking) throw new Error(blocking.message);
  }
  const { error } = await supabase.from('firm_branding').upsert({ firm_id: firmId, theme, updated_by: user.id, updated_at: new Date().toISOString() });
  if (error) throw error;
};

/** Removes scripts, event handlers and external references. The result is only ever rasterised. */
export const sanitiseSvg = (source: string): string => {
  const doc = new DOMParser().parseFromString(source, 'image/svg+xml');
  const root = doc.documentElement;
  if (doc.querySelector('parsererror') || root.nodeName.toLowerCase() !== 'svg') throw new Error('This SVG file could not be read.');
  doc.querySelectorAll('script, foreignObject, iframe, object, embed, link, meta, style, animate, set, animateTransform, animateMotion').forEach((node) => node.remove());
  doc.querySelectorAll('*').forEach((node) => {
    for (const attribute of Array.from(node.attributes)) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();
      const isLink = name === 'href' || name.endsWith(':href');
      if (name.startsWith('on') || (isLink && !value.startsWith('#')) || value.includes('javascript:') || /url\(\s*['"]?\s*(?!#)/.test(value)) node.removeAttribute(attribute.name);
    }
  });
  if (!root.getAttribute('width') || !root.getAttribute('height') || /%/.test(`${root.getAttribute('width')}${root.getAttribute('height')}`)) {
    const box = (root.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number);
    const [w, h] = box.length === 4 && box[2] > 0 && box[3] > 0 ? [box[2], box[3]] : [512, 512];
    const scale = Math.max(1, 512 / Math.max(w, h));
    root.setAttribute('width', String(Math.round(w * scale)));
    root.setAttribute('height', String(Math.round(h * scale)));
  }
  return new XMLSerializer().serializeToString(doc);
};

const loadImage = (url: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error('This image could not be read. Please choose a valid logo file.'));
  image.src = url;
});

/**
 * Validates a chosen logo and returns an optimised copy ready to upload: scaled to fit
 * 640×240 without changing its aspect ratio, transparency preserved, SVG rasterised.
 */
export const prepareLogo = async (file: File): Promise<PreparedLogo> => {
  const isSvg = file.type === 'image/svg+xml' || (!file.type && /\.svg$/i.test(file.name));
  if (!(LOGO_INPUT_TYPES.has(file.type) || isSvg) || !LOGO_EXTENSION.test(file.name)) throw new Error('Please upload a PNG, JPG, WebP or SVG logo.');
  if (file.size <= 0) throw new Error('This file is empty.');
  if (file.size > (isSvg ? LOGO_LIMITS.maxSvgBytes : LOGO_LIMITS.maxFileBytes)) throw new Error(isSvg ? 'SVG logos must be smaller than 512 KB.' : 'Logo must be smaller than 2 MB.');

  const source = isSvg ? new Blob([sanitiseSvg(await file.text())], { type: 'image/svg+xml' }) : file;
  const sourceUrl = URL.createObjectURL(source);
  try {
    const image = await loadImage(sourceUrl);
    const { naturalWidth: w, naturalHeight: h } = image;
    if (w < LOGO_LIMITS.minSide || h < LOGO_LIMITS.minSide) throw new Error(`Logo is too small. Use at least ${LOGO_LIMITS.minSide}×${LOGO_LIMITS.minSide} pixels.`);
    if (w > LOGO_LIMITS.maxSide || h > LOGO_LIMITS.maxSide) throw new Error(`Logo is too large. The maximum is ${LOGO_LIMITS.maxSide} pixels on either side.`);
    if (Math.max(w / h, h / w) > LOGO_LIMITS.maxAspectRatio) throw new Error('Logo is too narrow. Use an image no more than 8 times wider than it is tall.');
    // One uniform factor keeps the aspect ratio. Bitmaps are only ever scaled down; vectors may scale up to the output box.
    const fit = Math.min(LOGO_LIMITS.outputWidth / w, LOGO_LIMITS.outputHeight / h);
    const scale = isSvg ? fit : Math.min(1, fit);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('This browser cannot process images.');
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    let blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.92));
    if (!blob || blob.type !== 'image/webp') blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('The logo could not be processed. Please try a different file.');
    return { blob, extension: blob.type === 'image/webp' ? 'webp' : 'png', width: canvas.width, height: canvas.height, previewUrl: URL.createObjectURL(blob) };
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
};

const logoPath = (firmId: string, variant: LogoVariant, extension: string) => `${firmId}/workspace-logo-${variant}.${extension}`;
const logoColumn = (variant: LogoVariant) => (variant === 'light' ? 'logo_light_path' : 'logo_dark_path');

export const uploadWorkspaceLogo = async (logo: PreparedLogo, variant: LogoVariant, user: User): Promise<void> => {
  const firmId = requireBrandingAdmin(user);
  const path = logoPath(firmId, variant, logo.extension);
  const upload = await supabase.storage.from(BUCKET).upload(path, logo.blob, { upsert: true, contentType: logo.blob.type, cacheControl: '300' });
  if (upload.error) throw upload.error;
  const { error } = await supabase.from('firm_branding').upsert({ firm_id: firmId, [logoColumn(variant)]: path, updated_by: user.id, updated_at: new Date().toISOString() });
  if (error) throw error;
  // Best effort: drop the copy saved under the other file extension, if any.
  await supabase.storage.from(BUCKET).remove([logoPath(firmId, variant, logo.extension === 'webp' ? 'png' : 'webp')]).catch(() => undefined);
};

export const removeWorkspaceLogo = async (variant: LogoVariant, user: User): Promise<void> => {
  const firmId = requireBrandingAdmin(user);
  const { error } = await supabase.from('firm_branding').upsert({ firm_id: firmId, [logoColumn(variant)]: null, updated_by: user.id, updated_at: new Date().toISOString() });
  if (error) throw error;
  await supabase.storage.from(BUCKET).remove([logoPath(firmId, variant, 'webp'), logoPath(firmId, variant, 'png')]).catch(() => undefined);
};
