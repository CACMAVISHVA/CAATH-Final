/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const DRAFT_VERSION = 1;
const DEFAULT_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1_000;

type StoredDraft<T> = {
  version: number;
  savedAt: string;
  value: T;
};

export const readFormDraft = <T>(key: string, maxAgeMs = DEFAULT_MAX_AGE_MS): T | null => {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredDraft<T>;
    const savedAt = new Date(parsed.savedAt).getTime();
    if (parsed.version !== DRAFT_VERSION || !Number.isFinite(savedAt) || Date.now() - savedAt > maxAgeMs) {
      window.localStorage.removeItem(key);
      return null;
    }
    return parsed.value;
  } catch {
    window.localStorage.removeItem(key);
    return null;
  }
};

export const saveFormDraft = <T>(key: string, value: T): void => {
  const payload: StoredDraft<T> = {
    version: DRAFT_VERSION,
    savedAt: new Date().toISOString(),
    value,
  };
  window.localStorage.setItem(key, JSON.stringify(payload));
};

export const clearFormDraft = (key: string): void => {
  window.localStorage.removeItem(key);
};
