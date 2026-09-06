// _shared/wic/safePlan.ts — Stage 1, BUG-2.
//
// L0.1: "Hammer's Today always produces a card. Never an error with nothing to
// show, for any user, any category, any reason."
//
// Before this module a single fatal from any of the 17 validator codes dropped
// the entire day's plan and the athlete saw "Plan couldn't publish". The ladder
// below steps down instead of falling over:
//
//   1. Every fatal is logged in full to wk_generation_diagnostics (caller).
//   2. Drop the offending rows, re-validate. Most fatals are row-scoped.
//   3. Reduce to a legal core: movement prep / warm-up / recovery, time-dosed
//      only, so envelope math cannot apply.
//   4. Safe Session — hardcoded, no catalog lookup, bodyweight, equipment-free,
//      legal at 14 in every phase, game-day legal.
//
// This module never produces a set or rep number for a lift. Every row it can
// emit itself is time-dosed, so `resolveDose()` remains the only dose authority.

import type { ValidationIssue, ValidatorInput, ValidatorReport } from "./validator.ts";

export type SafePlanTier = "full" | "rows_dropped" | "legal_core" | "safe_session";

export const SAFE_PLAN_COPY =
  "We couldn't build your full session today. Here's a session that keeps you moving.";

type Rx = ValidatorInput["prescriptions"][number] & Record<string, unknown>;

export interface SafePlanResult<T> {
  tier: SafePlanTier;
  rows: T[];
  /** Validator report for the rows actually returned. */
  report: ValidatorReport;
  /** Slugs removed on the way down the ladder. */
  droppedSlugs: string[];
  /** Every fatal seen at any rung — nothing swallowed. */
  fatals: ValidationIssue[];
  copy: string | null;
}

/** Slots that survive the "legal core" rung. All are game-day legal. */
const LEGAL_CORE_SLOTS = new Set(["movement_prep", "warmup", "recovery"]);

/**
 * The Safe Session. No catalog lookup — these rows exist in code so a broken,
 * empty or unreachable catalog can never empty the card. Bodyweight,
 * equipment-free, time-dosed, unique names under `normalizeName`, and legal for
 * a 14-year-old in every phase including a game day.
 */
export function safeSessionRows(): Rx[] {
  const base = {
    sequence_role: "trunk_primer",
    sets: null as number | null,
    reps: null as number | null,
    dosage_unit: "seconds",
    tempo: null,
    load_pct: null,
    distance_feet: null,
    total_reps: null,
    cns_cost: 0,
    cns_clamped: false,
    engine: "safe_plan",
    adaptation: "recovery",
    why_v2: null,
  };
  const drills: Array<[string, string, number, string]> = [
    ["safe_cat_cow", "Cat Cow", 60, "Wake the spine up segment by segment."],
    ["safe_hip_circle", "Hip Circle", 60, "Open the hips through their full circle, both directions."],
    ["safe_leg_swing_lateral", "Lateral Leg Swing", 60, "Loose side-to-side swings, 30 seconds a leg."],
    ["safe_squat_toe_touch", "Squat Toe Touch", 60, "Squat down, reach the toes, stand tall."],
    ["safe_dead_bug_hold", "Dead Bug Hold", 60, "Ribs down, low back flat, breathe."],
    ["safe_band_pull_apart_iso", "Shoulder Blade Squeeze", 60, "Squeeze the shoulder blades, hold, release."],
    ["safe_calf_stretch", "Single Leg Calf Stretch", 60, "30 seconds a side against a wall."],
    ["safe_dead_hang_or_reach", "Overhead Reach Hold", 60, "Reach tall overhead and hold, or hang from a bar."],
  ];
  return drills.map(([slug, name, seconds, rationale], i) => ({
    ...base,
    slot: "warmup",
    sequence_order: i,
    movement_slug: slug,
    movement_name: name,
    duration_seconds: seconds,
    rationale,
    why_payload: {
      safe_plan: true,
      safe_plan_tier: "safe_session",
      training_domain: "recovery",
      progression: { block: null, week: null, source: "safe_plan" },
      placement: "safe_session",
    },
  })) as unknown as Rx[];
}

/** Row-scoped fatals name their movement; slot-scoped ones name their slot. */
function implicatedSlots(issue: ValidationIssue): string[] {
  const m = String(issue.message ?? "").match(/"([a-z_]+)"/g);
  return m ? m.map((s) => s.replace(/"/g, "")) : [];
}

export function buildSafePlan<T extends Rx>(opts: {
  rxs: T[];
  phase: string;
  isGameDay: boolean;
  validate: (input: ValidatorInput) => ValidatorReport;
  firstReport?: ValidatorReport;
}): SafePlanResult<T> {
  const { rxs, phase, isGameDay, validate } = opts;
  const run = (rows: T[]) =>
    validate({ phase, isGameDay, prescriptions: rows as unknown as ValidatorInput["prescriptions"] });

  const seenFatals: ValidationIssue[] = [];
  const dropped: string[] = [];
  const collect = (r: ValidatorReport) => {
    for (const i of r.issues) if (i.severity === "fatal") seenFatals.push(i);
    return r;
  };

  const first = opts.firstReport ?? run(rxs);
  collect(first);
  if (first.ok) {
    return { tier: "full", rows: rxs, report: first, droppedSlugs: [], fatals: [], copy: null };
  }

  // ── Rung 2: drop the offending rows, re-validate. Iterate, because dropping a
  // row can expose a second row-scoped fatal underneath it.
  let working = [...rxs];
  let report = first;
  for (let pass = 0; pass < 6 && !report.ok && working.length > 0; pass++) {
    const badSlugs = new Set<string>();
    const badSlots = new Set<string>();
    for (const issue of report.issues) {
      if (issue.severity !== "fatal") continue;
      if (issue.slug) badSlugs.add(issue.slug);
      else for (const s of implicatedSlots(issue)) badSlots.add(s);
    }
    if (badSlugs.size === 0 && badSlots.size === 0) break; // unattributable — fall through
    const next = working.filter(
      (r) => !badSlugs.has(String(r.movement_slug)) && !badSlots.has(String(r.slot)),
    );
    if (next.length === working.length) break; // no progress — fall through
    for (const r of working) {
      if (!next.includes(r)) dropped.push(String(r.movement_slug));
    }
    working = next;
    report = collect(run(working));
  }
  if (report.ok && working.length > 0) {
    return { tier: "rows_dropped", rows: working, report, droppedSlugs: dropped, fatals: seenFatals, copy: SAFE_PLAN_COPY };
  }

  // ── Rung 3: legal core — prep / warm-up / recovery, time-dosed only.
  const core = rxs.filter((r) => {
    if (!LEGAL_CORE_SLOTS.has(String(r.slot))) return false;
    const unit = String((r as { dosage_unit?: string | null }).dosage_unit ?? "reps").toLowerCase();
    const timeDosed =
      unit !== "reps" && unit !== "rep" && unit !== "" ||
      (r as { duration_seconds?: number | null }).duration_seconds != null;
    return timeDosed;
  });
  if (core.length > 0) {
    const coreReport = collect(run(core));
    if (coreReport.ok) {
      for (const r of rxs) if (!core.includes(r)) dropped.push(String(r.movement_slug));
      return { tier: "legal_core", rows: core, report: coreReport, droppedSlugs: dropped, fatals: seenFatals, copy: SAFE_PLAN_COPY };
    }
  }

  // ── Rung 4: the Safe Session. Always renders.
  const safe = safeSessionRows() as unknown as T[];
  const safeReport = run(safe);
  for (const r of rxs) dropped.push(String(r.movement_slug));
  return { tier: "safe_session", rows: safe, report: safeReport, droppedSlugs: dropped, fatals: seenFatals, copy: SAFE_PLAN_COPY };
}
