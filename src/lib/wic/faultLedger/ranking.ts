/**
 * Fault Ledger ranking.
 *
 * Every part of the app that notices something wrong writes one row into
 * `wk_fault_signals`. This module is the only place those rows are collapsed
 * into "what is actually the problem right now".
 *
 * Rules that are not negotiable:
 *  - A number never travels without its sample size. One clip is one clip.
 *  - Recency decays, it does not erase. A month-old signal still counts.
 *  - Agreement across independent sources outranks volume from one source.
 *  - Ranking orders work. It never authors a dose, and it never invents a
 *    fault that no source reported.
 */
import { familyForRootPattern, type FaultFamily } from "./families";
import { fadeForSignal, type ClipEvidence, type FadeState } from "./cleanClipFade";

export type FaultSource =
  | "complaint"
  | "report_card"
  | "video_analysis"
  | "standards_gap"
  | "grade_low"
  | "log_trend"
  | "daily_checkin"
  | "coach_note"
  | "game_hub";

/**
 * `pitching` is its own discipline, not a flavour of throwing. The app treats
 * the two as different things everywhere else, and folding one into the other
 * would let a pitching fault and a throwing fault agree with each other when
 * they are actually one source reporting twice.
 */
export type Discipline =
  | "hitting"
  | "pitching"
  | "throwing"
  | "fielding"
  | "running"
  | "lifting";

export interface FaultSignal {
  readonly id: string;
  readonly user_id: string;
  readonly source: FaultSource;
  readonly fault_key: string;
  readonly root_pattern_id: string;
  readonly discipline: Discipline;
  /** 0–1, how much the source trusts its own observation. */
  readonly confidence: number;
  /** How many observations this rests on. Never omitted. */
  readonly sample_size: number;
  /** 0–1, how much it is costing the athlete. */
  readonly severity: number;
  readonly evidence: string;
  readonly observed_at: string;
}

export interface RankedFault {
  readonly rootPatternId: string;
  readonly family: FaultFamily | null;
  readonly score: number;
  /** Distinct sources that reported it. */
  readonly sources: readonly FaultSource[];
  /** Distinct disciplines it showed up in. */
  readonly disciplines: readonly Discipline[];
  /** Total observations behind the whole group. */
  readonly totalSampleSize: number;
  readonly latestObservedAt: string;
  readonly signals: readonly FaultSignal[];
  /** One line the athlete can read. */
  readonly says: string;
  /**
   * Clean-clip fades on this group's signals (only analyzer signals a newer
   * same-skill clip genuinely checked). Empty when nothing faded.
   */
  readonly fades: ReadonlyArray<{ readonly signal: FaultSignal; readonly fade: FadeState }>;
  /** True when every signal in the group was cleared by clean clips. */
  readonly clearedByCleanClips: boolean;
}

const HALF_LIFE_DAYS = 21;

/** 1.0 today, 0.5 three weeks ago, never zero. */
export function recencyWeight(observedAt: string, now: number = Date.now()): number {
  const t = new Date(observedAt).getTime();
  if (!Number.isFinite(t)) return 0.25;
  const days = Math.max(0, (now - t) / 86_400_000);
  return Math.max(0.05, Math.pow(0.5, days / HALF_LIFE_DAYS));
}

/** Confidence in a sample size: one observation is never treated as a trend. */
export function sampleWeight(sampleSize: number): number {
  if (sampleSize <= 0) return 0;
  return Math.min(1, Math.log10(1 + sampleSize) / Math.log10(11)); // 10 obs ≈ 1.0
}

function unique<T>(xs: readonly T[]): T[] {
  return Array.from(new Set(xs));
}

/**
 * Collapse raw signals into ranked root patterns, highest first.
 * Deterministic: same rows in, same order out.
 */
export function rankFaults(
  signals: readonly FaultSignal[],
  now: number = Date.now(),
  clips: readonly ClipEvidence[] = [],
): RankedFault[] {
  const groups = new Map<string, FaultSignal[]>();
  for (const s of signals) {
    const g = groups.get(s.root_pattern_id);
    if (g) g.push(s);
    else groups.set(s.root_pattern_id, [s]);
  }

  const ranked: RankedFault[] = [];
  for (const [rootPatternId, group] of groups) {
    const fadeBySignal = group.map((s) => ({ signal: s, fade: fadeForSignal(s, clips) }));
    // The timer still runs underneath; a clean clip multiplies on top of it.
    const base = fadeBySignal.reduce(
      (sum, { signal: s, fade }) =>
        sum +
        s.confidence * s.severity * sampleWeight(s.sample_size) * recencyWeight(s.observed_at, now) * fade.multiplier,
      0,
    );
    const fades = fadeBySignal.filter(({ fade }) => fade.status !== "none");
    const clearedByCleanClips = fadeBySignal.every(({ fade }) => fade.status === "cleared");
    const sources = unique(group.map((s) => s.source));
    const disciplines = unique(group.map((s) => s.discipline));
    // Independent agreement is worth more than repetition from one place.
    const agreement = 1 + 0.35 * (sources.length - 1) + 0.25 * (disciplines.length - 1);
    const sorted = group.slice().sort((a, b) => b.observed_at.localeCompare(a.observed_at));
    const totalSampleSize = group.reduce((n, s) => n + s.sample_size, 0);
    const family = familyForRootPattern(rootPatternId);

    ranked.push({
      rootPatternId,
      family,
      score: base * agreement,
      sources,
      disciplines,
      totalSampleSize,
      latestObservedAt: sorted[0].observed_at,
      signals: sorted,
      says: sayIt(sorted[0], disciplines, totalSampleSize),
      fades,
      clearedByCleanClips,
    });
  }

  return ranked.sort(
    (a, b) => b.score - a.score || a.rootPatternId.localeCompare(b.rootPatternId),
  );
}

function sayIt(latest: FaultSignal, disciplines: readonly Discipline[], n: number): string {
  const where =
    disciplines.length > 1
      ? `It shows up in your ${disciplines.slice(0, -1).join(", ")} and ${disciplines[disciplines.length - 1]}.`
      : `It shows up in your ${disciplines[0]}.`;
  const seen = n === 1 ? "Seen once so far." : `Seen ${n} times.`;
  return `${latest.evidence} ${where} ${seen}`;
}

/** The work that comes first. Three is the ceiling — more is not a plan. */
export function topPriorities(
  signals: readonly FaultSignal[],
  limit = 3,
  clips: readonly ClipEvidence[] = [],
): RankedFault[] {
  return rankFaults(signals, Date.now(), clips).filter((r) => !r.clearedByCleanClips).slice(0, limit);
}
