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
  positions?: string[];
  tagWeights?: Record<string, number>;
  video_url?: string | null;
  description?: string | null;
  is_published?: boolean;
  subscription_tier_required?: string;
}

export interface WeaknessInput {
  area: string;
  score: number; // 0-100, lower = weaker
  metric?: string;
}

export interface DrillUsageStats {
  drillId: string;
  useCount: number;
  avgSuccessRating: number; // 0-5
}

export interface RecommendationInput {
  drills: DrillInput[];
  weaknesses: WeaknessInput[];
  sport: string;
  userHasPremium: boolean;
  excludeDrillIds?: string[];
  position?: string;
  detectedIssues?: string[];
  usageStats?: DrillUsageStats[];
}

export interface ScoreBreakdown {
  skillMatch: number;      // 0-40
  tagRelevance: number;    // 0-30
  difficultyFit: number;   // 0-15
  variety: number;         // 0-15
  positionMatch: number;   // 0-20
  errorTypeMatch: number;  // 0-25
  weightBonus: number;     // 0-10
  trendBonus: number;      // 0-5
}

export interface ScoredDrill {
  drill: DrillInput;
  score: number;
  breakdown: ScoreBreakdown;
  locked: boolean;
  matchReasons: string[];
}

export interface RecommendationOutput {
  recommended: ScoredDrill[];
  fallbackUsed: boolean;
}

function normalizeStr(s: string): string {
  return s.toLowerCase().replace(/[_\-\s]+/g, '');
}

const EMPTY_BREAKDOWN: ScoreBreakdown = {
  skillMatch: 0,
  tagRelevance: 0,
  difficultyFit: 0,
  variety: 0,
  positionMatch: 0,
  errorTypeMatch: 0,
  weightBonus: 0,
  trendBonus: 0,
};

function sumBreakdown(b: ScoreBreakdown): number {
  return b.skillMatch + b.tagRelevance + b.difficultyFit + b.variety +
    b.positionMatch + b.errorTypeMatch + b.weightBonus + b.trendBonus;
}

function scoreDrillAgainstInput(
  drill: DrillInput,
  weaknesses: WeaknessInput[],
  detectedIssues: string[],
  position: string | undefined,
  usageMap: Map<string, DrillUsageStats>,
): { breakdown: ScoreBreakdown; matchReasons: string[] } {
  const breakdown = { ...EMPTY_BREAKDOWN };
  const matchReasons: string[] = [];

  // --- Error type matching (from detected issues) ---
  for (const issue of detectedIssues) {
    const normalizedIssue = normalizeStr(issue);
    for (const tag of drill.tags) {
      if (normalizeStr(tag) === normalizedIssue) {
        const weight = drill.tagWeights?.[tag] ?? 1;
        const pts = Math.min(25, 5 * weight);
        if (pts > breakdown.errorTypeMatch) {
          breakdown.errorTypeMatch = pts;
        }
        matchReasons.push(`matches ${issue}`);
        break;
      }
    }
    // Also check ai_context
    if (drill.ai_context && normalizeStr(drill.ai_context).includes(normalizedIssue)) {
      breakdown.errorTypeMatch = Math.max(breakdown.errorTypeMatch, 15);
      if (!matchReasons.some(r => r.includes(issue))) {
        matchReasons.push(`ai context matches ${issue}`);
      }
    }
  }

  // --- Skill match from weaknesses ---
  for (const w of weaknesses) {
    const normalizedArea = normalizeStr(w.area);
    const urgency = Math.max(0, 100 - w.score) / 100;

    if (drill.skill_target && normalizeStr(drill.skill_target) === normalizedArea) {
      const pts = Math.round(40 * urgency);
      if (pts > breakdown.skillMatch) {
        breakdown.skillMatch = pts;
        matchReasons.push(`targets ${w.area}`);
      }
    }

    for (const tag of drill.tags) {
      if (normalizeStr(tag) === normalizedArea) {
        const pts = Math.round(30 * urgency);
        if (pts > breakdown.tagRelevance) {
          breakdown.tagRelevance = pts;
        }
        break;
      }
    }

    if (drill.ai_context && normalizeStr(drill.ai_context).includes(normalizedArea)) {
      breakdown.tagRelevance = Math.max(breakdown.tagRelevance, Math.round(20 * urgency));
    }
  }

  // --- Position matching ---
  if (position && drill.positions && drill.positions.length > 0) {
    const normalizedPosition = normalizeStr(position);
    for (const p of drill.positions) {
      if (normalizeStr(p) === normalizedPosition) {
        breakdown.positionMatch = 20;
        matchReasons.push(`position match: ${position}`);
        break;
      }
    }
  }

  // --- Weight bonus (average of all tag weights above 1) ---
  if (drill.tagWeights) {
    const weights = Object.values(drill.tagWeights);
    const aboveOne = weights.filter(w => w > 1);
    if (aboveOne.length > 0) {
      const avgWeight = aboveOne.reduce((a, b) => a + b, 0) / aboveOne.length;
      breakdown.weightBonus = Math.min(10, Math.round(avgWeight * 2));
    }
  }

  // --- Difficulty fit ---
  breakdown.difficultyFit = Math.min(15, (drill.difficulty_levels?.length ?? 0) * 5);

  // --- Trend bonus ---
  const usage = usageMap.get(drill.id);
  if (usage && usage.useCount >= 3 && usage.avgSuccessRating > 4) {
    breakdown.trendBonus = 5;
    matchReasons.push('high success rate');
  }

  return { breakdown, matchReasons };
}

export function computeDrillRecommendations(
  input: RecommendationInput,
): RecommendationOutput {
  const {
    drills,
    weaknesses,
    sport,
    userHasPremium,
    excludeDrillIds = [],
    position,
    detectedIssues = [],
    usageStats = [],
  } = input;

  if (!drills || drills.length === 0) {
    return { recommended: [], fallbackUsed: true };
  }

  const excludeSet = new Set(excludeDrillIds);
  const usageMap = new Map(usageStats.map(u => [u.drillId, u]));

  const eligible = drills.filter(
    (d) => d.is_active && d.sport === sport && !excludeSet.has(d.id),
  );

  if (eligible.length === 0) {
    return { recommended: [], fallbackUsed: true };
  }

  const hasInput = (weaknesses && weaknesses.length > 0) || detectedIssues.length > 0;

  if (!hasInput) {
    const fallback = [...eligible]
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 10)
      .map((drill) => ({
        drill,
        score: 0,
        breakdown: { ...EMPTY_BREAKDOWN },
        locked: drill.premium && !userHasPremium,
        matchReasons: [] as string[],
      }));
    return { recommended: fallback, fallbackUsed: true };
  }

  // First pass: score without variety
  const preScored = eligible.map((drill) => {
    const { breakdown, matchReasons } = scoreDrillAgainstInput(
      drill, weaknesses, detectedIssues, position, usageMap,
    );
    return { drill, breakdown, matchReasons };
  });

  // Sort by pre-variety score desc, then name for determinism
  preScored.sort((a, b) => {
    const scoreA = sumBreakdown(a.breakdown) - a.breakdown.variety;
    const scoreB = sumBreakdown(b.breakdown) - b.breakdown.variety;
    return scoreB - scoreA || a.drill.name.localeCompare(b.drill.name);
  });

  // Second pass: apply variety bonus
  const seenModules = new Set<string>();
  const scored: ScoredDrill[] = [];

  for (const item of preScored) {
    const varietyBonus = seenModules.has(item.drill.module) ? 0 : 15;
    seenModules.add(item.drill.module);

    const finalBreakdown: ScoreBreakdown = { ...item.breakdown, variety: varietyBonus };
    const finalScore = sumBreakdown(finalBreakdown);

    scored.push({
      drill: item.drill,
      score: finalScore,
      breakdown: finalBreakdown,
      locked: item.drill.premium && !userHasPremium,
      matchReasons: item.matchReasons,
    });
  }

  scored.sort((a, b) => b.score - a.score || a.drill.name.localeCompare(b.drill.name));

  const hasAnyMatch = scored.some(
    (s) => s.breakdown.skillMatch > 0 || s.breakdown.tagRelevance > 0 || s.breakdown.errorTypeMatch > 0,
  );

  if (!hasAnyMatch) {
    return { recommended: scored.slice(0, 10), fallbackUsed: true };
  }

  return { recommended: scored.slice(0, 10), fallbackUsed: false };
}
