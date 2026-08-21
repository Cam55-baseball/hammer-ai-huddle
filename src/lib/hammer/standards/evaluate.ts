/**
 * Standards evaluator — pure, deterministic, no I/O.
 *
 * Reads logged sets (wk_session_logs rows, or the in-memory rounds of a set the
 * athlete is saving right now) and answers a single question per standard:
 * what is the athlete's best value, and which tier does it clear?
 *
 * It never prescribes. It only measures what was already logged.
 */

import {
  STANDARDS,
  TIER_ORDER,
  trainingAgeMeets,
  type StandardDef,
  type StandardTier,
} from "./catalog";

export interface LoggedRound {
  weight?: number | null;
  reps?: number | null;
  distance?: number | null;
  duration?: number | null;
  time?: number | null;
  [k: string]: unknown;
}

export interface LoggedSet {
  movement_slug: string;
  plan_date?: string | null;
  rounds: LoggedRound[];
  /** Canonical top-level metrics stamped by the log normalizer. */
  canonical?: Record<string, number | null | undefined>;
}

/** Normalize a raw wk_session_logs row into a LoggedSet. */
export function toLoggedSet(row: {
  movement_slug?: string | null;
  plan_date?: string | null;
  metrics?: unknown;
  load_used?: number | null;
  reps_completed?: number[] | null;
  distance_feet_completed?: number | null;
  duration_seconds_completed?: number | null;
}): LoggedSet {
  const metrics = (row.metrics ?? {}) as Record<string, unknown>;
  const rawRounds = Array.isArray(metrics.rounds) ? (metrics.rounds as LoggedRound[]) : [];
  const rounds: LoggedRound[] = rawRounds.length
    ? rawRounds
    : [
        {
          weight: row.load_used ?? null,
          reps: Array.isArray(row.reps_completed) ? Math.max(...row.reps_completed, 0) || null : null,
          distance: row.distance_feet_completed ?? null,
          duration: row.duration_seconds_completed ?? null,
        },
      ];
  const canonical: Record<string, number | null> = {};
  for (const [k, v] of Object.entries(metrics)) {
    if (typeof v === "number") canonical[k] = v;
  }
  return {
    movement_slug: row.movement_slug ?? "",
    plan_date: row.plan_date ?? null,
    rounds,
    canonical,
  };
}

export interface AthleteMeasures {
  bodyweightLbs: number | null;
  chronologicalAge: number | null;
  trainingAge: string | null;
}

interface SlugBest {
  /** Every (weight, reps) pair logged for the movement. */
  loadPairs: Array<{ weight: number; reps: number }>;
  maxReps: number;
  maxDistance: number;
  maxSeconds: number;
}

export interface BestIndex {
  bySlug: Record<string, SlugBest>;
  canonical: Record<string, number>;
}

function emptyBest(): SlugBest {
  return { loadPairs: [], maxReps: 0, maxDistance: 0, maxSeconds: 0 };
}

export function buildBestIndex(sets: LoggedSet[]): BestIndex {
  const bySlug: Record<string, SlugBest> = {};
  const canonical: Record<string, number> = {};

  for (const s of sets) {
    if (!s.movement_slug) continue;
    const b = (bySlug[s.movement_slug] ??= emptyBest());
    for (const r of s.rounds ?? []) {
      const w = num(r.weight);
      const reps = num(r.reps);
      if (w !== null && w > 0 && reps !== null && reps > 0) b.loadPairs.push({ weight: w, reps });
      if (reps !== null) b.maxReps = Math.max(b.maxReps, reps);
      const d = num(r.distance);
      if (d !== null) b.maxDistance = Math.max(b.maxDistance, d);
      const t = num(r.duration) ?? num(r.time);
      if (t !== null) b.maxSeconds = Math.max(b.maxSeconds, t);
      // Bodyweight-only sets still count for a rep ladder.
      if (w === null && reps !== null) b.maxReps = Math.max(b.maxReps, reps);
    }
    for (const [k, v] of Object.entries(s.canonical ?? {})) {
      if (typeof v === "number" && Number.isFinite(v)) canonical[k] = Math.max(canonical[k] ?? 0, v);
    }
  }
  return { bySlug, canonical };
}

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
}

export type EligibilityReason = "ok" | "age" | "training_age" | "needs_bodyweight";

export interface StandardProgress {
  standard: StandardDef;
  /** Athlete's best value in the standard's unit, or null when never logged. */
  value: number | null;
  /** Highest tier cleared, or null. */
  achieved: StandardTier | null;
  /** Next tier to chase (null once world class is held). */
  next: StandardTier | null;
  nextTarget: number | null;
  /** 0..1 progress toward `next`. */
  pctToNext: number;
  /** Within 10% of the next tier. */
  closing: boolean;
  eligible: boolean;
  reason: EligibilityReason;
  /** Movement that produced the best value (load/rep/distance marks). */
  bestSlug: string | null;
}

function bestValueFor(def: StandardDef, idx: BestIndex, bw: number | null): { value: number | null; slug: string | null } {
  switch (def.metric) {
    case "mph": {
      const v = def.metricKey ? idx.canonical[def.metricKey] : undefined;
      return { value: typeof v === "number" && v > 0 ? v : null, slug: null };
    }
    case "reps": {
      let best = 0;
      let slug: string | null = null;
      for (const s of def.slugs) {
        const b = idx.bySlug[s];
        if (b && b.maxReps > best) {
          best = b.maxReps;
          slug = s;
        }
      }
      return { value: best > 0 ? best : null, slug };
    }
    case "seconds": {
      let best = 0;
      let slug: string | null = null;
      for (const s of def.slugs) {
        const b = idx.bySlug[s];
        if (b && b.maxSeconds > best) {
          best = b.maxSeconds;
          slug = s;
        }
      }
      return { value: best > 0 ? best : null, slug };
    }
    case "distance_ft": {
      let best = 0;
      let slug: string | null = null;
      for (const s of def.slugs) {
        const b = idx.bySlug[s];
        if (b && b.maxDistance > best) {
          best = b.maxDistance;
          slug = s;
        }
      }
      return { value: best > 0 ? best : null, slug };
    }
    case "load_pct_bw_at_reps": {
      if (!bw || bw <= 0) return { value: null, slug: null };
      const need = def.reps ?? 1;
      let best = 0;
      let slug: string | null = null;
      for (const s of def.slugs) {
        const b = idx.bySlug[s];
        if (!b) continue;
        for (const p of b.loadPairs) {
          if (p.reps < need) continue;
          const pct = (p.weight / bw) * 100;
          if (pct > best) {
            best = pct;
            slug = s;
          }
        }
      }
      return { value: best > 0 ? Math.round(best) : null, slug };
    }
    case "combined_pct_bw": {
      if (!bw || bw <= 0) return { value: null, slug: null };
      // Best top-set load per lift family, summed. A lift never logged
      // contributes zero — the mark is simply not reachable until it is.
      const groups: Record<string, string[]> = {
        squat: def.slugs.filter((s) => /squat/.test(s)),
        pull: def.slugs.filter((s) => /deadlift|chain|band_dead|deficit|trap_bar/.test(s)),
        press: def.slugs.filter((s) => /bench|press/.test(s)),
      };
      let total = 0;
      let logged = 0;
      for (const slugs of Object.values(groups)) {
        let best = 0;
        for (const s of slugs) {
          for (const p of idx.bySlug[s]?.loadPairs ?? []) {
            if (p.weight > best) best = p.weight;
          }
        }
        if (best > 0) logged += 1;
        total += best;
      }
      if (logged === 0) return { value: null, slug: null };
      return { value: Math.round((total / bw) * 100), slug: null };
    }
    default:
      return { value: null, slug: null };
  }
}

export function evaluateStandard(def: StandardDef, idx: BestIndex, m: AthleteMeasures): StandardProgress {
  const needsBw = def.metric === "load_pct_bw_at_reps" || def.metric === "combined_pct_bw";
  let reason: EligibilityReason = "ok";
  if (m.chronologicalAge !== null && m.chronologicalAge < def.minAgeYears) reason = "age";
  else if (!trainingAgeMeets(m.trainingAge, def.minTrainingAge)) reason = "training_age";
  else if (needsBw && (!m.bodyweightLbs || m.bodyweightLbs <= 0)) reason = "needs_bodyweight";

  const { value, slug } = bestValueFor(def, idx, m.bodyweightLbs);

  let achieved: StandardTier | null = null;
  if (value !== null) {
    for (const t of TIER_ORDER) {
      if (value >= def.targets[t]) achieved = t;
    }
  }
  const nextIdx = achieved ? TIER_ORDER.indexOf(achieved) + 1 : 0;
  const next = nextIdx < TIER_ORDER.length ? TIER_ORDER[nextIdx] : null;
  const nextTarget = next ? def.targets[next] : null;
  const pctToNext = next && nextTarget ? Math.max(0, Math.min(1, (value ?? 0) / nextTarget)) : 1;

  return {
    standard: def,
    value,
    achieved,
    next,
    nextTarget,
    pctToNext,
    closing: !!next && pctToNext >= 0.9 && pctToNext < 1,
    eligible: reason === "ok",
    reason,
    bestSlug: slug,
  };
}

export function evaluateAll(idx: BestIndex, m: AthleteMeasures): StandardProgress[] {
  return STANDARDS.map((d) => evaluateStandard(d, idx, m));
}

/** Standards a given movement slug can contribute to. */
export function standardsForSlug(slug: string): StandardDef[] {
  return STANDARDS.filter((s) => s.slugs.includes(slug));
}

/** Target load in lbs for a % BW mark — used for the on-card target line. */
export function targetLoadLbs(def: StandardDef, tier: StandardTier, bw: number | null): number | null {
  if (def.metric !== "load_pct_bw_at_reps" || !bw || bw <= 0) return null;
  return Math.round((def.targets[tier] / 100) * bw);
}

/** Tiers newly cleared by `after` that were not cleared by `before`. */
export function newlyEarned(before: StandardProgress[], after: StandardProgress[]): Array<{ def: StandardDef; tier: StandardTier; value: number }> {
  const prev = new Map(before.map((p) => [p.standard.id, p.achieved]));
  const out: Array<{ def: StandardDef; tier: StandardTier; value: number }> = [];
  for (const p of after) {
    if (!p.achieved || p.value === null) continue;
    const was = prev.get(p.standard.id) ?? null;
    const wasRank = was ? TIER_ORDER.indexOf(was) : -1;
    const nowRank = TIER_ORDER.indexOf(p.achieved);
    for (let i = wasRank + 1; i <= nowRank; i++) {
      out.push({ def: p.standard, tier: TIER_ORDER[i], value: p.value });
    }
  }
  return out;
}

/** Merge two best-indexes (e.g. history plus the set being saved right now). */
export function mergeIndexes(a: BestIndex, b: BestIndex): BestIndex {
  const bySlug: Record<string, SlugBest> = {};
  for (const src of [a, b]) {
    for (const [slug, v] of Object.entries(src.bySlug)) {
      const t = (bySlug[slug] ??= emptyBest());
      t.loadPairs = t.loadPairs.concat(v.loadPairs);
      t.maxReps = Math.max(t.maxReps, v.maxReps);
      t.maxDistance = Math.max(t.maxDistance, v.maxDistance);
      t.maxSeconds = Math.max(t.maxSeconds, v.maxSeconds);
    }
  }
  const canonical: Record<string, number> = { ...a.canonical };
  for (const [k, v] of Object.entries(b.canonical)) {
    canonical[k] = Math.max(canonical[k] ?? 0, v);
  }
  return { bySlug, canonical };
}
