/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User } from '../../../types';
import { emitDomainEvent } from '../../sharedEventEmitter';
import { buildOperationalId, normalizeClientEntityType } from '../../../lib/operationalIdentity';
import { clientRepository } from '../repositories/ClientRepository';
import { unwrapData, unwrapOptional } from '../../../infrastructure/repositories/baseRepository';

export type ClientType = 'Proprietorship' | 'Partnership Firm' | 'LLP' | 'Private Limited Company' | 'Public Company' | 'Trust' | 'NGO' | 'Others';
export type RiskLevel = 'Low' | 'Medium' | 'High';
export type ServiceType = 'GST Filing' | 'Income Tax' | 'Audit' | 'ROC Filing' | 'Payroll' | 'Bookkeeping';

export type ClientInput = {
  firmId: string;
  name: string;
  type: string;
  pan: string;
  gstin?: string;
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

export const validatePAN = (pan: string): { valid: boolean; error?: string } => {
  const cleanPAN = pan.trim().toUpperCase();
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
  if (!cleanPAN) return { valid: false, error: 'PAN is required' };
  if (!panRegex.test(cleanPAN)) return { valid: false, error: 'Invalid PAN format. Expected: ABCDE1234F' };
  return { valid: true };
};

export const validateGSTIN = (gstin: string): { valid: boolean; error?: string } => {
  const cleanGSTIN = gstin.trim().toUpperCase();
  if (!cleanGSTIN) return { valid: true };
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  if (!gstinRegex.test(cleanGSTIN)) return { valid: false, error: 'Invalid GSTIN format. Expected: 27ABCDE1234F1Z5' };
  return { valid: true };
};

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

export const createClient = async ({ firmId, name, type, pan, gstin, contactPerson, email, phone, riskLevel = 'Low', services = [], assignedStaffId, user }: ClientInput) => {
  if (!user.firmId) throw new Error('A firm workspace is required to create clients.');

  const panValidation = validatePAN(pan);
  if (!panValidation.valid) throw new Error(panValidation.error);

  if (gstin) {
    const gstinValidation = validateGSTIN(gstin);
    if (!gstinValidation.valid) throw new Error(gstinValidation.error);
  }

  const existingClient = await unwrapOptional(clientRepository.findByPan(firmId, pan.toUpperCase()) as any);
  if (existingClient) throw new Error('A client with this PAN already exists in your firm.');

  const data = await unwrapData(clientRepository.insert({
    firm_id: firmId,
    name,
    type,
    pan: pan.toUpperCase(),
    gstin: gstin ? gstin.toUpperCase() : null,
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

export const updateClient = async (clientId: string, updates: Partial<{ name: string; type: string; contactPerson: string; email: string; phone: string; riskLevel: RiskLevel; services: string[]; assignedStaffId: string }>, user: User) => {
  if (!user.firmId) throw new Error('A firm workspace is required.');

  const updateData: Record<string, unknown> = { ...updates, updated_by: user.id, updated_at: new Date().toISOString() };
  if (updates.contactPerson) updateData.contact_person = updates.contactPerson;
  if (updates.assignedStaffId) updateData.assigned_staff_id = updates.assignedStaffId;
  if (updates.riskLevel) updateData.risk_level = updates.riskLevel;

  await unwrapData(clientRepository.updateById(user.firmId, clientId, updateData) as any);
  await writeAuditLog({ firmId: user.firmId, user, action: 'Client Updated', entityType: 'Client', entityId: clientId, details: `Client ${clientId} updated.` });
};

export const deleteClient = async (clientId: string, user: User) => {
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
