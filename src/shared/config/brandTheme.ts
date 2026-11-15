/**
 * Workspace branding tokens.
 *
 * A theme is seven organisation-chosen colours plus a light/dark mode. It is turned into
 * CSS custom properties on <html>; the Tailwind colour tokens (--color-gold, --color-matte-black…)
 * and src/brand-theme.css read those variables, so no component carries hardcoded brand colours.
 * A null theme means "CAATH default appearance" and removes every override.
 */

export type BrandMode = 'dark' | 'light';
export type BrandColorKey = 'primary' | 'secondary' | 'accent' | 'sidebar' | 'background' | 'button' | 'highlight';
export type BrandColors = Record<BrandColorKey, string>;

export interface BrandTheme {
  preset: string;
  mode: BrandMode;
  colors: BrandColors;
}

export const BRAND_COLOR_FIELDS: Array<{ key: BrandColorKey; label: string; hint: string }> = [
  { key: 'primary', label: 'Primary', hint: 'Brand colour for titles, icons and active items' },
  { key: 'accent', label: 'Accent', hint: 'Hover and emphasis tone' },
  { key: 'button', label: 'Button', hint: 'Main action buttons' },
  { key: 'highlight', label: 'Highlight', hint: 'Focus rings and selection' },
  { key: 'background', label: 'Background', hint: 'Page background' },
  { key: 'secondary', label: 'Secondary', hint: 'Cards, panels and headers' },
  { key: 'sidebar', label: 'Sidebar', hint: 'Navigation background' },
];

export interface BrandPreset {
  id: string;
  name: string;
  dark: BrandColors;
  light: BrandColors;
}

export const BRAND_PRESETS: BrandPreset[] = [
  {
    id: 'midnight-navy',
    name: 'Midnight Navy + Electric Blue',
    dark: { background: '#0B1220', secondary: '#121C30', sidebar: '#0E1729', primary: '#5B9BFF', accent: '#9CC2FF', button: '#2563EB', highlight: '#7FB0FF' },
    light: { background: '#F4F6FB', secondary: '#FFFFFF', sidebar: '#EAEEF7', primary: '#1D4ED8', accent: '#1E3A8A', button: '#2563EB', highlight: '#2563EB' },
  },
  {
    id: 'deep-emerald',
    name: 'Deep Emerald + White',
    dark: { background: '#071A14', secondary: '#0D271E', sidebar: '#092018', primary: '#F4FBF8', accent: '#A7F3D0', button: '#FFFFFF', highlight: '#6EE7B7' },
    light: { background: '#F3FAF7', secondary: '#FFFFFF', sidebar: '#E8F4EE', primary: '#047857', accent: '#065F46', button: '#047857', highlight: '#059669' },
  },
  {
    id: 'charcoal-violet',
    name: 'Charcoal + Violet',
    dark: { background: '#17181C', secondary: '#212329', sidebar: '#1B1C21', primary: '#A78BFA', accent: '#C4B5FD', button: '#7C3AED', highlight: '#A78BFA' },
    light: { background: '#F6F5FA', secondary: '#FFFFFF', sidebar: '#EEECF6', primary: '#6D28D9', accent: '#5B21B6', button: '#7C3AED', highlight: '#7C3AED' },
  },
  {
    id: 'deep-teal',
    name: 'Deep Teal + Cyan',
    dark: { background: '#06191D', secondary: '#0C272D', sidebar: '#082025', primary: '#22D3EE', accent: '#67E8F9', button: '#0891B2', highlight: '#22D3EE' },
    light: { background: '#F1F9FA', secondary: '#FFFFFF', sidebar: '#E6F3F5', primary: '#0E7490', accent: '#155E75', button: '#0E7490', highlight: '#0891B2' },
  },
];

export const presetTheme = (presetId: string, mode: BrandMode): BrandTheme | null => {
  const preset = BRAND_PRESETS.find((item) => item.id === presetId);
  return preset ? { preset: preset.id, mode, colors: { ...preset[mode] } } : null;
};

const HEX = /^#[0-9a-fA-F]{6}$/;
export const isHexColor = (value: unknown): value is string => typeof value === 'string' && HEX.test(value);

/** Accepts "#abc", "abc", "AABBCC" etc. and returns "#AABBCC", or null when it is not a colour. */
export const normaliseHex = (input: string): string | null => {
  const raw = input.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(raw)) return `#${raw.split('').map((c) => c + c).join('')}`.toUpperCase();
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw}`.toUpperCase();
  return null;
};

const channels = (hex: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];

export const mixHex = (a: string, b: string, amount: number): string => {
  const [x, y] = [channels(a), channels(b)];
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * amount).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
};

export const luminance = (hex: string): number => {
  const [r, g, b] = channels(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const contrastRatio = (a: string, b: string): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const INK = '#0B1020';
/** Whichever of dark ink / white reads best on the given fill. */
export const readableOn = (fill: string): string => (contrastRatio(fill, INK) >= contrastRatio(fill, '#FFFFFF') ? INK : '#FFFFFF');

/** Parses untrusted input (database row, localStorage) into a theme, or null. */
export const parseBrandTheme = (value: unknown): BrandTheme | null => {
  if (!value || typeof value !== 'object') return null;
  const raw = value as { preset?: unknown; mode?: unknown; colors?: Record<string, unknown> };
  const mode: BrandMode = raw.mode === 'light' ? 'light' : 'dark';
  const base = BRAND_PRESETS[0][mode];
  const colors = { ...base };
  let any = false;
  for (const { key } of BRAND_COLOR_FIELDS) {
    const candidate = raw.colors?.[key];
    if (isHexColor(candidate)) { colors[key] = candidate.toUpperCase(); any = true; }
  }
  if (!any) return null;
  return { preset: typeof raw.preset === 'string' && /^[a-z0-9-]{1,40}$/.test(raw.preset) ? raw.preset : 'custom', mode, colors };
};

export interface BrandThemeIssue { level: 'error' | 'warning'; message: string }

/** Accessibility and consistency checks run before a theme can be saved. */
export const validateBrandTheme = (theme: BrandTheme): BrandThemeIssue[] => {
  const issues: BrandThemeIssue[] = [];
  const { colors, mode } = theme;
  for (const { key, label } of BRAND_COLOR_FIELDS) {
    if (!isHexColor(colors[key])) issues.push({ level: 'error', message: `${label} must be a 6-digit HEX colour.` });
  }
  if (issues.length) return issues;
  const surfaces: Array<[BrandColorKey, string]> = [['background', 'Background'], ['secondary', 'Secondary'], ['sidebar', 'Sidebar']];
  for (const [key, label] of surfaces) {
    const lum = luminance(colors[key]);
    if (mode === 'dark' && lum > 0.2) issues.push({ level: 'error', message: `${label} is too light for Dark Mode. Choose a darker colour or switch to Light Mode.` });
    if (mode === 'light' && lum < 0.55) issues.push({ level: 'error', message: `${label} is too dark for Light Mode. Choose a lighter colour or switch to Dark Mode.` });
    if (contrastRatio(colors.primary, colors[key]) < 3) issues.push({ level: 'error', message: `Primary is hard to read on ${label} (contrast ${contrastRatio(colors.primary, colors[key]).toFixed(1)}:1, minimum 3:1).` });
    else if (contrastRatio(colors.primary, colors[key]) < 4.5) issues.push({ level: 'warning', message: `Primary on ${label} is below 4.5:1; small text may be hard to read.` });
  }
  if (contrastRatio(colors.highlight, colors.background) < 3) issues.push({ level: 'error', message: 'Highlight must stand out from Background (minimum 3:1) so keyboard focus stays visible.' });
  if (contrastRatio(colors.button, colors.secondary) < 1.6) issues.push({ level: 'warning', message: 'Button colour is very close to the Secondary surface; buttons may not stand out.' });
  return issues;
};

/** CSS custom properties for a theme. Keys here are the only variables the theme may set. */
export const buildThemeVariables = (theme: BrandTheme): Record<string, string> => {
  const { colors: c, mode } = theme;
  const shade = mode === 'dark' ? '#FFFFFF' : '#000000';
  return {
    '--color-matte-black': c.background,
    '--color-matte-black-light': c.secondary,
    '--color-gold': c.primary,
    '--color-gold-light': c.accent,
    '--color-gold-dark': mixHex(c.primary, '#000000', mode === 'dark' ? 0.35 : 0.2),
    '--caath-sidebar': c.sidebar,
    '--caath-button': c.button,
    '--caath-button-hover': mixHex(c.button, shade, 0.14),
    '--caath-button-text': readableOn(c.button),
    '--caath-highlight': c.highlight,
  };
};

const THEME_VARIABLES = Object.keys(buildThemeVariables({ preset: 'x', mode: 'dark', colors: BRAND_PRESETS[0].dark }));
const CACHE_KEY = 'caath_brand_theme';

/** Applies (or, with null, removes) a theme on the document. Never throws. */
export const applyBrandTheme = (theme: BrandTheme | null): void => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (!theme || validateBrandTheme(theme).some((issue) => issue.level === 'error')) {
    THEME_VARIABLES.forEach((name) => root.style.removeProperty(name));
    delete root.dataset.brandTheme;
    delete root.dataset.brandMode;
    return;
  }
  Object.entries(buildThemeVariables(theme)).forEach(([name, value]) => root.style.setProperty(name, value));
  root.dataset.brandTheme = theme.preset;
  root.dataset.brandMode = theme.mode;
  meta?.setAttribute('content', theme.colors.background);
};

/** Remembers the workspace theme on this device so the next load (and sign-in screen) paints correctly at once. */
export const cacheBrandTheme = (theme: BrandTheme | null): void => {
  try {
    if (theme) localStorage.setItem(CACHE_KEY, JSON.stringify(theme));
    else localStorage.removeItem(CACHE_KEY);
  } catch { /* storage is a convenience only */ }
};

export const readCachedBrandTheme = (): BrandTheme | null => {
  try { return parseBrandTheme(JSON.parse(localStorage.getItem(CACHE_KEY) || 'null')); } catch { return null; }
};
