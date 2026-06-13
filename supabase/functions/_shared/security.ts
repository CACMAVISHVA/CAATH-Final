// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

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
    const body = await req.json();
    if (!body || typeof body !== "object") {
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
  admin: ReturnType<typeof createClient>,
  input: { scope: string; actorKey: string; limit: number; windowSeconds: number }
) => {
  const now = new Date();
  const windowStart = new Date(Math.floor(now.getTime() / (input.windowSeconds * 1000)) * (input.windowSeconds * 1000)).toISOString();

  const { data: existing, error: fetchError } = await admin
    .from("security_rate_limits")
    .select("id, request_count")
    .eq("scope", input.scope)
    .eq("actor_key", input.actorKey)
    .eq("window_start", windowStart)
    .maybeSingle();

  if (fetchError) throw new SecurityError("Unable to evaluate rate limit.", 500, "RATE_LIMIT_FAILURE", false);

  if (!existing) {
    const { error: insertError } = await admin.from("security_rate_limits").insert([{
      scope: input.scope,
      actor_key: input.actorKey,
      window_start: windowStart,
      request_count: 1,
      updated_at: new Date().toISOString(),
    }]);
    if (insertError) throw new SecurityError("Unable to evaluate rate limit.", 500, "RATE_LIMIT_FAILURE", false);
    return;
  }

  const nextCount = Number(existing.request_count || 0) + 1;
  if (nextCount > input.limit) {
    throw new SecurityError("Too many requests. Please retry later.", 429, "RATE_LIMITED");
  }

  const { error: updateError } = await admin
    .from("security_rate_limits")
    .update({ request_count: nextCount, updated_at: new Date().toISOString() })
    .eq("id", existing.id);

  if (updateError) throw new SecurityError("Unable to evaluate rate limit.", 500, "RATE_LIMIT_FAILURE", false);
};
