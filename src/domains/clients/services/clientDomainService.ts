/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User } from '../../../types';
import { emitDomainEvent } from '../../sharedEventEmitter';
import { buildOperationalId, normalizeClientEntityType } from '../../../lib/operationalIdentity';
import { clientRepository } from '../repositories/ClientRepository';
import { unwrapData, unwrapOptional } from '../../../infrastructure/repositories/baseRepository';
import { firstValidationError, validateCinOrLlpin, validateEmail, validateGSTIN, validateIndianMobile, validatePAN, validateRequiredName, validateTAN } from '../../../lib/fieldValidation';

export { validateGSTIN, validatePAN } from '../../../lib/fieldValidation';

export type ClientType = 'Proprietorship' | 'Partnership Firm' | 'LLP' | 'Private Limited Company' | 'Public Company' | 'Trust' | 'NGO' | 'Others';
export type RiskLevel = 'Low' | 'Medium' | 'High';
export type ServiceType = 'GST Filing' | 'Income Tax' | 'Audit' | 'ROC Filing' | 'Payroll' | 'Bookkeeping';

export type ClientInput = {
  firmId: string;
  name: string;
  type: string;
  pan: string;
  gstin?: string;
  tan?: string;
  cinLlpin?: string;
  portalUsername?: string;
  portalUsernames?: Record<string, string>;
  contactPerson?: string;
  email?: string;
  phone?: string;
  riskLevel?: RiskLevel;
  services?: string[];
  assignedStaffId?: string;
  user: User;
};

export type ClientRow = {
  id: string;
  operational_id?: string;
  firm_id: string;
  name: string;
  type: string;
  pan: string;
  gstin: string | null;
  tan: string | null;
  cin_llpin: string | null;
  portal_username: string | null;
  portal_usernames: Record<string, string> | null;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  risk_level: RiskLevel;
  services: string[];
  assigned_staff_id: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

const validateClientFields = (input: { name?: string; type?: string; pan?: string; gstin?: string; tan?: string; cinLlpin?: string; email?: string; phone?: string }, requireIdentity: boolean) => firstValidationError(
  input.name !== undefined ? validateRequiredName(input.name, 'Client name') : { valid: true },
  requireIdentity && !input.type?.trim() ? { valid: false, error: 'Please select a valid business type.' } : { valid: true },
  input.pan !== undefined ? validatePAN(input.pan, requireIdentity) : { valid: true },
  validateGSTIN(input.gstin || ''),
  validateTAN(input.tan || ''),
  validateCinOrLlpin(input.cinLlpin || ''),
  validateEmail(input.email || '', false),
  validateIndianMobile(input.phone || '', false),
);

const writeAuditLog = async (params: { firmId: string; user: User; action: string; entityType: string; entityId?: string; details: string }) => {
  await unwrapData(clientRepository.insertAuditLog({
    firm_id: params.firmId,
    user_id: params.user.id,
    user_name: params.user.name,
    user_role: params.user.role,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId,
    details: params.details,
  }) as any);
};

const assertCanManageClients = (user: User) => {
  if (user.role !== 'SuperAdmin' && user.role !== 'Admin') {
    throw new Error('Only Super Admin or Admin can create or change client master records.');
  }
};

export const createClient = async ({ firmId, name, type, pan, gstin, tan, cinLlpin, portalUsername, portalUsernames, contactPerson, email, phone, riskLevel = 'Low', services = [], assignedStaffId, user }: ClientInput) => {
  assertCanManageClients(user);
  if (!user.firmId) throw new Error('A firm workspace is required to create clients.');

  const validationError = validateClientFields({ name, type, pan, gstin, tan, cinLlpin, email, phone }, true);
  if (validationError) throw new Error(validationError);

  const existingClient = await unwrapOptional(clientRepository.findByPan(firmId, pan.toUpperCase()) as any);
  if (existingClient) throw new Error('A client with this PAN already exists in your firm.');

  const data = await unwrapData(clientRepository.insert({
    firm_id: firmId,
    name,
    type,
    pan: pan.toUpperCase(),
    gstin: gstin ? gstin.toUpperCase() : null,
    tan: tan ? tan.toUpperCase() : null,
    cin_llpin: cinLlpin ? cinLlpin.toUpperCase() : null,
    portal_username: portalUsername || null,
    portal_usernames: portalUsernames || {},
    contact_person: contactPerson,
    email,
    phone,
    risk_level: riskLevel,
    services,
    assigned_staff_id: assignedStaffId,
    created_by: user.id,
    updated_by: user.id,
  }) as any);

  await writeAuditLog({ firmId, user, action: 'Client Created', entityType: 'Client', entityId: (data as any).id, details: `Client "${name}" (PAN: ${pan}) onboarded.` });
  try {
    await emitDomainEvent('CLIENT_CREATED', { clientId: (data as any).id, firmId, type, riskLevel }, firmId, user.id);
  } catch {}

  return data;
};

export const updateClient = async (clientId: string, updates: Partial<{ name: string; type: string; tan: string; cinLlpin: string; portalUsername: string; portalUsernames: Record<string, string>; contactPerson: string; email: string; phone: string; riskLevel: RiskLevel; services: string[]; assignedStaffId: string }>, user: User) => {
  assertCanManageClients(user);
  if (!user.firmId) throw new Error('A firm workspace is required.');
  const validationError = validateClientFields(updates, false);
  if (validationError) throw new Error(validationError);

  const {
    contactPerson,
    assignedStaffId,
    riskLevel,
    cinLlpin,
    portalUsername,
    portalUsernames,
    ...directFields
  } = updates;
  const updateData: Record<string, unknown> = { ...directFields, updated_by: user.id, updated_at: new Date().toISOString() };

  if (contactPerson !== undefined) updateData.contact_person = contactPerson || null;
  if (assignedStaffId !== undefined) updateData.assigned_staff_id = assignedStaffId || null;
  if (riskLevel !== undefined) updateData.risk_level = riskLevel;
  if (cinLlpin !== undefined) updateData.cin_llpin = cinLlpin ? cinLlpin.toUpperCase() : null;
  if (portalUsername !== undefined) updateData.portal_username = portalUsername || null;
  if (portalUsernames !== undefined) updateData.portal_usernames = portalUsernames || {};

  await unwrapData(clientRepository.updateById(user.firmId, clientId, updateData) as any);
  await writeAuditLog({ firmId: user.firmId, user, action: 'Client Updated', entityType: 'Client', entityId: clientId, details: `Client ${clientId} updated.` });
};

export const deleteClient = async (clientId: string, user: User) => {
  assertCanManageClients(user);
  if (!user.firmId) throw new Error('A firm workspace is required.');
  const client = await unwrapOptional(clientRepository.getName(clientId) as any);
  await unwrapData(clientRepository.deleteById(user.firmId, clientId) as any);

  await writeAuditLog({ firmId: user.firmId, user, action: 'Client Deleted', entityType: 'Client', entityId: clientId, details: `Client "${(client as any)?.name || clientId}" deleted.` });
};

export const getClients = async (firmId: string) => {
  const rows = await unwrapData(clientRepository.listByFirm(firmId) as any);
  const sequenceByType: Record<string, number> = {};
  const enriched = ((rows as any[]) || []).map((row) => {
    const key = normalizeClientEntityType(row.type || '');
    sequenceByType[key] = (sequenceByType[key] || 0) + 1;
    return { ...row, operational_id: buildOperationalId(key, sequenceByType[key]) };
  });
  return enriched as ClientRow[];
};

export const getClient = async (clientId: string) => {
  const data = await unwrapData(clientRepository.getById(clientId) as any);
  return data as ClientRow;
};

export const getClientCount = async (firmId: string): Promise<number> => {
  const { count, error } = await clientRepository.countByFirm(firmId);
  if (error) return 0;
  return count || 0;
};

export const getClientsByRisk = async (firmId: string, riskLevel: RiskLevel) => {
  const data = await unwrapData(clientRepository.listByRisk(firmId, riskLevel) as any);
  return ((data as any[]) || []) as ClientRow[];
};
