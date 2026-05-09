/**
 * Foundation video class — long-form A–Z philosophy / mechanics primer / mental framework.
 * Distinct from the per-rep "application" recommendation pipeline.
 *
 * Source of truth for:
 *  - chip vocabularies (owner-side tagging)
 *  - trigger keys (athlete-side surfacing)
 *  - foundation_meta JSON shape stored on library_videos
 *  - parallel scorer used by Hammer / VideoLibrary shelf
 */

export const FOUNDATION_DOMAINS = [
  'hitting',
  'pitching',
  'throwing',
  'fielding',
  'base_running',
  'mental_game',
  'strength',
  'nutrition',
  'regulation',
] as const;
export type FoundationDomain = (typeof FOUNDATION_DOMAINS)[number];

export const FOUNDATION_SCOPES = [
  'philosophy_a_to_z',
  'mechanics_primer',
  'mental_framework',
  'strategy_iq',
  'lifestyle_habits',
] as const;
export type FoundationScope = (typeof FOUNDATION_SCOPES)[number];

export const FOUNDATION_AUDIENCES = [
  'new_to_sport',
  'beginner',
  'intermediate',
  'advanced',
  'all_levels',
] as const;
export type FoundationAudience = (typeof FOUNDATION_AUDIENCES)[number];

export const FOUNDATION_TRIGGERS = [
  'new_user_30d',
  'fragile_foundation',
  'lost_feel',
  'mechanics_decline',
  'results_decline',
  'pre_season',
  'post_layoff',
  'confidence_low',
  'philosophy_drift',
] as const;
export type FoundationTrigger = (typeof FOUNDATION_TRIGGERS)[number];

export const FOUNDATION_LABELS = {
  domain: {
    hitting: 'Hitting',
    pitching: 'Pitching',
    throwing: 'Throwing',
    fielding: 'Fielding',
    base_running: 'Base Running',
    mental_game: 'Mental Game',
    strength: 'Strength',
    nutrition: 'Nutrition',
    regulation: 'Regulation',
  } as Record<FoundationDomain, string>,
  scope: {
    philosophy_a_to_z: 'A–Z Philosophy',
    mechanics_primer: 'Mechanics Primer',
    mental_framework: 'Mental Framework',
    strategy_iq: 'Strategy & IQ',
    lifestyle_habits: 'Lifestyle / Habits',
  } as Record<FoundationScope, string>,
  audience: {
    new_to_sport: 'New to Sport',
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
    all_levels: 'All Levels',
  } as Record<FoundationAudience, string>,
  trigger: {
    new_user_30d: 'New athlete (first 30d)',
    fragile_foundation: 'Fragile foundation',
    lost_feel: 'Lost feel',
    mechanics_decline: 'Mechanics declining',
    results_decline: 'Results declining',
    pre_season: 'Pre-season prep',
    post_layoff: 'Returning from layoff',
    confidence_low: 'Confidence low',
    philosophy_drift: 'Philosophy drift',
  } as Record<FoundationTrigger, string>,
} as const;

export const TRIGGER_REASONS: Record<FoundationTrigger, string> = {
  new_user_30d: "You're still building your base — start with the philosophy.",
  fragile_foundation: 'Your foundation is still thin — anchor it with this.',
  lost_feel: "You've felt off this week — refresh your philosophy.",
  mechanics_decline: 'Mechanics have slipped lately — back to the source.',
  results_decline: 'Results are dipping — re-ground in the fundamentals.',
  pre_season: 'Pre-season — re-set your blueprint before the grind.',
  post_layoff: "You've been away — rebuild from A to Z.",
  confidence_low: "When confidence dips, return to what you know cold.",
  philosophy_drift: "Your reads sound scattered — re-anchor your approach.",
};

// Length tiers (seconds)
export type LengthTier = 'short' | 'standard' | 'deep_dive' | 'masterclass';
export function lengthTierForSeconds(s?: number | null): LengthTier | null {
  if (!s || s <= 0) return null;
  if (s < 600) return 'short';
  if (s < 1500) return 'standard';
  if (s < 3600) return 'deep_dive';
  return 'masterclass';
}

export const FOUNDATION_META_VERSION = 1 as const;

export interface FoundationMeta {
  domain: FoundationDomain;
  scope: FoundationScope;
  audience_levels: FoundationAudience[];
  refresher_triggers: FoundationTrigger[];
  length_tier?: LengthTier | null;
  version?: number;
}

export const EMPTY_FOUNDATION_META: FoundationMeta = {
  domain: 'hitting',
  scope: 'philosophy_a_to_z',
  audience_levels: [],
  refresher_triggers: [],
  length_tier: null,
  version: FOUNDATION_META_VERSION,
};

/**
 * Defensive parser. Returns null on any structural problem so callers
 * can skip the row instead of throwing inside a render or scorer pass.
 * Unknown enum values are stripped (forward compatible).
 */
export function parseFoundationMeta(raw: unknown): FoundationMeta | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const domain = r.domain as FoundationDomain;
  const scope = r.scope as FoundationScope;
  if (!FOUNDATION_DOMAINS.includes(domain)) return null;
  if (!FOUNDATION_SCOPES.includes(scope)) return null;

  const audArr = Array.isArray(r.audience_levels) ? r.audience_levels : [];
  const audience_levels = audArr.filter((a): a is FoundationAudience =>
    typeof a === 'string' && (FOUNDATION_AUDIENCES as readonly string[]).includes(a),
  );
  if (audience_levels.length === 0) return null;

  const trigArr = Array.isArray(r.refresher_triggers) ? r.refresher_triggers : [];
  const refresher_triggers = trigArr.filter((t): t is FoundationTrigger =>
    typeof t === 'string' && (FOUNDATION_TRIGGERS as readonly string[]).includes(t),
  );
  if (refresher_triggers.length === 0) return null;

  const length_tier = (typeof r.length_tier === 'string'
    && ['short', 'standard', 'deep_dive', 'masterclass'].includes(r.length_tier))
    ? (r.length_tier as LengthTier)
    : null;

  const version = typeof r.version === 'number' ? r.version : FOUNDATION_META_VERSION;

  return { domain, scope, audience_levels, refresher_triggers, length_tier, version };
}

// ---------------- Trigger derivation ----------------

export interface FoundationSnapshot {
  accountAgeDays: number;
  domainRepCount: Partial<Record<FoundationDomain, number>>;
  bqiDelta7d?: number;          // negative = decline
  peiDelta7d?: number;          // negative = decline
  faultRateDelta14d?: number;   // positive = more faults (decline)
  competitiveDelta14d?: number; // negative = decline
  regulationLow3d: boolean;
  seasonPhase?: 'pre_season' | 'in_season' | 'post_season' | null;
  layoffDays?: number;          // longest gap recently
  philosophyDriftIntents14d: number;
}

export function computeFoundationTriggers(s: FoundationSnapshot): FoundationTrigger[] {
  const out: FoundationTrigger[] = [];
  if (s.accountAgeDays <= 30) out.push('new_user_30d');

  // Fragile = primary domain has < 50 reps. We treat ANY domain with <50 as fragile.
  const fragile = Object.values(s.domainRepCount).some(n => (n ?? 0) < 50);
  if (fragile) out.push('fragile_foundation');

  if ((s.bqiDelta7d ?? 0) <= -10 && (s.peiDelta7d ?? 0) <= -10) out.push('lost_feel');
  if ((s.faultRateDelta14d ?? 0) >= 0.25) out.push('mechanics_decline');
  if ((s.competitiveDelta14d ?? 0) <= -0.15) out.push('results_decline');
  if (s.regulationLow3d) out.push('confidence_low');
  if (s.seasonPhase === 'pre_season') out.push('pre_season');
  if ((s.layoffDays ?? 0) >= 14) out.push('post_layoff');
  if (s.philosophyDriftIntents14d >= 2) out.push('philosophy_drift');
  return out;
}

// ---------------- Foundation scorer ----------------

export interface FoundationVideoCandidate {
  id: string;
  title: string;
  thumbnail_url?: string | null;
  video_url: string;
  foundation_meta: FoundationMeta;
  distribution_tier?: string | null;
  recentlyWatched21d?: boolean;
}

export interface FoundationScoreInput {
  candidates: FoundationVideoCandidate[];
  activeTriggers: FoundationTrigger[];
  userLevel?: FoundationAudience;
  preferredLength?: LengthTier;
  tierBoost: Record<string, number>;
}

export interface FoundationScoreResult {
  video: FoundationVideoCandidate;
  score: number;
  reason: string;
  matchedTriggers: FoundationTrigger[];
}

export function scoreFoundationCandidates(input: FoundationScoreInput): FoundationScoreResult[] {
  const { candidates, activeTriggers, userLevel, preferredLength, tierBoost } = input;
  const triggerSet = new Set(activeTriggers);
  const out: FoundationScoreResult[] = [];

  for (const v of candidates) {
    const meta = v.foundation_meta;
    const matched = (meta.refresher_triggers || []).filter(t => triggerSet.has(t));

    // Skip if no trigger overlap AND we have active triggers to filter on
    if (activeTriggers.length > 0 && matched.length === 0) continue;

    let score = matched.length > 0 ? 60 + 20 * (matched.length - 1) : 30;

    if (userLevel && (meta.audience_levels.includes(userLevel) || meta.audience_levels.includes('all_levels'))) {
      score += 15;
    }
    if (preferredLength && meta.length_tier === preferredLength) score += 10;

    const tier = (v.distribution_tier ?? 'normal') as keyof typeof tierBoost;
    score *= (tierBoost[tier] ?? 1);

    if (v.recentlyWatched21d) score -= 30;

    if (score <= 0) continue;

    const reason = matched[0] ? TRIGGER_REASONS[matched[0]] : 'Foundational refresher';
    out.push({ video: v, score, reason, matchedTriggers: matched });
  }

  return out.sort((a, b) => b.score - a.score);
}
