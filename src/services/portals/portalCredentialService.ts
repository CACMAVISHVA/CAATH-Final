/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PortalCredentialInput, PortalCredentialSummary, PortalCredentialUpdatePayload, PortalCredential } from './portalTypes';
import { invokePortalSecrets } from './portalSecretsClient';
import { requireString, requireUuid, optionalString } from '../../security';

const PORTAL_URLS: Record<string, string> = {
  GST: 'https://www.gst.gov.in/',
  MCA: 'https://www.mca.gov.in/',
  IncomeTax: 'https://www.incometax.gov.in/',
  ICEGATE: 'https://www.icegate.gov.in/',
  EPFO: 'https://www.epfindia.gov.in/',
  ESIC: 'https://www.esic.gov.in/',
  Banking: '',
  Custom: '',
};

const getValidPortalUrl = (portalUrl: string): string => {
  const trimmedUrl = portalUrl?.trim();
  if (!trimmedUrl) throw new Error('Portal URL is required.');
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(trimmedUrl);
  } catch {
    throw new Error('Invalid portal URL.');
  }
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error('Only HTTPS and HTTP portal URLs are supported.');
  }
  return parsedUrl.toString();
};

export const createPortalCredential = async (input: PortalCredentialInput): Promise<PortalCredentialSummary> => {
  requireUuid(input.clientId, 'clientId');
  requireString(input.portalName, 'portalName', 200);
  requireString(input.username, 'username', 256);
  requireString(input.password, 'password', 512);

  const portalUrl = getValidPortalUrl(input.portalUrl?.trim() || PORTAL_URLS[input.portalType] || '');
  return invokePortalSecrets<PortalCredentialSummary>({
    action: 'create',
    clientId: input.clientId,
    portalType: input.portalType,
    portalName: input.portalName.trim(),
    portalUrl,
    username: input.username.trim(),
    password: input.password,
    gstin: optionalString(input.gstin, 'gstin', 30),
    pan: optionalString(input.pan, 'pan', 30),
    cin: optionalString(input.cin, 'cin', 30),
    securityNotes: optionalString(input.securityNotes, 'securityNotes', 2000),
  });
};

export const getClientPortalCredentials = async (clientId: string): Promise<PortalCredentialSummary[]> => {
  requireUuid(clientId, 'clientId');
  return invokePortalSecrets<PortalCredentialSummary[]>({
    action: 'list',
    clientId,
  });
};

export const getPortalCredential = async (
  credentialId: string
): Promise<Pick<PortalCredential, 'id' | 'portal_url' | 'credential_ref' | 'portal_name' | 'portal_type'> | null> => {
  const result = await invokePortalSecrets<PortalCredential>({
    action: 'get',
    credentialId,
  });

  if (!result) return null;
  return {
    id: result.id,
    portal_url: result.portal_url,
    credential_ref: result.credential_ref || null,
    portal_name: result.portal_name,
    portal_type: result.portal_type,
  };
};

export const updatePortalCredential = async (
  credentialId: string,
  updates: PortalCredentialUpdatePayload,
): Promise<void> => {
  requireUuid(credentialId, 'credentialId');
  const payload: Record<string, unknown> = { action: 'update', credentialId };
  if (updates.portalName !== undefined) payload.portalName = updates.portalName.trim();
  if (updates.portalUrl !== undefined) payload.portalUrl = getValidPortalUrl(updates.portalUrl.trim());
  if (updates.username !== undefined) payload.username = updates.username.trim();
  if (updates.password !== undefined) payload.password = updates.password;
  if (updates.gstin !== undefined) payload.gstin = updates.gstin;
  if (updates.pan !== undefined) payload.pan = updates.pan;
  if (updates.cin !== undefined) payload.cin = updates.cin;
  if (updates.securityNotes !== undefined) payload.securityNotes = updates.securityNotes;
  await invokePortalSecrets<PortalCredentialSummary>(payload);
};

export const deletePortalCredential = async (credentialId: string): Promise<void> => {
  requireUuid(credentialId, 'credentialId');
  await invokePortalSecrets<{ success: true }>({
    action: 'delete',
    credentialId,
  });
};
