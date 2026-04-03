import { useCallback, useRef } from 'react';

const STORAGE_KEY = 'insight_history';
const MAX_ENTRIES = 5;

interface HistoryEntry {
  focusMetric: string;
  date: string;
}

function readHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_ENTRIES) : [];
  } catch {
    return [];
  }
}

function writeHistory(entries: HistoryEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    // localStorage unavailable — silent fail
  }
}

/**
 * Lightweight repetition detection for post-session insights.
 * Tracks the last 5 focus metrics in localStorage.
 * Returns an offset (0-2) to shift phrasing variation when the same focus repeats.
 */
export function useInsightHistory() {
  const historyRef = useRef<HistoryEntry[] | null>(null);

  const getHistory = useCallback((): HistoryEntry[] => {
    if (historyRef.current === null) {
      historyRef.current = readHistory();
    }
    return historyRef.current;
  }, []);

  const getVariationOffset = useCallback((focusMetric: string | null): number => {
    if (!focusMetric) return 0;
    const history = getHistory();
    // Count consecutive occurrences of the same focus metric (most recent first)
    let consecutive = 0;
    for (const entry of history) {
      if (entry.focusMetric === focusMetric) {
        consecutive++;
      } else {
        break;
      }
    }
    return consecutive % 3; // cycle through 3 variations
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
    writeHistory(updated);
  }, [getHistory]);

  return { getVariationOffset, recordFocus };
}
