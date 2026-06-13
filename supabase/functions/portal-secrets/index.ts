// @ts-nocheck
import {
  SecurityError,
  assertRateLimit,
  corsHeaders,
  createSupabaseClients,
  json,
  parseJsonBody,
  requireEnv,
  toSafeErrorResponse,
  validateNonEmptyString,
  validateOptionalString,
  validatePortalUrl,
  validateUuid,
} from "../_shared/security.ts";

const encoder = new TextEncoder();

type SecretAction =
  | "create"
  | "list"
  | "get"
  | "update"
  | "delete"
  | "reveal"
  | "touch_login"
  | "touch_filing";

const normalizeB64 = (input: string): string => input.replace(/-/g, "+").replace(/_/g, "/");

const decodeAesKey = (raw: string): Uint8Array => {
  const normalized = normalizeB64(raw.trim());
  const decoded = atob(normalized);
  const bytes = new Uint8Array(decoded.length);
  for (let i = 0; i < decoded.length; i += 1) bytes[i] = decoded.charCodeAt(i);
  if (bytes.length !== 32) throw new SecurityError("Invalid encryption key length.", 500, "KEY_INVALID", false);
  return bytes;
};

const importMasterKey = async (): Promise<CryptoKey> => {
  const key = decodeAesKey(requireEnv("PORTAL_MASTER_KEY"));
  return crypto.subtle.importKey("raw", key, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
};

const toB64 = (bytes: Uint8Array): string => {
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
};

const fromB64 = (value: string): Uint8Array => {
  const normalized = normalizeB64(value);
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

const encryptValue = async (plaintext: string): Promise<string> => {
  const key = await importMasterKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipherBuffer = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(plaintext));
  const cipher = new Uint8Array(cipherBuffer);
  const payload = new Uint8Array(iv.length + cipher.length);
  payload.set(iv, 0);
  payload.set(cipher, iv.length);
  return toB64(payload);
};

const decryptValue = async (payloadB64: string): Promise<string> => {
  const key = await importMasterKey();
  const payload = fromB64(payloadB64);
  const iv = payload.slice(0, 12);
  const ciphertext = payload.slice(12);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(plain);
};

const getMaskedUsername = (username: string): string => {
  if (!username) return "***";
  if (username.length <= 2) return `${username[0] ?? "*"}*`;
  return `${username.slice(0, 2)}${"*".repeat(Math.min(8, username.length - 2))}`;
};

const validateAction = (value: unknown): SecretAction => {
  const action = validateNonEmptyString(value, "action", 64) as SecretAction;
  const allowed: SecretAction[] = ["create", "list", "get", "update", "delete", "reveal", "touch_login", "touch_filing"];
  if (!allowed.includes(action)) throw new SecurityError("Unsupported action.", 400, "VALIDATION_ERROR");
  return action;
};

const createAuditLog = async (
  admin: ReturnType<typeof createSupabaseClients>["admin"],
  data: {
    userId: string;
    userName: string;
    userRole: string;
    firmId: string | null;
    action: string;
    entityId?: string | null;
    details: string;
    severity?: "info" | "warning" | "critical";
    request: Request;
  }
) => {
  await admin.from("audit_logs").insert([{
    firm_id: data.firmId,
    tenant_id: data.firmId,
    actor_id: data.userId,
    actor_role: data.userRole,
    user_id: data.userId,
    user_name: data.userName,
    user_role: data.userRole,
    action: data.action,
    entity_type: "portal_credentials",
    entity_id: data.entityId ?? null,
    details: data.details,
    severity: data.severity || "info",
    ip_metadata: { forwarded_for: data.request.headers.get("x-forwarded-for") ?? null },
    device_metadata: { user_agent: data.request.headers.get("user-agent") ?? null },
  }]);
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new SecurityError("Missing authorization token.", 401, "UNAUTHORIZED");

    const { caller, admin } = createSupabaseClients(authHeader);
    const { data: authData, error: authError } = await caller.auth.getUser();
    if (authError || !authData.user) throw new SecurityError("Unauthorized.", 401, "UNAUTHORIZED");

    const { data: actor, error: actorError } = await admin
      .from("users")
      .select("id, name, role, firm_id, status")
      .eq("auth_id", authData.user.id)
      .maybeSingle();
    if (actorError || !actor || actor.status !== "Active") throw new SecurityError("Inactive or missing profile.", 403, "PROFILE_FORBIDDEN");

    await assertRateLimit(admin, {
      scope: "portal-secrets",
      actorKey: actor.id,
      limit: actor.role === "GodAdmin" ? 300 : 150,
      windowSeconds: 60,
    });

    const body = await parseJsonBody(req);
    const action = validateAction(body.action);
    const role = String(actor.role);
    const firmId = actor.firm_id as string | null;
    const isGodAdmin = role === "GodAdmin";
    const canWrite = ["GodAdmin", "SuperAdmin", "Admin", "Staff"].includes(role);

    if (!isGodAdmin && !firmId) throw new SecurityError("Firm context missing.", 403, "TENANT_FORBIDDEN");

    const assertTenant = (targetFirmId: string | null) => {
      if (!isGodAdmin && targetFirmId !== firmId) {
        throw new SecurityError("Cross-tenant access denied.", 403, "TENANT_FORBIDDEN");
      }
    };

    if (action === "list") {
      const clientId = validateUuid(body.clientId, "clientId");
      const { data: clientRow, error: clientErr } = await admin
        .from("clients")
        .select("id, firm_id")
        .eq("id", clientId)
        .maybeSingle();
      if (clientErr || !clientRow) throw new SecurityError("Client not found.", 404, "NOT_FOUND");
      assertTenant(clientRow.firm_id as string);

      const { data, error } = await admin
        .from("portal_credentials")
        .select("id, firm_id, portal_type, portal_name, portal_url, username_masked, gstin, pan, cin, last_login, last_filing_date, assigned_to, credential_ref, created_at, updated_at")
        .eq("firm_id", clientRow.firm_id)
        .order("portal_name", { ascending: true });
      if (error) throw new SecurityError("Unable to list credentials.", 400, "QUERY_FAILED");
      return json(200, { data: (data ?? []).map((row: Record<string, unknown>) => ({ ...row, client_id: clientId, username: row.username_masked })) });
    }

    if (action === "create") {
      if (!canWrite) throw new SecurityError("Insufficient role permissions.", 403, "ROLE_FORBIDDEN");

      await assertRateLimit(admin, {
        scope: "portal-secrets:create",
        actorKey: actor.id,
        limit: 30,
        windowSeconds: 60,
      });

      const clientId = validateUuid(body.clientId, "clientId");
      const portalName = validateNonEmptyString(body.portalName, "portalName", 200);
      const portalType = validateNonEmptyString(body.portalType ?? "Custom", "portalType", 50);
      const portalUrl = validatePortalUrl(body.portalUrl);
      const username = validateNonEmptyString(body.username, "username", 256);
      const password = validateNonEmptyString(body.password, "password", 512);

      const { data: clientRow, error: clientErr } = await admin
        .from("clients")
        .select("id, firm_id")
        .eq("id", clientId)
        .maybeSingle();
      if (clientErr || !clientRow) throw new SecurityError("Client not found.", 404, "NOT_FOUND");
      assertTenant(clientRow.firm_id as string);

      const { data, error } = await admin
        .from("portal_credentials")
        .insert([{
          firm_id: clientRow.firm_id,
          portal_name: portalName,
          portal_type: portalType,
          portal_url: portalUrl,
          encrypted_username: await encryptValue(username),
          encrypted_password: await encryptValue(password),
          username_masked: getMaskedUsername(username),
          gstin: validateOptionalString(body.gstin, "gstin", 30),
          pan: validateOptionalString(body.pan, "pan", 30),
          cin: validateOptionalString(body.cin, "cin", 30),
          security_notes: validateOptionalString(body.securityNotes, "securityNotes", 2000),
          credential_ref: crypto.randomUUID(),
          assigned_to: actor.id,
          created_by: actor.id,
        }])
        .select("id, firm_id, portal_type, portal_name, portal_url, username_masked, gstin, pan, cin, last_login, last_filing_date, assigned_to, credential_ref")
        .single();
      if (error) throw new SecurityError("Unable to create credential.", 400, "MUTATION_FAILED");

      await createAuditLog(admin, {
        userId: actor.id,
        userName: actor.name,
        userRole: role,
        firmId: clientRow.firm_id,
        action: "portal_credential_created",
        entityId: data.id,
        details: `Created portal credential ${portalName}`,
        request: req,
      });
      return json(200, { data: { ...data, client_id: clientId, username: data.username_masked } });
    }

    const credentialId = validateUuid(body.credentialId, "credentialId");
    const { data: existing, error: existingErr } = await admin
      .from("portal_credentials")
      .select("*")
      .eq("id", credentialId)
      .maybeSingle();
    if (existingErr || !existing) throw new SecurityError("Portal credential not found.", 404, "NOT_FOUND");
    assertTenant(existing.firm_id as string);

    if (action === "get") {
      return json(200, { data: existing });
    }

    if (action === "update") {
      if (!canWrite) throw new SecurityError("Insufficient role permissions.", 403, "ROLE_FORBIDDEN");
      const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (body.portalName !== undefined) updatePayload.portal_name = validateNonEmptyString(body.portalName, "portalName", 200);
      if (body.portalUrl !== undefined) updatePayload.portal_url = validatePortalUrl(body.portalUrl);
      if (body.gstin !== undefined) updatePayload.gstin = validateOptionalString(body.gstin, "gstin", 30);
      if (body.pan !== undefined) updatePayload.pan = validateOptionalString(body.pan, "pan", 30);
      if (body.cin !== undefined) updatePayload.cin = validateOptionalString(body.cin, "cin", 30);
      if (body.securityNotes !== undefined) updatePayload.security_notes = validateOptionalString(body.securityNotes, "securityNotes", 2000);
      if (body.username !== undefined) {
        const username = validateNonEmptyString(body.username, "username", 256);
        updatePayload.encrypted_username = await encryptValue(username);
        updatePayload.username_masked = getMaskedUsername(username);
      }
      if (body.password !== undefined) {
        const password = validateNonEmptyString(body.password, "password", 512);
        updatePayload.encrypted_password = await encryptValue(password);
      }

      const { data, error } = await admin
        .from("portal_credentials")
        .update(updatePayload)
        .eq("id", credentialId)
        .select("id, firm_id, portal_type, portal_name, portal_url, username_masked, gstin, pan, cin, last_login, last_filing_date, assigned_to, credential_ref")
        .single();
      if (error) throw new SecurityError("Unable to update credential.", 400, "MUTATION_FAILED");

      await createAuditLog(admin, {
        userId: actor.id,
        userName: actor.name,
        userRole: role,
        firmId: existing.firm_id,
        action: "portal_credential_updated",
        entityId: credentialId,
        details: `Updated portal credential ${existing.portal_name}`,
        request: req,
      });
      return json(200, { data: { ...data, username: data.username_masked } });
    }

    if (action === "delete") {
      if (!["GodAdmin", "SuperAdmin", "Admin"].includes(role)) throw new SecurityError("Insufficient role permissions.", 403, "ROLE_FORBIDDEN");
      const { error } = await admin.from("portal_credentials").delete().eq("id", credentialId);
      if (error) throw new SecurityError("Unable to delete credential.", 400, "MUTATION_FAILED");
      await createAuditLog(admin, {
        userId: actor.id,
        userName: actor.name,
        userRole: role,
        firmId: existing.firm_id,
        action: "portal_credential_deleted",
        entityId: credentialId,
        details: `Deleted portal credential ${existing.portal_name}`,
        request: req,
      });
      return json(200, { data: { success: true } });
    }

    if (action === "reveal") {
      if (!canWrite) throw new SecurityError("Insufficient role permissions.", 403, "ROLE_FORBIDDEN");
      await assertRateLimit(admin, {
        scope: "portal-secrets:reveal",
        actorKey: actor.id,
        limit: 20,
        windowSeconds: 60,
      });
      const decryptedUsername = await decryptValue(String(existing.encrypted_username));
      const decryptedPassword = await decryptValue(String(existing.encrypted_password));
      await createAuditLog(admin, {
        userId: actor.id,
        userName: actor.name,
        userRole: role,
        firmId: existing.firm_id,
        action: "portal_credential_revealed",
        entityId: credentialId,
        details: `Revealed portal credential ${existing.portal_name}`,
        severity: "warning",
        request: req,
      });
      return json(200, { data: { credentialId, username: decryptedUsername, password: decryptedPassword } });
    }

    if (action === "touch_login") {
      await admin.from("portal_credentials").update({ last_login: new Date().toISOString() }).eq("id", credentialId);
      await createAuditLog(admin, {
        userId: actor.id,
        userName: actor.name,
        userRole: role,
        firmId: existing.firm_id,
        action: "portal_login_launched",
        entityId: credentialId,
        details: `Portal launch ${existing.portal_name}`,
        request: req,
      });
      return json(200, { data: { success: true } });
    }

    if (action === "touch_filing") {
      const filingDate = validateNonEmptyString(body.filingDate, "filingDate", 40);
      await admin.from("portal_credentials").update({
        last_filing_date: filingDate,
        updated_at: new Date().toISOString(),
      }).eq("id", credentialId);
      await createAuditLog(admin, {
        userId: actor.id,
        userName: actor.name,
        userRole: role,
        firmId: existing.firm_id,
        action: "portal_filing_recorded",
        entityId: credentialId,
        details: `Recorded portal filing ${existing.portal_name}`,
        request: req,
      });
      return json(200, { data: { success: true } });
    }

    throw new SecurityError("Unsupported action.", 400, "VALIDATION_ERROR");
  } catch (error) {
    return toSafeErrorResponse(error);
  }
});
