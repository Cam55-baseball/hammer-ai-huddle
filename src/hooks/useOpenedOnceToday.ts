/**
 * useOpenedOnceToday — makes a card "glow" (visually pulse) until it is
 * opened for the first time on the current calendar day. Persists the
 * "opened" flag per-id in localStorage under `hammer.today.glow.<id>.<YYYY-MM-DD>`.
 *
 * Presentation-only. Never authors organism truth.
 */
import { useCallback, useEffect, useState } from "react";

function todayKey(id: string): string {
  const day = new Date().toISOString().slice(0, 10);
  return `hammer.today.glow.${id}.${day}`;
}

export function useOpenedOnceToday(id: string): {
  shouldGlow: boolean;
  markOpened: () => void;
} {
  const [opened, setOpened] = useState<boolean>(() => {
    try {
      return localStorage.getItem(todayKey(id)) === "1";
    } catch {
      return false;
    }
  });

  // Re-read on id change (day rollover / different card)
  useEffect(() => {
    try {
      setOpened(localStorage.getItem(todayKey(id)) === "1");
    } catch {
      /* ignore */
    }
  }, [id]);

  const markOpened = useCallback(() => {
    if (opened) return;
    try {
      localStorage.setItem(todayKey(id), "1");
    } catch {
      /* ignore */
    }
    setOpened(true);
  }, [id, opened]);

  return { shouldGlow: !opened, markOpened };
}
