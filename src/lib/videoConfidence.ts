/**
 * Pure confidence scoring for owner-tagged videos.
 *
 * Sums to 100. Tier cutoffs match the visible badge color:
 *   ≥90 = Elite, 70–89 = Solid, <70 = Needs Work.
 *
 * IMPORTANT: keep weights in sync with `OwnerTaggingPerformancePanel`
 * and the in-form ConfidenceBadge — all three rely on this single function.
 */
import type { TagLayer } from './videoRecommendationEngine';

export type ConfidenceTier = 'elite' | 'solid' | 'needs_work';

export interface ConfidenceInput {
  videoFormat?: string | null;
  skillDomains?: string[] | null;
  aiDescription?: string | null;
  /** Tag layers covered by current assignments (deduped). */
  layersCovered?: TagLayer[];
  /** Total assignment count. */
  assignmentCount?: number;
}

export interface ConfidenceBreakdown {
  format: number;       // 0–15
  domain: number;       // 0–15
  description: number;  // 0–25
  tagCount: number;     // 0–20
  diversity: number;    // 0–25
}

export interface ConfidenceResult {
  score: number;       // 0–100, rounded
  tier: ConfidenceTier;
  breakdown: ConfidenceBreakdown;
  /** Short human reasons for the lowest-scoring components. */
  hints: string[];
}

const ACTION_VERB_RE =
  /\b(fix|cue|drive|rotate|extend|stay|keep|load|land|swing|throw|catch|track|read|focus|shift|press|brace|prep|finish|follow|connect|stack)\b/i;

function descriptionScore(text?: string | null): number {
  if (!text) return 0;
  const t = text.trim();
  const len = t.length;
  let base = 0;
  if (len >= 140) base = 25;
  else if (len >= 60) base = 20;
  else if (len >= 20) base = 10;
  else base = 0;
  // Verb cue acts as a quality floor — unlocks the +5 only when at length tier 60+
  if (base >= 20 && ACTION_VERB_RE.test(t)) {
    return Math.min(25, base);
  }
  // Below 60 chars: cap at 10 even with verbs.
  return base;
}

function tagCountScore(n: number): number {
  if (n <= 0) return 0;
  if (n === 1) return 5;
  if (n === 2) return 12;
  if (n <= 6) return 20;
  return 15; // over-tagging penalty
}

function diversityScore(layers: TagLayer[]): number {
  if (!layers || layers.length === 0) return 0;
  const unique = new Set(layers).size;
  // 1 layer = 7 (floor), 2 = 13, 3 = 19, 4 = 25
  return Math.min(25, 1 + unique * 6);
}

export function computeVideoConfidence(input: ConfidenceInput): ConfidenceResult {
  const breakdown: ConfidenceBreakdown = {
    format: input.videoFormat ? 15 : 0,
    domain: input.skillDomains && input.skillDomains.length > 0 ? 15 : 0,
    description: descriptionScore(input.aiDescription),
    tagCount: tagCountScore(input.assignmentCount ?? 0),
    diversity: diversityScore(input.layersCovered ?? []),
  };
  const score = Math.round(
    breakdown.format + breakdown.domain + breakdown.description + breakdown.tagCount + breakdown.diversity
  );
  const tier: ConfidenceTier = score >= 90 ? 'elite' : score >= 70 ? 'solid' : 'needs_work';

  const hints: string[] = [];
  if (breakdown.format === 0) hints.push('Pick a format');
  if (breakdown.domain === 0) hints.push('Pick a skill domain');
  if (breakdown.description < 20) hints.push('Write a longer, action-led description');
  if (breakdown.tagCount < 12) hints.push('Add 2+ tags');
  else if (breakdown.tagCount === 15) hints.push('Trim to 6 or fewer tags');
  if (breakdown.diversity < 19) hints.push('Cover more tag layers (movement / result / context / correction)');

  return { score, tier, breakdown, hints };
}

export const TIER_LABEL: Record<ConfidenceTier, string> = {
  elite: 'Elite',
  solid: 'Solid',
  needs_work: 'Needs work',
};

// ============================================================
// Foundation video confidence — parallel scorer for holistic
// (A–Z philosophy / mechanics primer) videos. Same 0–100 scale
// and tier cutoffs as Application, but graded on Foundation chips
// + Coach's Notes (the engine inputs Hammer actually uses).
// ============================================================

import type { FoundationMeta } from './foundationVideos';

export interface FoundationConfidenceInput {
  foundationMeta: FoundationMeta;
  /** Coach's Notes / ai_description — the freeform Hammer-facing text. */
  aiDescription?: string | null;
}

export interface FoundationConfidenceBreakdown {
  domain: number;          // 0–10
  scope: number;           // 0–10
  audience: number;        // 0–15
  triggers: number;        // 0–25
  notesLength: number;     // 0–20
  notesQuality: number;    // 0–20
}

const COVERAGE_RE = {
  cue: /\b(cue|feel|focus on|key is|trigger)\b/i,
  why: /\b(because|so that|reason|why|matters|leads to|causes)\b/i,
  fix: /\b(fix|correct|adjust|drill|to address|if you|when this)\b/i,
  when: /\b(when|during|on|after|before|in (the )?game|in practice)\b/i,
};
const STRUCTURE_RE = /(\n|\r|^\s*[-*•]|\b(?:1\.|2\.|first|next|then|finally|step \d)\b)/im;

function audienceScore(n: number): number {
  if (n <= 0) return 0;
  if (n === 1) return 8;
  if (n === 2) return 12;
  return 15;
}

function triggersScore(n: number): number {
  if (n <= 0) return 0;
  if (n === 1) return 10;
  if (n === 2) return 18;
  if (n === 3) return 22;
  return 25;
}

function notesLengthScore(len: number): number {
  if (len < 60) return 0;
  if (len < 200) return 10;
  if (len < 400) return 16;
  return 20;
}

function notesQualityScore(text: string): number {
  let s = 0;
  if (ACTION_VERB_RE.test(text)) s += 6;
  const coverageHits =
    (COVERAGE_RE.cue.test(text) ? 1 : 0) +
    (COVERAGE_RE.why.test(text) ? 1 : 0) +
    (COVERAGE_RE.fix.test(text) ? 1 : 0) +
    (COVERAGE_RE.when.test(text) ? 1 : 0);
  if (coverageHits >= 2) s += 7;
  if (STRUCTURE_RE.test(text)) s += 7;
  return Math.min(20, s);
}

export function computeFoundationConfidence(input: FoundationConfidenceInput): ConfidenceResult {
  const m = input.foundationMeta;
  const text = (input.aiDescription ?? '').trim();

  const breakdown: FoundationConfidenceBreakdown = {
    domain: m?.domain ? 10 : 0,
    scope: m?.scope ? 10 : 0,
    audience: audienceScore(m?.audience_levels?.length ?? 0),
    triggers: triggersScore(m?.refresher_triggers?.length ?? 0),
    notesLength: notesLengthScore(text.length),
    notesQuality: text.length >= 60 ? notesQualityScore(text) : 0,
  };

  const score = Math.round(
    breakdown.domain + breakdown.scope + breakdown.audience +
    breakdown.triggers + breakdown.notesLength + breakdown.notesQuality
  );
  const tier: ConfidenceTier = score >= 90 ? 'elite' : score >= 70 ? 'solid' : 'needs_work';

  const hints: string[] = [];
  if (breakdown.domain === 0) hints.push('Pick a Foundation domain');
  if (breakdown.scope === 0) hints.push('Pick a scope');
  if ((m?.audience_levels?.length ?? 0) < 2) {
    hints.push(`Tag ${(m?.audience_levels?.length ?? 0) === 0 ? '1+' : '1 more'} audience level (+${(m?.audience_levels?.length ?? 0) === 0 ? 8 : 4})`);
  }
  const triggerCount = m?.refresher_triggers?.length ?? 0;
  if (triggerCount < 4) {
    const next = triggerCount === 0 ? 10 : triggerCount === 1 ? 8 : triggerCount === 2 ? 4 : 3;
    hints.push(`Add ${4 - triggerCount} more refresher trigger${4 - triggerCount === 1 ? '' : 's'} (+${next}) — this is what makes Hammer surface it`);
  }
  if (text.length < 400) {
    if (text.length < 60) hints.push("Coach's Notes is too short — write at least 60 characters (+10)");
    else if (text.length < 200) hints.push(`Coach's Notes is ${text.length} chars; reach 200 for +6`);
    else hints.push(`Coach's Notes is ${text.length} chars; reach 400 for +4`);
  }
  if (text.length >= 60 && !ACTION_VERB_RE.test(text)) {
    hints.push('Add an action verb (drive, rotate, stack, finish…) for +6');
  }
  if (text.length >= 60 && !STRUCTURE_RE.test(text)) {
    hints.push('Break notes into steps or bullets for +7');
  }

  // Reuse the shared ConfidenceResult shape so the badge & callers stay generic.
  return {
    score,
    tier,
    breakdown: {
      // Map Foundation breakdown into the existing shape's slots so any
      // generic UI still renders something sensible. Detailed Foundation
      // breakdown is exposed via the typed return on the named export.
      format: breakdown.domain,
      domain: breakdown.scope,
      description: breakdown.notesLength + breakdown.notesQuality,
      tagCount: breakdown.audience,
      diversity: breakdown.triggers,
    },
    hints,
  };
}

export const TIER_CLASSES: Record<ConfidenceTier, string> = {
  elite: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  solid: 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30',
  needs_work: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
};
