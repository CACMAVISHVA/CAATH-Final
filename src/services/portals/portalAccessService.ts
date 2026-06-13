/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserRole } from '../../types';
import { invokePortalSecrets } from './portalSecretsClient';
import { getPortalCredential } from './portalCredentialService';

const PORTAL_ROLES_WITH_ACCESS: UserRole[] = ['GodAdmin', 'SuperAdmin', 'Admin', 'Staff'];

export const canUsePortalLauncher = (user: { role: string } | null | undefined): boolean =>
  Boolean(user && PORTAL_ROLES_WITH_ACCESS.includes(user.role as UserRole));

export const assertPortalCredentialAccess = (user: { role: string } | null | undefined) => {
  if (!canUsePortalLauncher(user)) {
    throw new Error('Insufficient privileges to manage portal credentials.');
  }
};

export const revealPassword = async (
  credentialId: string,
  user: { id: string; name: string; role: string },
): Promise<string> => {
  assertPortalCredentialAccess(user);
  const result = await invokePortalSecrets<{ credentialId: string; username: string; password: string }>({
    action: 'reveal',
    credentialId,
  });
  return result.password;
};

export const validatePortalAccess = async (
  credentialId: string,
  user?: { role: string }
): Promise<boolean> => {
  if (user && !canUsePortalLauncher(user as { role: string })) return false;
  const credential = await getPortalCredential(credentialId);
  return Boolean(credential);
};
