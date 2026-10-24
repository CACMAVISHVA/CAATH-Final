import { encryptSecret, decryptSecret, type VaultContext } from './crypto.ts';
import { canAccessVault, canManageVault, hasRecentAuthentication } from './policy.ts';
import {
  SecurityError,
  assertRateLimit,
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

const keySettings = () => {
 const version = Deno.env.get('PORTAL_MASTER_KEY_VERSION') || '1';
 const active = requireEnv('PORTAL_MASTER_KEY');
 const previous = JSON.parse(Deno.env.get('PORTAL_PREVIOUS_KEYS') || '{}') as Record<string,string>;
 return { version, active, keys: { ...previous, [version]: active } };
};
type SecretAction = 'create'|'list'|'get'|'update'|'delete'|'reveal'|'touch_login'|'touch_filing';
const encryptValue = async (plaintext: string, context: VaultContext) => { const k=keySettings(); return encryptSecret(plaintext,k.active,k.version,context); };
const decryptValue = async (ciphertext: string, context: VaultContext) => { const k=keySettings(); return decryptSecret(ciphertext,k.keys,k.version,context); };

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
  const { error } = await admin.from("audit_logs").insert([{
    firm_id: data.firmId,
    user_id: data.userId,
    user_name: data.userName,
    user_role: data.userRole,
    action: data.action,
    entity_type: "portal_credentials",
    entity_id: data.entityId ?? null,
    details: data.details,
    severity: data.severity || "info",
    ip_address: data.request.headers.get("x-forwarded-for")?.slice(0,200) ?? null,
  }]);
  if (error) throw new SecurityError("Audit unavailable. Operation stopped.", 503, "AUDIT_FAILED");
};

export const createVaultHandler = (clients = createSupabaseClients) => async (req: Request) => {
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new SecurityError("Missing authorization token.", 401, "UNAUTHORIZED");

    const { caller, admin } = clients(authHeader);
    const { data: authData, error: authError } = await caller.auth.getUser();
    if (authError || !authData.user) throw new SecurityError("Unauthorized.", 401, "UNAUTHORIZED");

    const { data: actor, error: actorError } = await admin
      .from("users")
      .select("id, name, role, firm_id, status, deleted_at")
      .eq("auth_id", authData.user.id)
      .maybeSingle();
    if (actorError || !actor || actor.status !== "Active" || actor.deleted_at) throw new SecurityError("Inactive or missing profile.", 403, "PROFILE_FORBIDDEN");

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
    const canWrite = canManageVault(actor);
    if (!["SuperAdmin", "Admin", "Staff"].includes(role) || !firmId) throw new SecurityError("Workspace credential access denied.", 403, "ROLE_FORBIDDEN");
    const { data: firm, error: firmError } = await admin.from('firms').select('status').eq('id',firmId).maybeSingle();
    if (firmError || firm?.status !== 'Active') throw new SecurityError('Workspace access unavailable.',403,'TENANT_FORBIDDEN');
    // Persist an intent before any mutation. A failed completion log never leaves an unlogged write.
    if (['create','update','delete','touch_login','touch_filing'].includes(action)) {
      await createAuditLog(admin, { userId:actor.id, userName:actor.name, userRole:role, firmId,
        action:'portal_action_requested', details:`Requested vault operation: ${action}`, request:req });
    }


    const assertTenant = (targetFirmId: string | null) => {
      if (targetFirmId !== firmId) {
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

      let query = admin
        .from("portal_credentials")
        .select("id, client_id, firm_id, portal_type, portal_name, portal_url, username_masked, gstin, pan, cin, last_login, last_filing_date, assigned_to, credential_ref, created_at, updated_at")
        .eq("firm_id", clientRow.firm_id).eq("client_id", clientId);
      if (role === "Staff") query = query.eq("assigned_to", actor.id);
      const { data, error } = await query.order("portal_name", { ascending: true });
      if (error) throw new SecurityError("Unable to list credentials.", 400, "QUERY_FAILED");
      return json(200, { data: (data ?? []).map((row: Record<string, unknown>) => ({ ...row, username: row.username_masked })) });
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

      const credentialId = crypto.randomUUID();
      const context = { id: credentialId, firm_id: clientRow.firm_id, client_id: clientId };
      const { data, error } = await admin
        .from("portal_credentials")
        .insert([{
          id: credentialId,
          firm_id: clientRow.firm_id,
          client_id: clientId,
          portal_name: portalName,
          portal_type: portalType,
          portal_url: portalUrl,
          encrypted_username: await encryptValue(username, { ...context, field: "username" }),
          encrypted_password: await encryptValue(password, { ...context, field: "password" }),
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
    if (!canAccessVault(actor, existing)) throw new SecurityError("Credential is not assigned to you.", 403, "ASSIGNMENT_FORBIDDEN");
    const { data: linkedClient, error: linkedError } = await admin.from('clients').select('id,firm_id').eq('id',existing.client_id).eq('firm_id',firmId).maybeSingle();
    if (linkedError || !linkedClient) throw new SecurityError('Credential client unavailable.',403,'TENANT_FORBIDDEN');

    const context = { id: existing.id, firm_id: existing.firm_id, client_id: existing.client_id };

    if (action === "get") {
      const { id, client_id, firm_id, portal_type, portal_name, portal_url, username_masked, gstin, pan, cin, last_login, last_filing_date, assigned_to, credential_ref } = existing;
      return json(200, { data: { id, client_id, firm_id, portal_type, portal_name, portal_url, username: username_masked, gstin, pan, cin, last_login, last_filing_date, assigned_to, credential_ref } });
    }

    if (action === "update") {
      if (!canWrite) throw new SecurityError("Insufficient role permissions.", 403, "ROLE_FORBIDDEN");
      const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (body.assignedTo !== undefined) {
        const assigned = validateUuid(body.assignedTo, 'assignedTo');
        const { data: owner, error: ownerError } = await admin.from('users').select('id').eq('id',assigned).eq('firm_id',firmId).eq('status','Active').is('deleted_at',null).in('role',['SuperAdmin','Admin','Staff']).maybeSingle();
        if (ownerError || !owner) throw new SecurityError('Invalid credential owner.',400,'ASSIGNMENT_FORBIDDEN');
        updatePayload.assigned_to = assigned;
      }
      if (body.portalName !== undefined) updatePayload.portal_name = validateNonEmptyString(body.portalName, "portalName", 200);
      if (body.portalUrl !== undefined) updatePayload.portal_url = validatePortalUrl(body.portalUrl);
      if (body.gstin !== undefined) updatePayload.gstin = validateOptionalString(body.gstin, "gstin", 30);
      if (body.pan !== undefined) updatePayload.pan = validateOptionalString(body.pan, "pan", 30);
      if (body.cin !== undefined) updatePayload.cin = validateOptionalString(body.cin, "cin", 30);
      if (body.securityNotes !== undefined) updatePayload.security_notes = validateOptionalString(body.securityNotes, "securityNotes", 2000);
      if (body.username !== undefined) {
        const username = validateNonEmptyString(body.username, "username", 256);
        updatePayload.encrypted_username = await encryptValue(username, { ...context, field: "username" });
        updatePayload.username_masked = getMaskedUsername(username);
      }
      if (body.password !== undefined) {
        const password = validateNonEmptyString(body.password, "password", 512);
        updatePayload.encrypted_password = await encryptValue(password, { ...context, field: "password" });
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
      if (!canWrite) throw new SecurityError("Insufficient role permissions.", 403, "ROLE_FORBIDDEN");
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
      const reason = validateNonEmptyString(body.reason, 'reason', 500);
      if (reason.length < 10) throw new SecurityError('Explain why the credential is needed.', 400, 'REASON_REQUIRED');
      if (!hasRecentAuthentication(authHeader.slice(7))) throw new SecurityError('Sign in again before revealing credentials.', 403, 'REAUTH_REQUIRED');
      await assertRateLimit(admin, {
        scope: "portal-secrets:reveal",
        actorKey: actor.id,
        limit: 20,
        windowSeconds: 60,
      });
      const decryptedUsername = await decryptValue(String(existing.encrypted_username), { ...context, field: "username" });
      const decryptedPassword = await decryptValue(String(existing.encrypted_password), { ...context, field: "password" });
      await createAuditLog(admin, {
        userId: actor.id,
        userName: actor.name,
        userRole: role,
        firmId: existing.firm_id,
        action: "portal_credential_revealed",
        entityId: credentialId,
        details: `Revealed portal credential. Reason: ${reason}`,
        severity: "warning",
        request: req,
      });
      return json(200, { data: { credentialId, username: decryptedUsername, password: decryptedPassword } });
    }

    if (action === "touch_login") {
      const { error } = await admin.from("portal_credentials").update({ last_login: new Date().toISOString() }).eq("id", credentialId);
      if (error) throw new SecurityError("Unable to record portal login.", 503, "MUTATION_FAILED");
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
      if (!canWrite) throw new SecurityError('Manager review required.', 403, 'ROLE_FORBIDDEN');
      const filingDate = validateNonEmptyString(body.filingDate, "filingDate", 40);
      const parsedDate = new Date(filingDate+'T00:00:00Z');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(filingDate) || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0,10) !== filingDate) throw new SecurityError('Invalid filing date.', 400, 'VALIDATION_ERROR');
      const { error } = await admin.from("portal_credentials").update({
        last_filing_date: filingDate,
        updated_at: new Date().toISOString(),
      }).eq("id", credentialId);
      if (error) throw new SecurityError("Unable to record filing.", 503, "MUTATION_FAILED");
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
};

export const handleVault = createVaultHandler();
