/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { assertPortalCredentialAccess } from './portalAccessService';
import { getPortalCredential } from './portalCredentialService';
import { invokePortalSecrets } from './portalSecretsClient';

const getValidPortalUrl = (portalUrl: string): string => {
  const trimmedUrl = portalUrl?.trim();
  if (!trimmedUrl) {
    throw new Error('Portal URL is required.');
  }

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

export const launchPortal = async (
  credentialId: string,
  user: { id: string; name: string; role: string },
  clientId: string
): Promise<{ url: string; credentialRef: string | null }> => {
  assertPortalCredentialAccess(user);

  const credential = await getPortalCredential(credentialId);
  if (!credential) throw new Error('Portal credential not found');

  const url = getValidPortalUrl(credential.portal_url);

  await invokePortalSecrets<{ success: true }>({
    action: 'touch_login',
    credentialId,
    clientId,
  });

  return {
    url,
    credentialRef: credential.credential_ref || null,
  };
};

export const recordPortalFiling = async (credentialId: string, filingDate: string) => {
  await invokePortalSecrets<{ success: true }>({
    action: 'touch_filing',
    credentialId,
    filingDate,
  });
};
