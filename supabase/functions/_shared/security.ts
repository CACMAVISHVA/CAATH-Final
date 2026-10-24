import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

export class SecurityError extends Error {
  status: number;
  code: string;
  expose: boolean;

  constructor(message: string, status = 400, code = "SECURITY_ERROR", expose = true) {
    super(message);
    this.status = status;
    this.code = code;
    this.expose = expose;
  }
}

export const allowedOrigin = (origin: string | null) => {
  if (!origin) return null; // Authenticated non-browser calls still require authorization.
  const allowed = new Set(['https://caath.in', 'https://www.caath.in', ...(Deno.env.get('PORTAL_ALLOWED_ORIGINS') || '').split(',').map(s => s.trim()).filter(Boolean)]);
  if (!allowed.has(origin)) throw new SecurityError('Origin not allowed.', 403, 'ORIGIN_FORBIDDEN');
  return origin;
};
export const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
export const withCors = (response: Response, origin: string | null) => {
  if (origin) response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Vary', 'Origin');
  response.headers.set('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');
  response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  return response;
};

export const requireEnv = (name: string): string => {
  const value = Deno.env.get(name);
  if (!value) throw new SecurityError(`Missing required environment variable: ${name}`, 500, "MISSING_ENV", false);
  return value;
};

export const toSafeErrorResponse = (error: unknown): Response => {
  if (error instanceof SecurityError) {
    return json(error.status, {
      error: error.expose ? error.message : "Request failed.",
      code: error.code,
    });
  }
  return json(500, { error: "Internal server error.", code: "INTERNAL_ERROR" });
};

export const parseJsonBody = async (req: Request): Promise<Record<string, unknown>> => {
  try {
    const reader = req.body?.getReader();
    if (!reader) throw new Error('Missing payload');
    const chunks: Uint8Array[] = []; let size = 0;
    for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > 16384) { await reader.cancel(); throw new Error('Payload too large'); } chunks.push(value); }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    const body = JSON.parse(new TextDecoder().decode(bytes));
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new SecurityError("Invalid JSON payload.", 400, "INVALID_JSON");
    }
    return body as Record<string, unknown>;
  } catch {
    throw new SecurityError("Invalid JSON payload.", 400, "INVALID_JSON");
  }
};

export const validateUuid = (value: unknown, field: string): string => {
  if (typeof value !== "string") throw new SecurityError(`${field} is required.`, 400, "VALIDATION_ERROR");
  const trimmed = value.trim();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(trimmed)) throw new SecurityError(`${field} must be a valid UUID.`, 400, "VALIDATION_ERROR");
  return trimmed;
};

export const validateNonEmptyString = (value: unknown, field: string, maxLen = 512): string => {
  if (typeof value !== "string" || !value.trim()) {
    throw new SecurityError(`${field} is required.`, 400, "VALIDATION_ERROR");
  }
  const trimmed = value.trim();
  if (trimmed.length > maxLen) throw new SecurityError(`${field} exceeds max length.`, 400, "VALIDATION_ERROR");
  return trimmed;
};

export const validateOptionalString = (value: unknown, field: string, maxLen = 512): string | null => {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new SecurityError(`${field} must be a string.`, 400, "VALIDATION_ERROR");
  const trimmed = value.trim();
  if (trimmed.length > maxLen) throw new SecurityError(`${field} exceeds max length.`, 400, "VALIDATION_ERROR");
  return trimmed || null;
};

export const validatePortalUrl = (value: unknown): string => {
  const url = validateNonEmptyString(value, "portalUrl", 2048);
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new SecurityError("Invalid portalUrl.", 400, "VALIDATION_ERROR");
  }
  if (!["https:"].includes(parsed.protocol)) {
    throw new SecurityError("Only HTTPS portal URLs are allowed.", 400, "VALIDATION_ERROR");
  }
  return parsed.toString();
};

export const createSupabaseClients = (authHeader: string) => {
  const supabaseUrl = requireEnv("SUPABASE_URL");
  const anonKey = requireEnv("SUPABASE_ANON_KEY");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const caller = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const admin = createClient(supabaseUrl, serviceRoleKey);
  return { caller, admin };
};

export const assertRateLimit = async (
  admin: ReturnType<typeof createSupabaseClients>["admin"],
  input: { scope: string; actorKey: string; limit: number; windowSeconds: number }
) => {
  const { data, error } = await admin.rpc('consume_security_rate_limit', {
    p_scope: input.scope, p_actor: input.actorKey, p_limit: input.limit, p_window_seconds: input.windowSeconds,
  });
  if (error) throw new SecurityError('Unable to evaluate rate limit.', 503, 'RATE_LIMIT_FAILURE', false);
  if (data !== true) throw new SecurityError('Too many requests. Please retry later.', 429, 'RATE_LIMITED');
};
