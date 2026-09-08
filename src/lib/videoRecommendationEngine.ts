/**
 * Video Recommendation Engine — Hammer Tagging V1
 * Pure, testable function. Ranks library videos against analysis/session/long-term inputs.
 *
 * PHASE 6 SYSTEM RULES:
 * - Blocked videos NEVER surface
 * - Tier is authoritative over raw score noise
 * - Confidence is a tie-breaker, not a driver
 * - UI must reflect DB tier exactly (no divergence)
 */
import { normalizeTier, TIER_BOOST } from './videoTier';

export type SuggestionMode = 'session' | 'long_term' | 'general';
export type SkillDomain = 'hitting' | 'fielding' | 'throwing' | 'base_running' | 'pitching';
export type TagLayer = 'movement_pattern' | 'result' | 'context' | 'correction';
/** Sport scope of a tag / rule. 'both' = sport-agnostic. */
export type TagSport = 'baseball' | 'softball' | 'both';
/** Position groups a tag / rule applies to. null / empty = all positions. */
export type PositionScope =
  | 'pitcher' | 'catcher' | 'first_base' | 'middle_infield'
  | 'third_base' | 'corner_outfield' | 'center_field';

export interface TaxonomyTag {
  id: string;
  layer: TagLayer;
  key: string;
  label: string;
  skill_domain: SkillDomain;
  /** Sport specialization — baseball (overhand) vs softball (windmill) vs both. */
  sport?: TagSport | null;
  /** Position groups this tag is legal for. null / [] = every position. */
  position_scope?: string[] | null;
}

/** True when a sport-scoped row is legal for the athlete/video sport. */
export function sportMatches(rowSport: TagSport | null | undefined, target?: TagSport | null): boolean {
  if (!target || target === 'both') return true;
  const s = rowSport ?? 'both';
  return s === 'both' || s === target;
}

/** True when a position-scoped row is legal for the athlete/video positions. */
export function positionMatches(scope: string[] | null | undefined, positions?: string[] | null): boolean {
  if (!scope || scope.length === 0) return true;
  if (!positions || positions.length === 0) return true;
  return scope.some(s => positions.includes(s));
}


export interface VideoTagAssignment {
  tag_id: string;
  weight: number;
}

export type DistributionTier = 'blocked' | 'throttled' | 'normal' | 'boosted' | 'featured';

export interface VideoWithTags {
  id: string;
  title: string;
  description?: string | null;
  thumbnail_url?: string | null;
  video_url: string;
  video_format?: string | null;
  skill_domains?: SkillDomain[] | null;
  /** Sports this video was filmed for, e.g. ['baseball'] or ['baseball','softball']. */
  sport?: string[] | null;
  ai_description?: string | null;
  created_at?: string | null;
  assignments: VideoTagAssignment[]; // assigned taxonomy tags
  /** Phase 6 — engine leverage. Cached on library_videos. */
  confidence_score?: number | null;
  distribution_tier?: DistributionTier | null;
  /** Owner-tagged teaching phases (e.g. ['p1_hip_load','p4_hitters_move']). Soft scoring boost. */
  formula_phases?: string[] | null;
}

// Tier multipliers live in src/lib/videoTier.ts (TIER_BOOST) — single source of truth.

export interface VideoTagRule {
  id: string;
  skill_domain: SkillDomain;
  movement_key: string;
  result_key: string | null;
  context_key: string | null;
  correction_key: string;
  strength: number;
  active: boolean;
  sport?: TagSport | null;
  position_scope?: string[] | null;
}

export interface RecommendInput {
  skillDomain: SkillDomain;
  mode: SuggestionMode;
  movementPatterns: string[];
  resultTags: string[];
  contextTags: string[];
  /**
   * Correction keys the analysis itself prescribed (not inferred from rules).
   * These are the highest-weighted signal: they are the fix being asked for.
   */
  correctionTags?: string[];
  /**
   * `layer:key` → the athlete-readable piece of feedback that produced the key.
   * Used only to word the "why" line. Never affects ranking.
   */
  feedbackEvidence?: Record<string, string>;
  candidateVideos: VideoWithTags[];
  taxonomy: TaxonomyTag[];
  rules: VideoTagRule[];
  userOutcomes?: Map<string, { watchCount: number; avgPostDelta: number }>;
  globalMetrics?: Map<string, { improvementScore: number; sampleSize: number }>;
  /**
   * How many other athletes liked or saved this video FOR one of the faults in
   * this request. Measured only — never invented, and capped so a popular clip
   * can never out-rank an actual tag match.
   */
  faultEndorsements?: Map<string, number>;

  /**
   * Correction keys belonging to a ROOT movement pattern the athlete shows in
   * more than one skill domain. These are lifted above single-domain matches
   * because fixing the pattern once helps every discipline it appears in. Only
   * videos that already match the key are affected — nothing is padded in.
   */
  rootPatternCorrectionKeys?: string[];
  /** Active teaching-phase ids (e.g. ['p1_hip_load','p4_hitters_move']). Soft boost only. */
  activePhases?: string[];
  /** HARD GATE — athlete sport. Softball athletes never receive baseball-only tags/videos. */
  sport?: TagSport | null;
  /** HARD GATE for rules/tags scoped to position groups (catcher, middle_infield, …). */
  positions?: string[] | null;
  /**
   * Videos this athlete has already watched FOR THE FAULTS in this request.
   * Coverage rule: unseen videos rank above seen ones so an athlete works
   * through every video for a fault before any repeats. Never a filter — when
   * everything has been seen the set resets and normal ranking resumes.
   */
  seenVideoIds?: ReadonlySet<string> | string[];
}



export interface OutcomeEvidence {
  /** Times THIS athlete has watched it. */
  readonly personalWatchCount: number;
  /** How many post-view measurements exist across all athletes. */
  readonly globalSampleSize: number;
  /** Distinct athletes who endorsed it for one of these faults. */
  readonly endorsementCount: number;
  /** True when any of the three cleared its floor and moved the score. */
  readonly outcomeApplied: boolean;
  /** Total measurements behind the outcome terms. */
  readonly totalSampleSize: number;
}

export interface RecommendResult {
  video: VideoWithTags;
  score: number;
  reasons: string[];
  /** Which taxonomy layers actually matched. Drives honest labelling. */
  matchedLayers: TagLayer[];
  /**
   * `targeted` — matched the athlete's own fault (correction / movement).
   * `general` — matched only their situation or the result they're chasing, so
   * it is presented as general work, never as the fix for their fault.
   */
  relevance: 'targeted' | 'general';
  /** Phase 7: derived monetization overlay — never feeds back into ranking. */
  conversionScore?: number;
  /** How much measured evidence stands behind this score. Always present. */
  outcomeEvidence: OutcomeEvidence;
  /** True when this pick was held back for the exploration slot. */
  exploration?: boolean;
  /**
   * Coverage partition state for this pick.
   * `unseen` — the athlete has not watched it for this fault yet (ranked first).
   * `seen`   — already watched for this fault.
   * `reset`  — every eligible video had been seen, so the seen-set was cleared
   *            and normal ranking resumed.
   */
  coverage?: 'unseen' | 'seen' | 'reset';
  /** The fault keys this pick was ranked against. Scopes the seen-set. */
  faultScope: string[];
}

/**
 * Below these counts an outcome term is noise, so it contributes exactly zero
 * rather than a wobbly number. Raising a video on three likes is guessing.
 */
export const OUTCOME_FLOORS = {
  /** Personal watch history before their own deltas count. */
  personalWatches: 3,
  /** Library-wide post-view measurements before the global term counts. */
  globalMeasurements: 5,
  /** Distinct athletes endorsing it for this fault before peer likes count. */
  endorsements: 3,
} as const;

const MODE_CAPS: Record<SuggestionMode, { max: number; minScore: number }> = {
  session: { max: 4, minScore: 40 },
  long_term: { max: 4, minScore: 30 },
  // Situation-driven surfaces (season phase, a Game Hub outcome) match on the
  // lower-weighted context/result layers, so they need their own floor.
  general: { max: 3, minScore: 12 },

};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}


export function recommendVideos(input: RecommendInput): RecommendResult[] {
  const {
    skillDomain, mode, movementPatterns, resultTags, contextTags,
    correctionTags, feedbackEvidence,
    candidateVideos, taxonomy, rules, userOutcomes, globalMetrics, faultEndorsements,
    activePhases, sport, positions, rootPatternCorrectionKeys, seenVideoIds,
  } = input;
  // Coverage: what this athlete has already watched FOR THESE faults.
  const seen = seenVideoIds instanceof Set ? seenVideoIds : new Set(seenVideoIds ?? []);
  const faultScope = dedupe([...(correctionTags ?? []), ...movementPatterns]);
  const activePhaseSet = new Set((activePhases ?? []).filter(Boolean));
  const evidence = feedbackEvidence ?? {};


  // Build key→tagId lookup scoped to this skill domain + sport + position group.
  const keyToTagId = new Map<string, string>();
  const tagIdToTag = new Map<string, TaxonomyTag>();
  for (const t of taxonomy) {
    if (
      t.skill_domain === skillDomain &&
      sportMatches(t.sport, sport) &&
      positionMatches(t.position_scope, positions)
    ) {
      keyToTagId.set(`${t.layer}:${t.key}`, t.id);
    }
    tagIdToTag.set(t.id, t);
  }

  // Derive correction keys triggered by rules
  const triggeredCorrections = new Map<string, { strength: number; reason: string }>();
  for (const r of rules) {
    if (!r.active || r.skill_domain !== skillDomain) continue;
    // HARD GATE — a windmill rule may never fire for a baseball athlete (and vice versa),
    // and a catcher-scoped rule may never fire for an outfielder.
    if (!sportMatches(r.sport, sport)) continue;
    if (!positionMatches(r.position_scope, positions)) continue;
    if (!movementPatterns.includes(r.movement_key)) continue;
    if (r.result_key && !resultTags.includes(r.result_key)) continue;
    if (r.context_key && !contextTags.includes(r.context_key)) continue;
    const existing = triggeredCorrections.get(r.correction_key);
    const reason = `Fixes: ${r.correction_key.replace(/_/g, ' ')}`;
    if (!existing || existing.strength < r.strength) {
      triggeredCorrections.set(r.correction_key, { strength: r.strength, reason });
    }
  }

  // Corrections named by the analysis itself outrank rule-inferred ones:
  // they ARE the fix the athlete was just given.
  for (const key of correctionTags ?? []) {
    triggeredCorrections.set(key, { strength: 12, reason: `Fixes: ${key.replace(/_/g, ' ')}` });
  }

  const movementTagIds = new Set(movementPatterns.map(k => keyToTagId.get(`movement_pattern:${k}`)).filter(Boolean) as string[]);
  const resultTagIds = new Set(resultTags.map(k => keyToTagId.get(`result:${k}`)).filter(Boolean) as string[]);
  const contextTagIds = new Set(contextTags.map(k => keyToTagId.get(`context:${k}`)).filter(Boolean) as string[]);
  const correctionTagIds = new Map<string, number>();
  for (const [key, val] of triggeredCorrections) {
    const id = keyToTagId.get(`correction:${key}`);
    if (id) correctionTagIds.set(id, val.strength);
  }
  // Root-pattern lift: same correction, but the pattern behind it is costing
  // the athlete in more than one skill.
  const rootPatternTagIds = new Set(
    (rootPatternCorrectionKeys ?? [])
      .map(k => keyToTagId.get(`correction:${k}`))
      .filter(Boolean) as string[],
  );


  const now = Date.now();
  const scored: RecommendResult[] = [];

  for (const v of candidateVideos) {
    // Phase 6 — tier is read once, authoritatively, up-front.
    const tier = normalizeTier(v.distribution_tier);

    // HARD FILTER: blocked videos never reach athletes.
    if (tier === 'blocked') continue;

    // Domain gate: skip videos not in this skill domain (if domains set)
    if (v.skill_domains && v.skill_domains.length && !v.skill_domains.includes(skillDomain)) continue;

    // Sport gate: a softball athlete never receives a baseball-only video.
    if (sport && sport !== 'both' && v.sport && v.sport.length && !v.sport.includes(sport)) continue;


    const tierBoost = TIER_BOOST[tier];

    let score = 0;
    const reasons: string[] = [];
    const matched = new Set<TagLayer>();

    for (const a of v.assignments) {
      const tag = tagIdToTag.get(a.tag_id);
      if (!tag) continue;
      const w = a.weight || 1;

      // Layer weights, highest first: correction (the prescribed fix) →
      // movement pattern → result → context.
      if (correctionTagIds.has(a.tag_id)) {
        const ruleStrength = correctionTagIds.get(a.tag_id) || 5;
        score += 90 + ruleStrength;
        matched.add('correction');
        const said = evidence[`correction:${tag.key}`];
        reasons.push(
          said
            ? `Works on ${tag.label.toLowerCase()} — your analysis said ${said}`
            : `Recommended correction: ${tag.label}`,
        );
      }
      if (rootPatternTagIds.has(a.tag_id)) {
        score += 60;
        matched.add('correction');
        reasons.push('Works on the pattern showing up in more than one part of your game');
      }
      if (movementTagIds.has(a.tag_id)) {
        score += 50 * w;
        matched.add('movement_pattern');
        const said = evidence[`movement_pattern:${tag.key}`];
        reasons.push(
          said
            ? `Same pattern as your clip — ${said}`
            : `Matches your movement pattern: ${tag.label}`,
        );
      }
      if (resultTagIds.has(a.tag_id)) {
        score += 25 * w;
        matched.add('result');
        reasons.push(`Targets result: ${tag.label}`);
      }
      if (contextTagIds.has(a.tag_id)) {
        score += 15 * w;
        matched.add('context');
        reasons.push(`Fits context: ${tag.label}`);
      }
    }



    // Outcome terms only count once there is enough measurement behind them.
    // Below the floor they contribute exactly zero — not a small wobbly number.
    const uo = userOutcomes?.get(v.id);
    const gm = globalMetrics?.get(v.id);
    const endorsements = faultEndorsements?.get(v.id) ?? 0;
    const personalWatchCount = uo?.watchCount ?? 0;
    const globalSampleSize = gm?.sampleSize ?? 0;
    let outcomeApplied = false;

    // User-specific success
    if (uo && personalWatchCount >= OUTCOME_FLOORS.personalWatches) {
      score += clamp(uo.avgPostDelta * 8, -20, 20);
      if (uo.avgPostDelta <= 0) score -= 15;
      outcomeApplied = true;
    }

    // Global improvement
    if (gm && globalSampleSize >= OUTCOME_FLOORS.globalMeasurements) {
      score += clamp(gm.improvementScore * 5, -10, 10);
      outcomeApplied = true;
    }

    // Peer endorsement for THIS fault. Small, capped, and only counted when
    // enough athletes recorded it against a fault in this request.
    if (endorsements >= OUTCOME_FLOORS.endorsements) {
      score += Math.min(10, 3 + endorsements);
      outcomeApplied = true;
      reasons.push(`${endorsements} athletes found this helped the same fault`);
    }


    // Recency
    if (v.created_at) {
      const ageDays = (now - new Date(v.created_at).getTime()) / 86400000;
      if (ageDays <= 30) score += 3;
    }

    // Long-term mode bias
    if (mode === 'long_term' && (v.video_format === 'drill' || v.video_format === 'breakdown')) {
      score += 8;
    }

    // Formula linkage soft boost — owner-tagged teaching phases.
    // Capped lift; never out-ranks hard sport/domain filters or featured tier.
    if (activePhaseSet.size > 0 && v.formula_phases?.length) {
      let phaseHits = 0;
      for (const p of v.formula_phases) {
        if (activePhaseSet.has(p)) phaseHits++;
      }
      if (phaseHits > 0) {
        score += Math.min(20, 8 + phaseHits * 6);
        reasons.push(`Teaches ${phaseHits === 1 ? 'this phase' : `${phaseHits} active phases`}`);
      }
    }
    score = score * tierBoost;
    if (tier === 'featured') reasons.push('Featured video — elite structure');
    else if (tier === 'boosted') reasons.push('Boosted — high-confidence');
    else if (tier === 'throttled') reasons.push('Reduced reach — incomplete structure');

    // Phase 7: derived only — never feeds back into ranking.
    const monetizationBoost =
      tier === 'featured' ? 1.25 :
      tier === 'boosted'  ? 1.15 :
      tier === 'normal'   ? 1.05 : 0;
    const conversionScore = score * monetizationBoost;

    if (score > 0) {
      const matchedLayers = Array.from(matched);
      const targeted = matched.has('correction') || matched.has('movement_pattern');
      scored.push({
        video: v,
        score,
        conversionScore,
        matchedLayers,
        relevance: targeted ? 'targeted' : 'general',
        reasons: dedupe(reasons).slice(0, 4),
        outcomeEvidence: {
          personalWatchCount,
          globalSampleSize,
          endorsementCount: endorsements,
          outcomeApplied,
          totalSampleSize: personalWatchCount + globalSampleSize + endorsements,
        },
      });
    }
  }

  const cap = MODE_CAPS[mode];
  const eligible = scored
    .filter(r => r.score >= cap.minScore)
    .sort((a, b) => b.score - a.score);

  const top = eligible.slice(0, cap.max);
  if (top.length < cap.max) return top;

  // Exploration slot — the last slot is reserved for a video with too little
  // outcome data to rank on. Without it a new video is never watched, never
  // earns data, and never ranks: the library seals around whatever landed first.
  if (top.some(r => !r.outcomeEvidence.outcomeApplied)) return top;
  const explorer = eligible
    .slice(cap.max)
    .find(r => !r.outcomeEvidence.outcomeApplied);
  if (!explorer) return top;
  return [
    ...top.slice(0, cap.max - 1),
    { ...explorer, exploration: true, reasons: dedupe([...explorer.reasons, 'New — not enough data on this one yet']).slice(0, 4) },
  ];
}


function dedupe(arr: string[]): string[] {
  return Array.from(new Set(arr));
}
