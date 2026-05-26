/**
 * Accessibility preferences — derived from explicit a11y.preference_set
 * events. Never mutates numeric outputs; only swaps copy bundles & sizing.
 */
import type { AsbEventRow } from "@/hooks/useAsbTimeline";

export interface A11yPrefs {
  simplifyText: boolean;
  highContrast: boolean;
  reduceMotion: boolean;
}

const DEFAULTS: A11yPrefs = {
  simplifyText: false,
  highContrast: false,
  reduceMotion: false,
};

export function deriveA11yPrefs(rows: AsbEventRow[] | undefined): A11yPrefs {
  if (!rows) return DEFAULTS;
  const latest = rows
    .filter((r) => r.topic_id === "a11y.preference_set")
    .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))[0];
  if (!latest) return DEFAULTS;
  const p = latest.payload as Partial<A11yPrefs> | undefined;
  return {
    simplifyText: p?.simplifyText ?? DEFAULTS.simplifyText,
    highContrast: p?.highContrast ?? DEFAULTS.highContrast,
    reduceMotion: p?.reduceMotion ?? DEFAULTS.reduceMotion,
  };
}
