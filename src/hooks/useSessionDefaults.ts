import { useCallback } from 'react';

const STORAGE_KEY = 'session_defaults';

export interface SessionDefaults {
  rep_source?: string;
  pitch_distance_ft?: number;
  velocity_band?: string;
  season_context?: string;
  handedness?: 'L' | 'R';
  duration_minutes?: number;
  rpe?: number;
  module?: string;
  [key: string]: unknown;
}

/**
 * Persists last-used session settings per module in localStorage.
 * Backwards compatible single-module API; also exposes a multi-module
 * accessor (`getAllDefaults` / `saveModuleDefaults`).
 */
export function useSessionDefaults(module: string = 'global') {
  const key = `${STORAGE_KEY}_${module}`;

  const getDefaults = useCallback((): SessionDefaults => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }, [key]);

  const saveDefaults = useCallback((defaults: SessionDefaults) => {
    try {
      localStorage.setItem(key, JSON.stringify(defaults));
    } catch {}
  }, [key]);

  const getAllDefaults = useCallback((): Record<string, SessionDefaults> => {
    const out: Record<string, SessionDefaults> = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(`${STORAGE_KEY}_`)) {
          const mod = k.slice(STORAGE_KEY.length + 1);
          const raw = localStorage.getItem(k);
          if (raw) out[mod] = JSON.parse(raw);
        }
      }
    } catch {}
    return out;
  }, []);

  const saveModuleDefaults = useCallback((mod: string, defaults: SessionDefaults) => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_${mod}`, JSON.stringify(defaults));
    } catch {}
  }, []);

  return { getDefaults, saveDefaults, getAllDefaults, saveModuleDefaults };
}
