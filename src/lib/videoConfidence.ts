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

export const TIER_CLASSES: Record<ConfidenceTier, string> = {
  elite: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  solid: 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30',
  needs_work: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
};
