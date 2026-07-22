/**
 * Canonical difficulty-level labels for the Defensive Drill Library.
 * Maps raw `difficulty_levels` values from the `drills` table to
 * skill-based labels (Beginner / Intermediate / Advanced / Expert) so the
 * UI never shows age-group labels like "Youth" or "High School".
 */

export const LEVEL_ORDER = ['beginner', 'intermediate', 'advanced', 'elite'] as const;
export type LevelKey = (typeof LEVEL_ORDER)[number];

export const LEVEL_LABELS: Record<LevelKey, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  elite: 'Expert',
};

export function normalizeLevelKey(raw: string | null | undefined): LevelKey | null {
  if (!raw) return null;
  const k = String(raw).trim().toLowerCase();
  if ((LEVEL_ORDER as readonly string[]).includes(k)) return k as LevelKey;
  // Legacy aliases
  if (k === 'expert' || k === 'pro' || k === 'professional') return 'elite';
  if (k === 'novice') return 'beginner';
  return null;
}

export function getLevelLabel(key: string | null | undefined): string {
  const k = normalizeLevelKey(key);
  return k ? LEVEL_LABELS[k] : '';
}

/** Pick the lowest present level from a drill's difficulty_levels array. */
export function getDrillLevelLabel(difficultyLevels: string[] | null | undefined): string {
  if (!difficultyLevels || difficultyLevels.length === 0) return 'All Levels';
  const present = new Set(
    difficultyLevels.map(normalizeLevelKey).filter((k): k is LevelKey => !!k),
  );
  for (const k of LEVEL_ORDER) if (present.has(k)) return LEVEL_LABELS[k];
  return 'All Levels';
}

export function drillMatchesLevels(
  difficultyLevels: string[] | null | undefined,
  selected: string[],
): boolean {
  if (selected.length === 0) return true;
  if (!difficultyLevels || difficultyLevels.length === 0) return false;
  const drillKeys = new Set(
    difficultyLevels.map(normalizeLevelKey).filter((k): k is LevelKey => !!k),
  );
  return selected.some(s => {
    const k = normalizeLevelKey(s);
    return k ? drillKeys.has(k) : false;
  });
}
