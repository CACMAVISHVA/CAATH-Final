/**
 * Centralised error reporting.
 *
 * Every capture path (React error boundaries, window error / unhandledrejection handlers,
 * the Supabase fetch wrapper, the API request client, explicit reportError calls) ends here.
 * Events are classified, redacted, de-duplicated and sent in small batches to the
 * report_errors RPC, which re-validates everything and derives the user and organisation
 * from the session. The reporter must never throw, block the UI, or report its own failures.
 */

export type ErrorType = 'frontend' | 'react' | 'api' | 'database' | 'auth' | 'storage' | 'network' | 'performance' | 'job' | 'integration' | 'validation' | 'unknown';
export type ErrorSeverity = 'Critical' | 'High' | 'Medium' | 'Low';

export interface ErrorContext {
  type?: ErrorType;
  severity?: ErrorSeverity;
  module?: string;
  code?: string;
  requestId?: string;
  /** Extra stack-like detail, e.g. a React component stack. */
  detail?: string;
}

export interface ErrorEvent {
  type: ErrorType;
  severity: ErrorSeverity;
  module: string;
  message: string;
  code?: string;
  stack?: string;
  frame?: string;
  route?: string;
  browser?: string;
  request_id?: string;
  environment: 'production' | 'staging' | 'development';
  count: number;
}

export type ErrorTransport = (events: ErrorEvent[]) => Promise<'ok' | 'retry-later' | 'unavailable' | 'no-session'>;

// ---------------------------------------------------------------------------
// Redaction
// ---------------------------------------------------------------------------
const REDACTIONS: Array<[RegExp, string]> = [
  [/eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{4,}/g, '[redacted-token]'],
  [/(sb_secret|sb_publishable|sk_live|sk_test|rzp_live|rzp_test)_[A-Za-z0-9_-]{6,}/g, '[redacted-key]'],
  [/\b(bearer|basic)\s+[A-Za-z0-9._~+/=-]{8,}/gi, '$1 [redacted]'],
  [/\b(password|passwd|pwd|secret|token|api[_-]?key|apikey|authorization|otp|pin|cvv)("?\s*[=:]\s*"?)[^\s"&,;}]+/gi, '$1$2[redacted]'],
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[redacted-email]'],
  [/\b[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]\b|\b[A-Z]{5}[0-9]{4}[A-Z]\b/g, '[redacted-tax-id]'],
  [/\b[0-9]{9,}\b/g, '[redacted-number]'],
];

/** Removes credentials, tokens, emails, PAN/GSTIN and long numbers (phones, accounts, Aadhaar) from free text. */
export const redact = (text: string): string => REDACTIONS.reduce((value, [pattern, replacement]) => value.replace(pattern, replacement), text);

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------
export interface HttpFailure {
  url: string;
  method: string;
  status: number; // 0 = the request never completed
  code?: string;
  message?: string;
  durationMs: number;
  offline?: boolean;
  aborted?: boolean;
}

/** Path only, never query strings or object keys (they can carry client identifiers). */
export const describeResource = (url: string): { area: 'rest' | 'auth' | 'storage' | 'functions' | 'api' | 'other'; name: string } => {
  let path = url;
  try { path = new URL(url, 'http://local').pathname; } catch { /* keep as is */ }
  const segments = path.split('/').filter(Boolean);
  const at = (prefix: string) => segments.indexOf(prefix);
  if (at('rest') >= 0) { const rest = segments.slice(at('rest') + 2); return { area: 'rest', name: rest[0] === 'rpc' ? `rpc/${rest[1] ?? ''}` : rest[0] ?? 'rest' }; }
  if (at('auth') >= 0) return { area: 'auth', name: `auth/${segments[at('auth') + 2] ?? ''}` };
  if (at('storage') >= 0) { const s = segments.slice(at('storage') + 2); return { area: 'storage', name: `storage/${s[0] === 'object' ? (['sign', 'public', 'authenticated', 'list', 'move', 'copy', 'upload'].includes(s[1]) ? s[2] : s[1]) ?? '' : s[0] ?? ''}` }; }
  if (at('functions') >= 0) return { area: 'functions', name: `functions/${segments[at('functions') + 2] ?? ''}` };
  if (segments[0] === 'api') return { area: 'api', name: `api/${segments[1] ?? ''}` };
  return { area: 'other', name: segments.slice(0, 2).join('/') || 'request' };
};

const SLOW_REQUEST_MS = 12_000;
// Schema drift and server faults: always genuine defects.
const DATABASE_DEFECT_CODES = new Set(['42703', '42P01', '42883', '42804', 'PGRST200', 'PGRST202', 'PGRST203', 'PGRST204', 'PGRST205', '57014', '53300', '40P01', 'XX000']);
// Expected outcomes of normal use: uniqueness, foreign keys, business-rule triggers, "no row", permission.
const EXPECTED_CODES = new Set(['23505', '23503', 'P0001', 'P0002', 'PGRST116', '42501', 'PGRST301', 'PGRST302', '22001', '22023']);

/**
 * Decides whether a failed HTTP call is a genuine technical fault. Returns null for expected
 * outcomes: sign-in mistakes, permission denials, business-rule rejections, user cancellation, being offline.
 */
export const classifyHttpFailure = (failure: HttpFailure): Pick<ErrorEvent, 'type' | 'severity' | 'message' | 'code'> | null => {
  const { area, name } = describeResource(failure.url);
  if (name === 'rpc/report_errors') return null;
  if (failure.aborted) return null;
  const { status, code } = failure;
  const label = `${failure.method.toUpperCase()} ${name}`;
  const detail = failure.message ? `: ${redact(failure.message).slice(0, 240)}` : '';
  const typeFor: Record<string, ErrorType> = { rest: 'database', auth: 'auth', storage: 'storage', functions: 'api', api: 'api', other: 'api' };
  const type = typeFor[area];

  if (status === 0) {
    if (failure.offline) return null;
    return { type: 'network', severity: 'Medium', message: `${label} could not reach the server`, code: 'NETWORK' };
  }
  if (status >= 500) return { type, severity: 'High', message: `${label} failed with server error ${status}${detail}`, code: code || String(status) };
  if (code && DATABASE_DEFECT_CODES.has(code)) return { type: 'database', severity: 'High', message: `${label} failed (${code})${detail}`, code };
  if (status < 400) {
    return failure.durationMs >= SLOW_REQUEST_MS ? { type: 'performance', severity: 'Medium', message: `${label} responded slowly (over ${Math.round(SLOW_REQUEST_MS / 1000)} seconds)`, code: 'SLOW' } : null;
  }
  if (status === 401 || status === 403 || status === 429 || (code && EXPECTED_CODES.has(code))) return null;
  if (area === 'auth') return null; // wrong password, expired OTP, unconfirmed email…
  if (status === 408 || status === 504) return { type: 'performance', severity: 'Medium', message: `${label} timed out`, code: String(status) };
  if (area === 'rest') {
    if (code === '23502' || code === '23514' || code === '22P02') return { type: 'validation', severity: 'Low', message: `${label} rejected invalid data (${code})${detail}`, code };
    if (status === 404 || status === 400) return { type: 'database', severity: 'Medium', message: `${label} failed with ${status}${code ? ` (${code})` : ''}${detail}`, code: code || String(status) };
    return null; // 406 / 409 / 416: no row, conflict, range — normal flow
  }
  if (area === 'storage') {
    if (status === 413 || status === 415 || status === 409) return null; // too large / wrong type / already exists: user-correctable
    return { type: 'storage', severity: status === 404 ? 'Low' : 'Medium', message: `${label} failed with ${status}${detail}`, code: String(status) };
  }
  if (status === 404) return { type, severity: 'Medium', message: `${label} was not found (404)`, code: '404' };
  if (status === 400 || status === 409 || status === 422) return null; // request validation
  return { type, severity: 'Medium', message: `${label} failed with ${status}${detail}`, code: String(status) };
};

const IGNORED_MESSAGES = [/ResizeObserver loop/i, /^Script error\.?$/i, /The user aborted a request/i, /AbortError/i, /Load failed$/i, /NetworkError when attempting to fetch/i, /Failed to fetch$/i];
const EXPECTED_ERROR_NAMES = new Set(['AbortError', 'ValidationError', 'SecurityError', 'TenantIsolationError', 'AuthApiError', 'AuthSessionMissingError', 'AuthInvalidCredentialsError', 'AuthWeakPasswordError']);

/** True for failures that are part of normal use and for errors the fetch wrapper has already reported. */
export const isExpectedError = (error: unknown): boolean => {
  if (error === null || error === undefined) return true;
  const candidate = error as { name?: string; message?: string; code?: unknown; details?: unknown; hint?: unknown; __isAuthError?: boolean; __isStorageError?: boolean; statusCode?: number };
  if (typeof candidate === 'object') {
    if (candidate.name && EXPECTED_ERROR_NAMES.has(candidate.name)) return true;
    if (candidate.__isAuthError || candidate.__isStorageError) return true;
    if (!(error instanceof Error) && 'code' in candidate && ('details' in candidate || 'hint' in candidate)) return true; // PostgREST error object
    if (typeof candidate.statusCode === 'number' && candidate.statusCode >= 400 && candidate.statusCode < 500) return true;
  }
  const message = typeof error === 'string' ? error : candidate.message ?? '';
  return IGNORED_MESSAGES.some((pattern) => pattern.test(message));
};

// ---------------------------------------------------------------------------
// Environment helpers (safe outside the browser)
// ---------------------------------------------------------------------------
const hasWindow = typeof window !== 'undefined';
const viteEnv = (): Record<string, string | boolean | undefined> => ((import.meta as unknown as { env?: Record<string, string | boolean | undefined> }).env ?? {});

const detectEnvironment = (): ErrorEvent['environment'] => {
  const explicit = String(viteEnv().VITE_APP_ENV ?? '').toLowerCase();
  if (explicit === 'production' || explicit === 'staging' || explicit === 'development') return explicit;
  if (viteEnv().DEV) return 'development';
  const host = hasWindow ? window.location.hostname : '';
  if (host === 'localhost' || host === '127.0.0.1') return 'development';
  return /\.vercel\.app$/.test(host) ? 'staging' : 'production';
};

export const describeBrowser = (userAgent: string): string => {
  const pick = (pattern: RegExp) => userAgent.match(pattern)?.[1];
  const browser = pick(/Edg\/(\d+)/) ? `Edge ${pick(/Edg\/(\d+)/)}` : pick(/OPR\/(\d+)/) ? `Opera ${pick(/OPR\/(\d+)/)}` : pick(/Firefox\/(\d+)/) ? `Firefox ${pick(/Firefox\/(\d+)/)}`
    : pick(/Chrome\/(\d+)/) ? `Chrome ${pick(/Chrome\/(\d+)/)}` : pick(/Version\/(\d+).*Safari/) ? `Safari ${pick(/Version\/(\d+).*Safari/)}` : 'Other browser';
  const os = /Windows/.test(userAgent) ? 'Windows' : /Android/.test(userAgent) ? 'Android' : /iPhone|iPad|iPod/.test(userAgent) ? 'iOS' : /Mac OS X/.test(userAgent) ? 'macOS' : /Linux/.test(userAgent) ? 'Linux' : 'Other OS';
  return `${browser} / ${os}${/Mobi/.test(userAgent) ? ' (mobile)' : ''}`;
};

const topFrame = (stack: string | undefined): string | undefined => {
  const line = stack?.split('\n').map((entry) => entry.trim()).find((entry) => /:\d+:\d+\)?$/.test(entry));
  return line?.replace(/^at\s+/, '').replace(/https?:\/\/[^/\s)]+/g, '').replace(/\?[^:)\s]*/g, '').slice(0, 300);
};

// ---------------------------------------------------------------------------
// Queue, de-duplication, rate limiting, circuit breaker
// ---------------------------------------------------------------------------
const FIRST_FLUSH_MS = 3_000;
const MIN_FLUSH_GAP_MS = 15_000;
const MAX_BATCH = 20;
const MAX_PENDING = 40;
const MAX_EVENTS_PER_MINUTE = 30;
const PAUSE_AFTER_FAILURES_MS = 10 * 60_000;

const state = {
  module: 'unknown',
  pending: new Map<string, ErrorEvent>(),
  timer: null as ReturnType<typeof setTimeout> | null,
  lastFlushAt: 0,
  sending: false,
  inside: false,
  failures: 0,
  pausedUntil: 0,
  disabled: false,
  recent: [] as number[],
  installed: false,
  transport: null as ErrorTransport | null,
  enabled: null as boolean | null,
};

const defaultTransport: ErrorTransport = async (events) => {
  const { supabase } = await import('../lib/supabase');
  const { data } = await supabase.auth.getSession();
  if (!data.session) return 'no-session';
  const { error } = await supabase.rpc('report_errors', { p_events: events });
  if (!error) return 'ok';
  // The reporting endpoint is not deployed on this database: stop trying for this session.
  return ['PGRST202', '42883', '404'].includes(String(error.code)) ? 'unavailable' : 'retry-later';
};

const reportingEnabled = (): boolean => {
  if (state.enabled !== null) return state.enabled;
  // Local development would otherwise fill the shared database with noise.
  return detectEnvironment() !== 'development' || String(viteEnv().VITE_REPORT_DEV_ERRORS) === 'true';
};

const schedule = () => {
  if (state.timer || state.disabled) return;
  const wait = Math.max(FIRST_FLUSH_MS, state.lastFlushAt + MIN_FLUSH_GAP_MS - Date.now(), state.pausedUntil - Date.now());
  state.timer = setTimeout(() => { state.timer = null; void flushErrorReports(); }, wait);
  (state.timer as { unref?: () => void }).unref?.();
};

/** Sends queued reports now. Resolves when the attempt finishes; never rejects. */
export const flushErrorReports = async (): Promise<void> => {
  if (state.sending || state.disabled || state.pending.size === 0 || Date.now() < state.pausedUntil) return;
  state.sending = true;
  const batch = Array.from(state.pending.entries()).slice(0, MAX_BATCH);
  try {
    const outcome = await (state.transport ?? defaultTransport)(batch.map(([, event]) => event));
    state.lastFlushAt = Date.now();
    if (outcome === 'ok') {
      state.failures = 0;
      batch.forEach(([key, sent]) => { if (state.pending.get(key) === sent) state.pending.delete(key); });
    } else if (outcome === 'unavailable') {
      state.disabled = true;
      state.pending.clear();
    } else if (outcome === 'retry-later') {
      state.failures += 1;
      if (state.failures >= 3) { state.pausedUntil = Date.now() + PAUSE_AFTER_FAILURES_MS; state.failures = 0; state.pending.clear(); }
    }
    // 'no-session': keep the bounded queue; it is sent after sign-in.
  } catch {
    state.failures += 1;
    if (state.failures >= 3) { state.pausedUntil = Date.now() + PAUSE_AFTER_FAILURES_MS; state.failures = 0; state.pending.clear(); }
  } finally {
    state.sending = false;
    if (state.pending.size > 0) schedule();
  }
};

const enqueue = (event: ErrorEvent) => {
  const key = [event.type, event.module, event.code ?? '', event.message.replace(/\d+/g, '#'), event.frame?.replace(/\d+/g, '#') ?? ''].join('|');
  const existing = state.pending.get(key);
  if (existing) { existing.count = Math.min(existing.count + 1, 500); return; } // repeats are aggregated, not re-sent
  const now = Date.now();
  state.recent = state.recent.filter((time) => now - time < 60_000);
  if (state.recent.length >= MAX_EVENTS_PER_MINUTE || state.pending.size >= MAX_PENDING) return;
  state.recent.push(now);
  state.pending.set(key, event);
  schedule();
};

/** Sets the module (active workspace area) attached to subsequent reports. */
export const setErrorModule = (module: string | null | undefined): void => { state.module = module || 'unknown'; };

/**
 * Reports a technical error. Safe to call from anywhere: it never throws and returns immediately.
 * Expected outcomes (validation, cancellations, permission denials) are ignored unless a type is forced.
 */
export const reportError = (error: unknown, context: ErrorContext = {}): void => {
  if (state.inside || state.disabled) return; // an error raised while reporting must not be reported
  state.inside = true;
  try {
    if (!reportingEnabled()) return;
    if (!context.type && isExpectedError(error)) return;
    const asError = error instanceof Error ? error : null;
    const rawMessage = asError?.message || (typeof error === 'string' ? error : (error as { message?: string } | null)?.message) || 'Unknown error';
    const stack = [asError?.stack, context.detail].filter(Boolean).join('\n') || undefined;
    if (stack && /(chrome|moz|safari-web)-extension:\/\//.test(stack)) return; // browser extensions, not CAATH
    const chunkFailure = /dynamically imported module|Loading chunk|Importing a module script failed/i.test(rawMessage);
    enqueue({
      type: context.type ?? (chunkFailure ? 'network' : 'frontend'),
      severity: context.severity ?? 'Medium',
      module: context.module || state.module,
      message: redact(`${asError && asError.name !== 'Error' ? `${asError.name}: ` : ''}${rawMessage}`).slice(0, 500),
      code: context.code ?? (chunkFailure ? 'CHUNK_LOAD' : (error as { code?: unknown } | null)?.code ? String((error as { code?: unknown }).code).slice(0, 60) : undefined),
      stack: stack ? redact(stack).slice(0, 6000) : undefined,
      frame: topFrame(asError?.stack),
      route: hasWindow ? window.location.pathname : undefined,
      browser: typeof navigator !== 'undefined' ? describeBrowser(navigator.userAgent) : undefined,
      request_id: context.requestId,
      environment: detectEnvironment(),
      count: 1,
    });
  } catch {
    // Reporting is best effort by design.
  } finally {
    state.inside = false;
  }
};

/** Window-level capture for errors that escape React and for unhandled promise rejections. */
export const installGlobalErrorHandlers = (): void => {
  if (!hasWindow || state.installed) return;
  state.installed = true;
  window.addEventListener('error', (event) => {
    if (event.error || event.message) reportError(event.error ?? event.message, { severity: 'High' });
  });
  window.addEventListener('unhandledrejection', (event) => reportError(event.reason));
  window.addEventListener('pagehide', () => { void flushErrorReports(); });
};

/**
 * fetch wrapper for the Supabase client. Successful responses pass through untouched;
 * failures are classified from status + PostgREST error code only (never the request body).
 */
export const createMonitoredFetch = (baseFetch: typeof fetch = (...args) => fetch(...args)): typeof fetch => async (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const method = init?.method ?? (typeof input === 'object' && 'method' in input ? input.method : 'GET');
  const started = Date.now();
  let response: Response;
  try {
    response = await baseFetch(input, init);
  } catch (error) {
    try {
      const aborted = (error as { name?: string } | null)?.name === 'AbortError' || Boolean(init?.signal?.aborted);
      const verdict = classifyHttpFailure({ url, method, status: 0, durationMs: Date.now() - started, aborted, offline: typeof navigator !== 'undefined' && navigator.onLine === false });
      if (verdict) reportError(new Error(verdict.message), verdict);
    } catch { /* never mask the original failure */ }
    throw error;
  }
  try {
    const durationMs = Date.now() - started;
    if (!response.ok || durationMs >= SLOW_REQUEST_MS) {
      let code: string | undefined;
      let message: string | undefined;
      if (!response.ok) {
        const body = await response.clone().json().catch(() => null) as { code?: unknown; message?: unknown; error?: unknown; msg?: unknown } | null;
        code = body?.code !== undefined ? String(body.code) : undefined;
        message = [body?.message, body?.msg, body?.error].find((value): value is string => typeof value === 'string');
      }
      const verdict = classifyHttpFailure({ url, method, status: response.status, code, message, durationMs });
      if (verdict) reportError(new Error(verdict.message), { ...verdict, requestId: response.headers.get('sb-request-id') ?? response.headers.get('x-request-id') ?? undefined });
    }
  } catch { /* monitoring must not affect the caller */ }
  return response;
};

/** Test seam: inject a transport, force-enable reporting and clear all state. */
export const __configureErrorReporterForTests = (options: { transport?: ErrorTransport | null; enabled?: boolean | null } = {}): void => {
  if (state.timer) clearTimeout(state.timer);
  Object.assign(state, { module: 'unknown', timer: null, lastFlushAt: 0, sending: false, inside: false, failures: 0, pausedUntil: 0, disabled: false, recent: [], transport: options.transport ?? null, enabled: options.enabled ?? null });
  state.pending.clear();
};
export const __pendingErrorReports = (): ErrorEvent[] => Array.from(state.pending.values());
