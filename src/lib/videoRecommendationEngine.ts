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

export type SuggestionMode = 'session' | 'long_term';
export type SkillDomain = 'hitting' | 'fielding' | 'throwing' | 'base_running' | 'pitching';
export type TagLayer = 'movement_pattern' | 'result' | 'context' | 'correction';

export interface TaxonomyTag {
  id: string;
  layer: TagLayer;
  key: string;
  label: string;
  skill_domain: SkillDomain;
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
}

export interface RecommendInput {
  skillDomain: SkillDomain;
  mode: SuggestionMode;
  movementPatterns: string[];
  resultTags: string[];
  contextTags: string[];
  candidateVideos: VideoWithTags[];
  taxonomy: TaxonomyTag[];
  rules: VideoTagRule[];
  userOutcomes?: Map<string, { watchCount: number; avgPostDelta: number }>;
  globalMetrics?: Map<string, { improvementScore: number }>;
  /** Active teaching-phase ids (e.g. ['p1_hip_load','p4_hitters_move']). Soft boost only. */
  activePhases?: string[];
}

export interface RecommendResult {
  video: VideoWithTags;
  score: number;
  reasons: string[];
  /** Phase 7: derived monetization overlay — never feeds back into ranking. */
  conversionScore?: number;
}

const MODE_CAPS: Record<SuggestionMode, { max: number; minScore: number }> = {
  session: { max: 4, minScore: 40 },
  long_term: { max: 4, minScore: 30 },
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function recommendVideos(input: RecommendInput): RecommendResult[] {
  const {
    skillDomain, mode, movementPatterns, resultTags, contextTags,
    candidateVideos, taxonomy, rules, userOutcomes, globalMetrics,
  } = input;

  // Build key→tagId lookup scoped to this skill domain
  const keyToTagId = new Map<string, string>();
  const tagIdToTag = new Map<string, TaxonomyTag>();
  for (const t of taxonomy) {
    if (t.skill_domain === skillDomain) {
      keyToTagId.set(`${t.layer}:${t.key}`, t.id);
    }
    tagIdToTag.set(t.id, t);
  }

  // Derive correction keys triggered by rules
  const triggeredCorrections = new Map<string, { strength: number; reason: string }>();
  for (const r of rules) {
    if (!r.active || r.skill_domain !== skillDomain) continue;
    if (!movementPatterns.includes(r.movement_key)) continue;
    if (r.result_key && !resultTags.includes(r.result_key)) continue;
    if (r.context_key && !contextTags.includes(r.context_key)) continue;
    const existing = triggeredCorrections.get(r.correction_key);
    const reason = `Fixes: ${r.correction_key.replace(/_/g, ' ')}`;
    if (!existing || existing.strength < r.strength) {
      triggeredCorrections.set(r.correction_key, { strength: r.strength, reason });
    }
  }

  const movementTagIds = new Set(movementPatterns.map(k => keyToTagId.get(`movement_pattern:${k}`)).filter(Boolean) as string[]);
  const resultTagIds = new Set(resultTags.map(k => keyToTagId.get(`result:${k}`)).filter(Boolean) as string[]);
  const contextTagIds = new Set(contextTags.map(k => keyToTagId.get(`context:${k}`)).filter(Boolean) as string[]);
  const correctionTagIds = new Map<string, number>();
  for (const [key, val] of triggeredCorrections) {
    const id = keyToTagId.get(`correction:${key}`);
    if (id) correctionTagIds.set(id, val.strength);
  }

  const now = Date.now();
  const scored: RecommendResult[] = [];

  for (const v of candidateVideos) {
    // Phase 6 — tier is read once, authoritatively, up-front.
    const tier = normalizeTier(v.distribution_tier);

    // HARD FILTER: blocked videos never reach athletes.
    if (tier === 'blocked') continue;

    // Domain gate: skip videos not in this skill domain (if domains set)
    if (v.skill_domains && v.skill_domains.length && !v.skill_domains.includes(skillDomain)) continue;

    const tierBoost = TIER_BOOST[tier];

    let score = 0;
    const reasons: string[] = [];

    for (const a of v.assignments) {
      const tag = tagIdToTag.get(a.tag_id);
      if (!tag) continue;
      const w = a.weight || 1;

      if (movementTagIds.has(a.tag_id)) {
        score += 50 * w;
        reasons.push(`Matches your movement pattern: ${tag.label}`);
      }
      if (resultTagIds.has(a.tag_id)) {
        score += 25 * w;
        reasons.push(`Targets result: ${tag.label}`);
      }
      if (contextTagIds.has(a.tag_id)) {
        score += 15 * w;
        reasons.push(`Fits context: ${tag.label}`);
      }
      if (correctionTagIds.has(a.tag_id)) {
        const ruleStrength = correctionTagIds.get(a.tag_id) || 5;
        score += 40 + ruleStrength;
        reasons.push(`Recommended correction: ${tag.label}`);
      }
    }

    // User-specific success
    const uo = userOutcomes?.get(v.id);
    if (uo) {
      score += clamp(uo.avgPostDelta * 8, -20, 20);
      if (uo.watchCount >= 3 && uo.avgPostDelta <= 0) score -= 15;
    }

    // Global improvement
    const gm = globalMetrics?.get(v.id);
    if (gm) score += clamp(gm.improvementScore * 5, -10, 10);

    // Recency
    if (v.created_at) {
      const ageDays = (now - new Date(v.created_at).getTime()) / 86400000;
      if (ageDays <= 30) score += 3;
    }

    // Long-term mode bias
    if (mode === 'long_term' && (v.video_format === 'drill' || v.video_format === 'breakdown')) {
      score += 8;
    }

    // Phase 6: tier boost is the FINAL multiplier — no late-stage tag-noise can out-rank a featured video.
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
      scored.push({ video: v, score, conversionScore, reasons: dedupe(reasons).slice(0, 4) });
    }
  }

  const cap = MODE_CAPS[mode];
  return scored
    .filter(r => r.score >= cap.minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, cap.max);
}

function dedupe(arr: string[]): string[] {
  return Array.from(new Set(arr));
}
