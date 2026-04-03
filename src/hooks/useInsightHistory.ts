import { useCallback, useRef } from 'react';

const LEGACY_KEY = 'insight_history';
const MAX_ENTRIES = 5;

interface HistoryEntry {
  focusMetric: string;
  date: string;
}

function storageKey(userId?: string): string {
  return userId ? `insight_history_${userId}` : LEGACY_KEY;
}

function readHistory(key: string): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_ENTRIES) : [];
  } catch {
    return [];
  }
}

function writeHistory(key: string, entries: HistoryEntry[]) {
  try {
    localStorage.setItem(key, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    // localStorage unavailable — silent fail
  }
}

/** One-time migration: move legacy shared key to scoped key, then delete legacy. */
function migrateIfNeeded(scopedKey: string) {
  try {
    if (scopedKey === LEGACY_KEY) return; // no migration needed
    const existing = localStorage.getItem(scopedKey);
    if (existing) return; // already has scoped data
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (!legacy) return; // nothing to migrate
    localStorage.setItem(scopedKey, legacy);
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    // silent
  }
}

/**
 * Lightweight repetition detection for post-session insights.
 * Tracks the last 5 focus metrics in localStorage, scoped per athlete.
 * Returns an offset (0-2) to shift phrasing variation when the same focus repeats.
 */
export function useInsightHistory(userId?: string) {
  const key = storageKey(userId);
  const historyRef = useRef<HistoryEntry[] | null>(null);
  const keyRef = useRef(key);

  // Reset cache when user changes
  if (keyRef.current !== key) {
    keyRef.current = key;
    historyRef.current = null;
  }

  const getHistory = useCallback((): HistoryEntry[] => {
    if (historyRef.current === null) {
      migrateIfNeeded(key);
      historyRef.current = readHistory(key);
    }
    return historyRef.current;
  }, [key]);

  const getVariationOffset = useCallback((focusMetric: string | null): number => {
    if (!focusMetric) return 0;
    const history = getHistory();
    let consecutive = 0;
    for (const entry of history) {
      if (entry.focusMetric === focusMetric) {
        consecutive++;
      } else {
        break;
      }
    }
    return consecutive % 3;
  }, [getHistory]);

  const recordFocus = useCallback((focusMetric: string | null, sessionDate?: string) => {
    if (!focusMetric) return;
    const history = getHistory();
    const entry: HistoryEntry = {
      focusMetric,
      date: sessionDate ?? new Date().toISOString().slice(0, 10),
    };
    const updated = [entry, ...history].slice(0, MAX_ENTRIES);
    historyRef.current = updated;
    writeHistory(key, updated);
  }, [getHistory, key]);

  return { getVariationOffset, recordFocus };
}
