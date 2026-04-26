/**
 * Localstorage-backed owner UI prefs. No DB calls.
 * Currently: Fast Mode toggle. Add more keys here as needed.
 */
import { useEffect, useState, useCallback } from 'react';

const FAST_MODE_KEY = 'hammer.owner.fastMode';

function readBool(key: string, def = false): boolean {
  if (typeof window === 'undefined') return def;
  try {
    const v = window.localStorage.getItem(key);
    return v === null ? def : v === '1';
  } catch {
    return def;
  }
}

function writeBool(key: string, v: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, v ? '1' : '0');
    window.dispatchEvent(new StorageEvent('storage', { key }));
  } catch {
    /* silent */
  }
}

export function useOwnerPrefs() {
  const [fastMode, setFastModeState] = useState<boolean>(() => readBool(FAST_MODE_KEY, false));

  // Sync across tabs / components
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === FAST_MODE_KEY) setFastModeState(readBool(FAST_MODE_KEY, false));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setFastMode = useCallback((v: boolean) => {
    writeBool(FAST_MODE_KEY, v);
    setFastModeState(v);
  }, []);

  return { fastMode, setFastMode };
}
