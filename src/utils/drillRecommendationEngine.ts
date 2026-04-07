/**
 * Pure, deterministic drill recommendation engine.
 * Zero side effects — same input always produces the same output.
 */

export interface DrillInput {
  id: string;
  name: string;
  module: string;
  sport: string;
  skill_target: string | null;
  premium: boolean;
  is_active: boolean;
  tags: string[];
  ai_context: string | null;
  difficulty_levels: string[];
}

export interface WeaknessInput {
  area: string;
  score: number; // 0-100, lower = weaker
  metric?: string;
}

export interface RecommendationInput {
  drills: DrillInput[];
  weaknesses: WeaknessInput[];
  sport: string;
  userHasPremium: boolean;
  excludeDrillIds?: string[];
}

export interface ScoreBreakdown {
  skillMatch: number;     // 0-40
  tagRelevance: number;   // 0-30
  difficultyFit: number;  // 0-15
  variety: number;        // 0-15
}

export interface ScoredDrill {
  drill: DrillInput;
  score: number;
  breakdown: ScoreBreakdown;
  locked: boolean;
}

export interface RecommendationOutput {
  recommended: ScoredDrill[];
  fallbackUsed: boolean;
}

function normalizeStr(s: string): string {
  return s.toLowerCase().replace(/[_\-\s]+/g, '');
}

function scoreDrillAgainstWeaknesses(
  drill: DrillInput,
  weaknesses: WeaknessInput[],
  seenModules: Set<string>,
): { total: number; breakdown: ScoreBreakdown } {
  let skillMatch = 0;
  let tagRelevance = 0;

  for (const w of weaknesses) {
    const normalizedArea = normalizeStr(w.area);
    const urgency = Math.max(0, 100 - w.score) / 100; // 1.0 when score=0, 0.0 when score=100

    // Skill target match: up to 40 pts
    if (drill.skill_target && normalizeStr(drill.skill_target) === normalizedArea) {
      skillMatch = Math.max(skillMatch, Math.round(40 * urgency));
    }

    // Tag relevance: up to 30 pts
    for (const tag of drill.tags) {
      if (normalizeStr(tag) === normalizedArea) {
        tagRelevance = Math.max(tagRelevance, Math.round(30 * urgency));
        break;
      }
    }

    // Also check ai_context for keyword match
    if (drill.ai_context && normalizeStr(drill.ai_context).includes(normalizedArea)) {
      tagRelevance = Math.max(tagRelevance, Math.round(20 * urgency));
    }
  }

  // Difficulty fit: more difficulty levels = more versatile = higher score (up to 15)
  const difficultyFit = Math.min(15, (drill.difficulty_levels?.length ?? 0) * 5);

  // Module variety: bonus if this module hasn't been seen yet (up to 15)
  const variety = seenModules.has(drill.module) ? 0 : 15;

  const total = skillMatch + tagRelevance + difficultyFit + variety;
  return { total, breakdown: { skillMatch, tagRelevance, difficultyFit, variety } };
}

export function computeDrillRecommendations(
  input: RecommendationInput,
): RecommendationOutput {
  const { drills, weaknesses, sport, userHasPremium, excludeDrillIds = [] } = input;

  // Empty drills → safe return
  if (!drills || drills.length === 0) {
    return { recommended: [], fallbackUsed: true };
  }

  const excludeSet = new Set(excludeDrillIds);

  // Filter: correct sport, active, not excluded
  const eligible = drills.filter(
    (d) =>
      d.is_active &&
      d.sport === sport &&
      !excludeSet.has(d.id),
  );

  if (eligible.length === 0) {
    return { recommended: [], fallbackUsed: true };
  }

  // If no weaknesses provided, return fallback (sorted by name, deterministic)
  if (!weaknesses || weaknesses.length === 0) {
    const fallback = [...eligible]
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 10)
      .map((drill) => ({
        drill,
        score: 0,
        breakdown: { skillMatch: 0, tagRelevance: 0, difficultyFit: 0, variety: 0 },
        locked: drill.premium && !userHasPremium,
      }));
    return { recommended: fallback, fallbackUsed: true };
  }

  // Score each drill
  const seenModules = new Set<string>();
  const scored: ScoredDrill[] = [];

  // First pass: compute scores without variety bonus to get initial ranking
  const preScored = eligible.map((drill) => {
    const { total, breakdown } = scoreDrillAgainstWeaknesses(drill, weaknesses, new Set());
    return { drill, total, breakdown };
  });

  // Sort by score (without variety) descending, then by name for determinism
  preScored.sort((a, b) => b.total - a.total || a.drill.name.localeCompare(b.drill.name));

  // Second pass: apply variety bonus in ranked order
  for (const item of preScored) {
    const varietyBonus = seenModules.has(item.drill.module) ? 0 : 15;
    seenModules.add(item.drill.module);

    const finalScore = item.total + varietyBonus;
    const finalBreakdown: ScoreBreakdown = {
      ...item.breakdown,
      variety: varietyBonus,
    };

    scored.push({
      drill: item.drill,
      score: finalScore,
      breakdown: finalBreakdown,
      locked: item.drill.premium && !userHasPremium,
    });
  }

  // Re-sort by final score descending, name for determinism
  scored.sort((a, b) => b.score - a.score || a.drill.name.localeCompare(b.drill.name));

  const hasAnyMatch = scored.some((s) => s.breakdown.skillMatch > 0 || s.breakdown.tagRelevance > 0);

  if (!hasAnyMatch) {
    // No meaningful matches — return as fallback
    return { recommended: scored.slice(0, 10), fallbackUsed: true };
  }

  return { recommended: scored.slice(0, 10), fallbackUsed: false };
}
