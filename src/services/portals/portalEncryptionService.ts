/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const encryptPassword = (password: string): string => {
  void password;
  throw new Error('Client-side encryption is disabled. Use portal-secrets edge function.');
};

export const decryptPassword = (encrypted: string): string => {
  void encrypted;
  throw new Error('Client-side decryption is disabled. Use portal-secrets edge function.');
};
