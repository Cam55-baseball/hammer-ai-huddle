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
  progression_level?: number;   // 1-7
  sport_modifier?: number;      // default 1.0
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
  userLevel?: number; // 1-7 progression level
}

export interface ScoreBreakdown {
  skillMatch: number;      // 0-60
  tagRelevance: number;    // 0-45
  difficultyFit: number;   // 0-15
  variety: number;         // 0-15
  positionMatch: number;   // 0-20
  errorTypeMatch: number;  // 0-25
  weightBonus: number;     // 0-10
  trendBonus: number;      // 0-5
  progressionFit: number;  // 0-20
  penalty: number;         // -20 to 0
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

/* ── Helpers ────────────────────────────────────────────────── */

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
  progressionFit: 0,
  penalty: 0,
};

function sumBreakdown(b: ScoreBreakdown): number {
  return b.skillMatch + b.tagRelevance + b.difficultyFit + b.variety +
    b.positionMatch + b.errorTypeMatch + b.weightBonus + b.trendBonus +
    b.progressionFit + b.penalty;
}

function computeProgressionFit(drillLevel: number, userLevel: number): number {
  const diff = drillLevel - userLevel;
  if (diff === 0 || diff === 1) return 20;
  if (diff === -1) return 12;
  if (diff === 2) return 8;
  return 0; // too easy or too hard
}

/* ── Sport-level module modifiers ──────────────────────────── */

const SPORT_MODULE_MODIFIERS: Record<string, Record<string, number>> = {
  baseball: { fielding: 1.1, throwing: 1.05, hitting: 1.0, pitching: 1.0, baserunning: 1.0 },
  softball: { fielding: 1.15, hitting: 1.1, throwing: 1.0, pitching: 1.0, baserunning: 1.0 },
};

function getSportModuleModifier(sport: string, module: string): number {
  const sportMods = SPORT_MODULE_MODIFIERS[sport];
  if (!sportMods) return 1.0;
  return sportMods[module] ?? 1.0;
}

/* ── Weakness ranking ──────────────────────────────────────── */

interface RankedWeakness extends WeaknessInput {
  rankMultiplier: number;
}

const RANK_MULTIPLIERS = [1.5, 1.3, 1.1];

/**
 * Sort weaknesses by severity (lowest score = worst) and assign
 * rank multipliers so the most critical weaknesses weigh more.
 */
export function rankWeaknesses(weaknesses: WeaknessInput[]): RankedWeakness[] {
  const sorted = [...weaknesses].sort((a, b) => a.score - b.score);
  return sorted.map((w, i) => ({
    ...w,
    rankMultiplier: i < RANK_MULTIPLIERS.length ? RANK_MULTIPLIERS[i] : 1.0,
  }));
}

/* ── Negative penalty computation ──────────────────────────── */

function computePenalty(
  drill: DrillInput,
  position: string | undefined,
  usageMap: Map<string, DrillUsageStats>,
): number {
  let penalty = 0;

  const usage = usageMap.get(drill.id);

  // Overused + low success: drill isn't working
  if (usage && usage.useCount >= 10 && usage.avgSuccessRating < 2.5) {
    penalty -= 15;
  }
  // Stale: mediocre returns
  else if (usage && usage.useCount >= 8 && usage.avgSuccessRating >= 2.5 && usage.avgSuccessRating <= 3.5) {
    penalty -= 8;
  }

  // Wrong-position penalty: drill has positions but NONE match player
  if (position && drill.positions && drill.positions.length > 0) {
    const normalizedPosition = normalizeStr(position);
    const hasMatch = drill.positions.some(p => normalizeStr(p) === normalizedPosition);
    if (!hasMatch) {
      penalty -= 10;
    }
  }

  return Math.max(-20, penalty);
}

/* ── Per-drill scoring ─────────────────────────────────────── */

function scoreDrillAgainstInput(
  drill: DrillInput,
  rankedWeaknesses: RankedWeakness[],
  detectedIssues: string[],
  position: string | undefined,
  usageMap: Map<string, DrillUsageStats>,
  userLevel: number | undefined,
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
    if (drill.ai_context && normalizeStr(drill.ai_context).includes(normalizedIssue)) {
      breakdown.errorTypeMatch = Math.max(breakdown.errorTypeMatch, 15);
      if (!matchReasons.some(r => r.includes(issue))) {
        matchReasons.push(`ai context matches ${issue}`);
      }
    }
  }

  // --- Skill match from ranked weaknesses ---
  for (const w of rankedWeaknesses) {
    const normalizedArea = normalizeStr(w.area);
    const urgency = Math.max(0, 100 - w.score) / 100;
    const weighted = urgency * w.rankMultiplier;

    if (drill.skill_target && normalizeStr(drill.skill_target) === normalizedArea) {
      const pts = Math.round(40 * weighted);
      if (pts > breakdown.skillMatch) {
        breakdown.skillMatch = pts;
        matchReasons.push(`targets ${w.area}`);
      }
    }

    for (const tag of drill.tags) {
      if (normalizeStr(tag) === normalizedArea) {
        const pts = Math.round(30 * weighted);
        if (pts > breakdown.tagRelevance) {
          breakdown.tagRelevance = pts;
        }
        break;
      }
    }

    if (drill.ai_context && normalizeStr(drill.ai_context).includes(normalizedArea)) {
      breakdown.tagRelevance = Math.max(
        breakdown.tagRelevance,
        Math.round(20 * weighted),
      );
    }
  }

  // --- Position matching (strict: empty positions = no match) ---
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

  // --- Weight bonus ---
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

  // --- Progression fit ---
  if (userLevel != null && drill.progression_level != null) {
    breakdown.progressionFit = computeProgressionFit(drill.progression_level, userLevel);
    if (breakdown.progressionFit >= 20) {
      matchReasons.push('optimal level match');
    }
  }

  // --- Trend bonus ---
  const usage = usageMap.get(drill.id);
  if (usage && usage.useCount >= 3 && usage.avgSuccessRating > 4) {
    breakdown.trendBonus = 5;
    matchReasons.push('high success rate');
  }

  // --- Negative penalties ---
  breakdown.penalty = computePenalty(drill, position, usageMap);
  if (breakdown.penalty <= -15) {
    matchReasons.push('penalized: overused with low success');
  } else if (breakdown.penalty <= -10) {
    matchReasons.push('penalized: position mismatch');
  } else if (breakdown.penalty <= -8) {
    matchReasons.push('penalized: stale drill');
  }

  return { breakdown, matchReasons };
}

/* ── Main recommendation function ──────────────────────────── */

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
    userLevel,
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
    // Fallback: filter by position (strict) and progression level
    let fallbackDrills = [...eligible];

    if (position) {
      // Strict: only drills that explicitly list this position
      const posFiltered = fallbackDrills.filter(d =>
        d.positions && d.positions.length > 0 &&
        d.positions.some(p => normalizeStr(p) === normalizeStr(position))
      );
      // If none match, THEN include drills with no positions as generic fallback
      if (posFiltered.length > 0) {
        fallbackDrills = posFiltered;
      }
    }

    if (userLevel != null) {
      const levelFiltered = fallbackDrills.filter(d => {
        const dl = d.progression_level ?? 4;
        const diff = dl - userLevel;
        return diff >= -1 && diff <= 2;
      });
      if (levelFiltered.length > 0) fallbackDrills = levelFiltered;
    }

    const fallback = fallbackDrills
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 10)
      .map((drill) => ({
        drill,
        score: 0,
        breakdown: { ...EMPTY_BREAKDOWN },
        locked: !userHasPremium,
        matchReasons: [] as string[],
      }));
    return { recommended: fallback, fallbackUsed: true };
  }

  // Rank weaknesses by severity
  const ranked = rankWeaknesses(weaknesses);

  // First pass: score without variety
  const preScored = eligible.map((drill) => {
    const { breakdown, matchReasons } = scoreDrillAgainstInput(
      drill, ranked, detectedIssues, position, usageMap, userLevel,
    );
    return { drill, breakdown, matchReasons };
  });

  // Sort by pre-variety score desc, then name for determinism
  preScored.sort((a, b) => {
    const scoreA = sumBreakdown(a.breakdown) - a.breakdown.variety;
    const scoreB = sumBreakdown(b.breakdown) - b.breakdown.variety;
    return scoreB - scoreA || a.drill.name.localeCompare(b.drill.name);
  });

  // Second pass: apply variety bonus + sport module modifier
  const seenModules = new Set<string>();
  const scored: ScoredDrill[] = [];

  for (const item of preScored) {
    const varietyBonus = seenModules.has(item.drill.module) ? 0 : 15;
    seenModules.add(item.drill.module);

    const finalBreakdown: ScoreBreakdown = { ...item.breakdown, variety: varietyBonus };
    const drillSportMod = item.drill.sport_modifier ?? 1.0;
    const moduleMod = getSportModuleModifier(sport, item.drill.module);
    const rawScore = sumBreakdown(finalBreakdown);
    const finalScore = Math.max(0, Math.round(rawScore * drillSportMod * moduleMod));

    scored.push({
      drill: item.drill,
      score: finalScore,
      breakdown: finalBreakdown,
      locked: !userHasPremium,
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
