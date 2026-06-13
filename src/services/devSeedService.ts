/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { isDevMode } from '../lib/devMode';

export const seedDevelopmentUsers = async (): Promise<{ success: boolean; message: string }> => {
  if (!isDevMode()) {
    return { success: false, message: 'Seed only runs in development mode' };
  }
  return {
    success: false,
    message: 'Client-side user seeding is disabled for security. Use secure server-side scripts or Supabase admin tooling.',
  };
};

export const checkDevUsersExist = async (): Promise<boolean> => {
  return false;
};
