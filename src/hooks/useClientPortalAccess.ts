/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useState, useMemo } from 'react';
import {
  PortalCredentialSummary,
  canUsePortalLauncher,
  getClientPortalCredentials,
  launchPortal,
} from '../services/portalLauncherService';
import { UserMetadata } from '../context/AuthContext';

/**
 * Hook to manage portal access, credentials, and launching
 */
export const useClientPortalAccess = (
  clientId: string | undefined,
  userId: string | undefined,
  user: UserMetadata | null,
  activeTab: string
) => {
  const [portalCredentials, setPortalCredentials] = useState<PortalCredentialSummary[]>([]);
  const [portalLoading, setPortalLoading] = useState(false);

  const loadPortalCredentials = useCallback(async () => {
    if (!clientId) return;
    setPortalLoading(true);
    try {
      const creds = await getClientPortalCredentials(clientId);
      setPortalCredentials(creds);
    } catch (error) {
      console.error('Failed to load portal credentials:', error);
    } finally {
      setPortalLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    if (activeTab === 'portal' && clientId) {
      loadPortalCredentials();
    }
  }, [activeTab, clientId, loadPortalCredentials]);

  const canUsePortal = useMemo(() => canUsePortalLauncher(user), [user]);

  const handleLaunchPortal = useCallback(
    async (credentialId: string) => {
      if (!user || !clientId || !canUsePortal) return;
      const result = await launchPortal(credentialId, user, clientId);
      window.open(result.url, '_blank');
    },
    [canUsePortal, clientId, user]
  );

  return {
    portalCredentials,
    portalLoading,
    canUsePortal,
    handleLaunchPortal,
  };
};
