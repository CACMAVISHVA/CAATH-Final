/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const isDevMode = (): boolean => {
  return import.meta.env.DEV;
};

export const showDevCredentials = (): boolean => {
  return import.meta.env.DEV && import.meta.env.VITE_SHOW_DEV_CREDENTIALS !== 'false';
};