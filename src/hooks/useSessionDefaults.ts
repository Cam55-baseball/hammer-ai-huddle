import { useCallback } from 'react';

const STORAGE_KEY = 'session_defaults';

export interface SessionDefaults {
  rep_source?: string;
  pitch_distance_ft?: number;
  velocity_band?: string;
  season_context?: string;
  handedness?: 'L' | 'R';
}

/**
 * Persists and retrieves last-used session settings per module from localStorage.
 * Allows athletes to skip re-entering the same config each session.
 */
export function useSessionDefaults(module: string) {
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

  const getHandedness = useCallback((): 'L' | 'R' | undefined => {
    try {
      const raw = localStorage.getItem('session_handedness');
      return raw as 'L' | 'R' | undefined;
    } catch {
      return undefined;
    }
  }, []);

  const saveHandedness = useCallback((hand: 'L' | 'R') => {
    try {
      localStorage.setItem('session_handedness', hand);
    } catch {}
  }, []);

  return { getDefaults, saveDefaults, getHandedness, saveHandedness };
}
