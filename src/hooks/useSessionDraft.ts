import { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from 'react';

type StoredDraft<T> = {
  savedAt: number;
  value: T;
};

const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

export const readSessionDraft = <T,>(key: string, fallback: T): T => {
  if (!key || typeof window === 'undefined') return fallback;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as StoredDraft<T>;
    if (!parsed || typeof parsed.savedAt !== 'number' || Date.now() - parsed.savedAt > DRAFT_TTL_MS) {
      window.sessionStorage.removeItem(key);
      return fallback;
    }
    return parsed.value ?? fallback;
  } catch {
    window.sessionStorage.removeItem(key);
    return fallback;
  }
};

export const writeSessionDraft = <T,>(key: string, value: T) => {
  if (!key || typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), value } satisfies StoredDraft<T>));
  } catch {
    // A full storage quota must never interrupt the user's data entry.
  }
};

export const clearSessionDraft = (key: string) => {
  if (!key || typeof window === 'undefined') return;
  window.sessionStorage.removeItem(key);
};

export const hasSessionDraft = (key: string) => {
  if (!key || typeof window === 'undefined') return false;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as Partial<StoredDraft<unknown>>;
    if (typeof parsed.savedAt !== 'number' || Date.now() - parsed.savedAt > DRAFT_TTL_MS) {
      window.sessionStorage.removeItem(key);
      return false;
    }
    return true;
  } catch {
    window.sessionStorage.removeItem(key);
    return false;
  }
};

export const useSessionDraft = <T,>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>, () => void] => {
  const initialRef = useRef(initialValue);
  const [value, setValue] = useState<T>(() => readSessionDraft(key, initialRef.current));

  useEffect(() => {
    setValue(readSessionDraft(key, initialRef.current));
  }, [key]);

  useEffect(() => {
    writeSessionDraft(key, value);
  }, [key, value]);

  const clear = useCallback(() => {
    clearSessionDraft(key);
    setValue(initialRef.current);
  }, [key]);

  return [value, setValue, clear];
};
