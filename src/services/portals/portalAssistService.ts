/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User } from '../../types';
import { GovernmentPortalConfig } from '../governmentPortalService';
import { revealPortalCredential } from './portalAccessService';

const BRIDGE_TIMEOUT_MS = 1_500;

type BridgeStatus = {
  requestId: string;
  ok: boolean;
  error?: string;
};

const waitForBridgeEvent = <T extends { requestId: string }>(
  eventName: string,
  requestId: string,
  timeoutMs = BRIDGE_TIMEOUT_MS,
): Promise<T | null> => new Promise((resolve) => {
  let timeoutId = 0;
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<T>).detail;
    if (!detail || detail.requestId !== requestId) return;
    window.clearTimeout(timeoutId);
    document.removeEventListener(eventName, listener);
    resolve(detail);
  };
  document.addEventListener(eventName, listener);
  timeoutId = window.setTimeout(() => {
    document.removeEventListener(eventName, listener);
    resolve(null);
  }, timeoutMs);
});

export const isPortalAssistInstalled = async (): Promise<boolean> => {
  const requestId = crypto.randomUUID();
  const response = waitForBridgeEvent<BridgeStatus>('caath:portal-assist-pong', requestId, 700);
  document.dispatchEvent(new CustomEvent('caath:portal-assist-ping', { detail: { requestId } }));
  return Boolean(await response);
};

export const launchPortalWithAutofill = async (params: {
  credentialId: string;
  portal: GovernmentPortalConfig;
  user: User;
}): Promise<{ launched: boolean; extensionInstalled: boolean; message: string }> => {
  if (!await isPortalAssistInstalled()) {
    return {
      launched: false,
      extensionInstalled: false,
      message: 'CAATH Portal Assist is not installed in this browser.',
    };
  }

  const secret = await revealPortalCredential(params.credentialId, params.user, 'Assisted portal login');
  const requestId = crypto.randomUUID();
  const response = waitForBridgeEvent<BridgeStatus>('caath:portal-autofill-status', requestId, 2_500);

  document.dispatchEvent(new CustomEvent('caath:portal-autofill-request', {
    detail: {
      requestId,
      portalType: params.portal.type,
      portalUrl: params.portal.officialUrl,
      username: secret.username,
      password: secret.password,
      expiresAt: Date.now() + 60_000,
    },
  }));

  const status = await response;
  secret.username = '';
  secret.password = '';

  if (!status?.ok) {
    return {
      launched: false,
      extensionInstalled: true,
      message: status?.error || 'The portal assistant could not open the official portal.',
    };
  }

  return {
    launched: true,
    extensionInstalled: true,
    message: 'Official portal opened. CAATH will fill the login fields; complete CAPTCHA or OTP and click Login.',
  };
};
