import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Check, ImagePlus, Loader2, Moon, Palette, RotateCcw, Sun, Trash2 } from 'lucide-react';
import { User } from '../types';
import { cn } from '../lib/utils';
import { useBranding } from '../context/BrandingContext';
import { useToast } from './Toast';
import {
  BRAND_COLOR_FIELDS, BRAND_PRESETS, BrandColorKey, BrandMode, BrandTheme, buildThemeVariables, contrastRatio, normaliseHex,
  presetTheme, readableOn, validateBrandTheme,
} from '../shared/config/brandTheme';
import {
  LogoVariant, PreparedLogo, prepareLogo, removeWorkspaceLogo, saveWorkspaceTheme, uploadWorkspaceLogo,
} from '../services/firmBrandingService';

type PendingLogo = PreparedLogo | 'remove' | undefined;

/** The current CAATH look, shown as a swatch only; selecting it stores no theme. */
const CLASSIC_SWATCH = ['#15171C', '#1D2128', '#D4AF37'];
const sameTheme = (a: BrandTheme | null, b: BrandTheme | null) => JSON.stringify(a) === JSON.stringify(b);

const ColorField: React.FC<{ id: string; label: string; hint: string; value: string; disabled: boolean; onChange: (hex: string) => void }> = ({ id, label, hint, value, disabled, onChange }) => {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  const invalid = normaliseHex(text) === null;
  return (
    <div>
      <label htmlFor={`${id}-hex`} className="block text-xs font-semibold text-slate-300">{label}</label>
      <div className="mt-1.5 flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} colour picker`}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          className="h-10 w-12 shrink-0 cursor-pointer border border-slate-700 bg-transparent p-0.5 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <input
          id={`${id}-hex`}
          type="text"
          inputMode="text"
          spellCheck={false}
          maxLength={7}
          value={text}
          disabled={disabled}
          aria-invalid={invalid}
          aria-describedby={`${id}-hint`}
          onChange={(event) => {
            setText(event.target.value);
            const hex = normaliseHex(event.target.value);
            if (hex && event.target.value.replace('#', '').length === 6) onChange(hex);
          }}
          onBlur={() => { const hex = normaliseHex(text); if (hex) onChange(hex); setText(hex ?? value); }}
          className={cn(
            'h-10 w-full min-w-0 border bg-matte-black px-3 font-mono text-sm uppercase text-white outline-none focus:ring-1 focus:ring-gold disabled:opacity-50',
            invalid ? 'border-red-500/60' : 'border-slate-800',
          )}
        />
      </div>
      <p id={`${id}-hint`} className="mt-1 text-[11px] leading-4 text-slate-500">{invalid ? 'Enter a HEX code such as #2F6BFF.' : hint}</p>
    </div>
  );
};

/** Self-contained mock painted directly from the draft colours, so it is accurate before anything is applied. */
const ThemePreview: React.FC<{ theme: BrandTheme | null; logoUrl: string | null; firmName: string }> = ({ theme, logoUrl, firmName }) => {
  const c = theme?.colors ?? { background: '#15171C', secondary: '#1D2128', sidebar: '#1D2128', primary: '#D4AF37', accent: '#F7E7A9', button: '#D4AF37', highlight: '#FFF0A8' };
  const light = theme?.mode === 'light';
  const text = light ? '#0F172A' : '#FFFFFF';
  const muted = light ? '#5B6B82' : '#A5B2C5';
  const line = light ? 'rgba(15,23,42,0.12)' : 'rgba(148,163,184,0.18)';
  const buttonText = theme ? buildThemeVariables(theme)['--caath-button-text'] : '#15171C';
  return (
    <div aria-label="Theme preview" role="img" className="overflow-hidden border border-slate-800 text-left" style={{ background: c.background, color: text }}>
      <div className="flex min-h-[15rem]">
        <div className="w-[34%] shrink-0 p-3" style={{ background: c.sidebar, borderRight: `1px solid ${line}` }}>
          <div className="flex h-8 items-center gap-2">
            {logoUrl ? <img src={logoUrl} alt="" className="max-h-7 max-w-[70%] object-contain" /> : <span className="h-6 w-6" style={{ background: c.primary }} />}
            {!logoUrl && <span className="truncate text-xs font-semibold">{firmName}</span>}
          </div>
          {['Dashboard', 'Clients', 'GST', 'Notices'].map((item, index) => (
            <div key={item} className="mt-2 flex items-center gap-2 px-2 py-1.5 text-[11px]" style={index === 0 ? { background: light ? 'rgba(15,23,42,0.06)' : 'rgba(255,255,255,0.07)', boxShadow: `inset 2px 0 0 ${c.primary}` } : { color: muted }}>
              <span className="h-2 w-2 rounded-full" style={{ background: index === 0 ? c.primary : muted }} />{item}
            </div>
          ))}
        </div>
        <div className="min-w-0 flex-1 p-3">
          <p className="text-sm font-bold" style={{ color: c.primary }}>Compliance overview</p>
          <p className="text-[11px]" style={{ color: muted }}>How headings, cards and actions will look</p>
          <div className="mt-3 p-3" style={{ background: c.secondary, border: `1px solid ${line}` }}>
            <p className="text-[10px] uppercase tracking-wider" style={{ color: muted }}>Returns due</p>
            <p className="text-xl font-bold">24</p>
            <p className="text-[11px]" style={{ color: c.accent }}>View filing calendar</p>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-bold">
            <span className="px-3 py-1.5" style={{ background: c.button, color: buttonText }}>Primary action</span>
            <span className="px-3 py-1.5" style={{ border: `1px solid ${line}` }}>Secondary</span>
            <span className="px-3 py-1.5 opacity-50" style={{ background: c.button, color: buttonText }}>Disabled</span>
            <span className="px-3 py-1.5" style={{ border: `1px solid ${line}`, outline: `2px solid ${c.highlight}`, outlineOffset: 2 }}>Focused</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const BrandingSettings: React.FC<{ user: User }> = ({ user }) => {
  const branding = useBranding();
  const toast = useToast();
  const editable = branding.canEdit && branding.schemaReady;
  const [draft, setDraft] = useState<BrandTheme | null>(branding.theme);
  const [pending, setPending] = useState<Record<LogoVariant, PendingLogo>>({ light: undefined, dark: undefined });
  const [tryLive, setTryLive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<LogoVariant | null>(null);
  const fileInputs = { light: useRef<HTMLInputElement>(null), dark: useRef<HTMLInputElement>(null) };
  const { preview } = branding;

  useEffect(() => { setDraft(branding.theme); }, [branding.theme]);
  useEffect(() => { preview(tryLive ? draft : undefined); }, [draft, preview, tryLive]);
  useEffect(() => () => preview(undefined), [preview]);

  const discardPending = useCallback((items: Record<LogoVariant, PendingLogo>) => {
    Object.values(items).forEach((item) => { if (item && item !== 'remove') URL.revokeObjectURL(item.previewUrl); });
  }, []);
  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  useEffect(() => () => discardPending(pendingRef.current), [discardPending]);

  const issues = useMemo(() => (draft ? validateBrandTheme(draft) : []), [draft]);
  const blocked = issues.some((issue) => issue.level === 'error');
  const dirty = !sameTheme(draft, branding.theme) || Boolean(pending.light || pending.dark);

  const savedLogo = (variant: LogoVariant) => (variant === 'light' ? branding.logoLightUrl : branding.logoDarkUrl);
  const shownLogo = (variant: LogoVariant) => {
    const item = pending[variant];
    return item === 'remove' ? null : item ? item.previewUrl : savedLogo(variant);
  };
  const mode: BrandMode = draft?.mode ?? 'dark';
  const previewLogo = mode === 'dark' ? shownLogo('dark') ?? shownLogo('light') : shownLogo('light') ?? shownLogo('dark');

  const choosePreset = (presetId: string | null) => setDraft(presetId ? presetTheme(presetId, mode) : null);
  const chooseMode = (next: BrandMode) => setDraft((current) => {
    if (!current) return presetTheme(BRAND_PRESETS[0].id, next);
    return current.preset === 'custom' ? { ...current, mode: next, colors: { ...(presetTheme(BRAND_PRESETS[0].id, next) as BrandTheme).colors, primary: current.colors.primary, button: current.colors.button } } : presetTheme(current.preset, next);
  });
  const setColor = (key: BrandColorKey, hex: string) => setDraft((current) => {
    const base = current ?? (presetTheme(BRAND_PRESETS[0].id, 'dark') as BrandTheme);
    return base.colors[key] === hex ? base : { ...base, preset: 'custom', colors: { ...base.colors, [key]: hex } };
  });

  const onLogoChosen = async (variant: LogoVariant, file: File | undefined) => {
    if (!file) return;
    setLogoError(null);
    setProcessing(variant);
    try {
      const prepared = await prepareLogo(file);
      setPending((current) => {
        const previous = current[variant];
        if (previous && previous !== 'remove') URL.revokeObjectURL(previous.previewUrl);
        return { ...current, [variant]: prepared };
      });
    } catch (error) {
      setLogoError(error instanceof Error ? error.message : 'The logo could not be processed.');
    } finally {
      setProcessing(null);
      const input = fileInputs[variant].current;
      if (input) input.value = '';
    }
  };

  const cancel = () => {
    discardPending(pending);
    setPending({ light: undefined, dark: undefined });
    setDraft(branding.theme);
    setTryLive(false);
    setLogoError(null);
  };

  const save = async () => {
    if (!editable || blocked || saving) return;
    setSaving(true);
    try {
      for (const variant of ['light', 'dark'] as LogoVariant[]) {
        const item = pending[variant];
        if (item === 'remove') await removeWorkspaceLogo(variant, user);
        else if (item) await uploadWorkspaceLogo(item, variant, user);
      }
      if (!sameTheme(draft, branding.theme)) await saveWorkspaceTheme(draft, user);
      discardPending(pending);
      setPending({ light: undefined, dark: undefined });
      setTryLive(false);
      await branding.refresh();
      toast.success('Branding saved', 'Everyone in this workspace will see the new branding.');
    } catch (error) {
      toast.error('Branding was not saved', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section aria-labelledby="branding-heading" className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-gold/10"><Palette className="h-5 w-5 text-gold" /></div>
        <div>
          <h3 id="branding-heading" className="text-xl font-bold text-white">Appearance &amp; Branding</h3>
          <p className="text-sm text-slate-500">Colours and logos for {user.firm?.name || 'this workspace'}. Changes apply only to this organisation.</p>
        </div>
      </div>

      {!branding.schemaReady && (
        <p role="status" className="border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-200">
          Branding storage is not enabled on this database yet. It becomes available once the pending CAATH database update is applied.
        </p>
      )}
      {branding.schemaReady && !branding.canEdit && (
        <p role="status" className="border border-slate-800 bg-matte-black-light p-3 text-sm text-slate-400">Only the workspace Super Admin can change organisation branding.</p>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <div className="space-y-6">
          <fieldset disabled={!editable} className="space-y-3">
            <legend className="text-sm font-bold text-white">Theme</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {[{ id: null as string | null, name: 'CAATH Classic (default)', swatch: CLASSIC_SWATCH }, ...BRAND_PRESETS.map((preset) => ({ id: preset.id as string | null, name: preset.name, swatch: [preset[mode].background, preset[mode].secondary, preset[mode].button] }))].map((option) => {
                const selected = option.id === null ? draft === null : draft?.preset === option.id;
                return (
                  <button
                    key={option.id ?? 'classic'}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => choosePreset(option.id)}
                    className={cn('flex items-center gap-3 border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60', selected ? 'border-gold bg-gold/5' : 'border-slate-800 bg-matte-black-light hover:border-slate-700')}
                  >
                    <span className="flex shrink-0 overflow-hidden border border-slate-700">
                      {option.swatch.map((hex) => <span key={hex} className="h-8 w-4" style={{ background: hex }} />)}
                    </span>
                    <span className={cn('min-w-0 flex-1 text-sm font-semibold', selected ? 'text-gold' : 'text-white')}>{option.name}</span>
                    {selected && <Check className="h-4 w-4 shrink-0 text-gold" />}
                  </button>
                );
              })}
            </div>
            {draft?.preset === 'custom' && <p className="text-xs text-slate-500">Custom theme — based on your own colours.</p>}
          </fieldset>

          <fieldset disabled={!editable}>
            <legend className="text-sm font-bold text-white">Mode</legend>
            <div className="mt-2 inline-flex border border-slate-800" role="group">
              {([['dark', 'Dark', Moon], ['light', 'Light', Sun]] as const).map(([value, label, Icon]) => (
                <button key={value} type="button" aria-pressed={mode === value && draft !== null} onClick={() => chooseMode(value)}
                  className={cn('flex min-h-10 items-center gap-2 px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60', draft !== null && mode === value ? 'bg-gold/10 text-gold' : 'text-slate-400 hover:text-white')}>
                  <Icon className="h-4 w-4" />{label}
                </button>
              ))}
            </div>
            {draft === null && <p className="mt-2 text-xs text-slate-500">CAATH Classic is a dark theme. Choosing a mode starts from the first preset.</p>}
          </fieldset>

          <fieldset disabled={!editable || draft === null} className={cn(draft === null && 'opacity-60')}>
            <legend className="text-sm font-bold text-white">Colours</legend>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {BRAND_COLOR_FIELDS.map((field) => (
                <ColorField key={field.key} id={`brand-${field.key}`} label={field.label} hint={field.hint} disabled={!editable || draft === null}
                  value={(draft ?? (presetTheme(BRAND_PRESETS[0].id, 'dark') as BrandTheme)).colors[field.key]} onChange={(hex) => setColor(field.key, hex)} />
              ))}
            </div>
            {draft && <p className="mt-3 text-xs text-slate-500">Button text is set automatically to {readableOn(draft.colors.button) === '#FFFFFF' ? 'white' : 'dark'} for the best contrast ({contrastRatio(draft.colors.button, readableOn(draft.colors.button)).toFixed(1)}:1).</p>}
          </fieldset>

          <fieldset disabled={!editable} className="space-y-3">
            <legend className="text-sm font-bold text-white">Organisation logo</legend>
            <p className="text-xs leading-5 text-slate-500">PNG, JPG, WebP or SVG, up to 2 MB (SVG 512 KB), at least 32 px. Logos are resized to fit 640×240 without distortion; transparency is kept.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {([['dark', 'For Dark Mode', '#12151B'], ['light', 'For Light Mode', '#F8FAFC']] as const).map(([variant, label, backdrop]) => {
                const url = shownLogo(variant);
                const item = pending[variant];
                return (
                  <div key={variant} className="border border-slate-800 bg-matte-black-light p-3">
                    <p className="text-xs font-semibold text-slate-300">{label}</p>
                    <div className="mt-2 flex h-24 items-center justify-center border border-slate-800 p-3" style={{ background: backdrop }}>
                      {processing === variant ? <Loader2 className="h-5 w-5 animate-spin text-gold" />
                        : url ? <img src={url} alt={`${label} logo preview`} className="max-h-full max-w-full object-contain" />
                        : <span className="text-xs" style={{ color: variant === 'dark' ? '#A5B2C5' : '#5B6B82' }}>No logo — CAATH mark is used</span>}
                    </div>
                    {item && <p className="mt-2 text-[11px] text-amber-300">{item === 'remove' ? 'Will be removed when you save.' : `New logo (${item.width}×${item.height}) — not saved yet.`}</p>}
                    <div className="mt-2 flex flex-wrap gap-2">
                      <input ref={fileInputs[variant]} type="file" accept=".png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml" className="sr-only" aria-label={`Upload logo ${label.toLowerCase()}`}
                        onChange={(event) => void onLogoChosen(variant, event.target.files?.[0])} />
                      <button type="button" onClick={() => fileInputs[variant].current?.click()} className="flex min-h-9 items-center gap-2 border border-slate-700 px-3 text-xs font-bold text-slate-200 transition-colors hover:border-gold/50 disabled:cursor-not-allowed disabled:opacity-60">
                        <ImagePlus className="h-4 w-4" />{url ? 'Replace' : 'Upload'}
                      </button>
                      {url && (
                        <button type="button" onClick={() => setPending((current) => { const previous = current[variant]; if (previous && previous !== 'remove') URL.revokeObjectURL(previous.previewUrl); return { ...current, [variant]: savedLogo(variant) ? 'remove' : undefined }; })}
                          className="flex min-h-9 items-center gap-2 border border-slate-700 px-3 text-xs font-bold text-slate-300 transition-colors hover:border-red-500/50 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-60">
                          <Trash2 className="h-4 w-4" />Remove
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {logoError && <p role="alert" className="border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">{logoError}</p>}
          </fieldset>
        </div>

        <div className="space-y-3 xl:sticky xl:top-0 xl:self-start">
          <p className="text-sm font-bold text-white">Live preview</p>
          <ThemePreview theme={draft} logoUrl={previewLogo} firmName={user.firm?.name || 'Your firm'} />
          <label className="flex items-start gap-2 text-xs leading-5 text-slate-400">
            <input type="checkbox" checked={tryLive} disabled={!editable || blocked} onChange={(event) => setTryLive(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-gold" />
            <span>Try these colours on the whole workspace (only you see this until you save).</span>
          </label>
          {issues.length > 0 && (
            <ul className="space-y-2" aria-live="polite">
              {issues.map((issue) => (
                <li key={issue.message} className={cn('flex gap-2 border p-2.5 text-xs leading-5', issue.level === 'error' ? 'border-red-500/20 bg-red-500/10 text-red-300' : 'border-amber-500/20 bg-amber-500/10 text-amber-200')}>
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{issue.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-slate-800 pt-4">
        <button type="button" onClick={() => void save()} disabled={!editable || !dirty || blocked || saving}
          className="flex min-h-10 items-center gap-2 bg-gold px-5 text-sm font-bold text-matte-black transition-colors hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-50">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}{saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={cancel} disabled={!dirty || saving}
          className="min-h-10 border border-slate-700 px-5 text-sm font-bold text-slate-200 transition-colors hover:border-gold/50 disabled:cursor-not-allowed disabled:opacity-50">Cancel</button>
        <button type="button" onClick={() => setDraft(null)} disabled={!editable || draft === null || saving}
          className="flex min-h-10 items-center gap-2 px-3 text-sm font-semibold text-slate-400 transition-colors hover:text-gold disabled:cursor-not-allowed disabled:opacity-50">
          <RotateCcw className="h-4 w-4" />Reset to Default
        </button>
        {blocked && <span className="text-xs text-red-300">Fix the contrast issues above to save.</span>}
        {dirty && !blocked && <span className="text-xs text-slate-500">Unsaved changes</span>}
      </div>
    </section>
  );
};
