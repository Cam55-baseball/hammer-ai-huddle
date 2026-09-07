/**
 * Season Quarter Mesocycles — splits each season phase into Q1..Q4 so the
 * program has a real mesocycle arc instead of a flat "in-season / off-season"
 * label.
 *
 * Honesty rules (no fabricated phases):
 *  - The phase comes from the SAME resolver the rest of the app uses
 *    (`resolveSeasonPhase` / `resolveWkPhase`, i.e. real season-date windows,
 *    then the stored status). Callers pass that resolution in.
 *  - If the phase resolution had no real signal (`source === 'default'`) we do
 *    NOT print a confident "Off-season Q2". We return an UNSET descriptor
 *    (`phaseKnown: false`) and the UI asks the athlete to set season dates.
 *  - If the phase is known but the phase start date is missing, the phase is
 *    shown without a fabricated quarter (`quarterKnown: false`) and dosing
 *    falls back to the conservative middle multipliers.
 */
import type { AthleteContextProjection } from "@/lib/hammer/context/decisionFilters";

export type SeasonPhase = "off" | "pre" | "in" | "post";
export type SeasonQuarter = 1 | 2 | 3 | 4;
export type SeasonPhaseSource = "date_window" | "stored" | "manual" | "default";

export interface QuarterDescriptor {
  readonly phase: SeasonPhase;
  readonly quarter: SeasonQuarter;
  /** False when nothing real (dates or stored status) backed the phase. */
  readonly phaseKnown: boolean;
  /** False when we have a phase but no phase-start date to slice quarters. */
  readonly quarterKnown: boolean;
  readonly label: string;             // e.g. "Off-season Q2 · Strength"
  readonly accent: string;            // one-word accent
  readonly headline: string;
  readonly description: string;
  /** Multiplier on recovery windows (>1 = longer clock, <1 = tighter). */
  readonly recoveryWindowMultiplier: number;
  /** Ceiling multiplier on prescribed volume this quarter. */
  readonly volumeCeilingMultiplier: number;
}


const TABLE: Record<SeasonPhase, Record<SeasonQuarter, Omit<QuarterDescriptor, "phase" | "quarter" | "phaseKnown" | "quarterKnown">>> = {
  off: {
    1: { label: "Off-season Q1 · Hypertrophy", accent: "Hypertrophy",
         headline: "Build the tissue.", description: "Higher-volume lifting, controlled skill volume — the arm and hip machinery is being built.",
         recoveryWindowMultiplier: 1.10, volumeCeilingMultiplier: 0.9 },
    2: { label: "Off-season Q2 · Strength", accent: "Strength",
         headline: "Turn tissue into force.", description: "Heavier lifts, longer rests. Skills held at capacity dose so lifts stay the priority.",
         recoveryWindowMultiplier: 1.00, volumeCeilingMultiplier: 1.0 },
    3: { label: "Off-season Q3 · Power", accent: "Power",
         headline: "Turn force into speed.", description: "Power blocks, max-velocity sprints, contrast work. Recovery clock tightens as intensity rises.",
         recoveryWindowMultiplier: 0.95, volumeCeilingMultiplier: 1.0 },
    4: { label: "Off-season Q4 · Taper-in", accent: "Taper",
         headline: "Sharpen and taper.", description: "Reduce volume, hold intent. Skills climb toward pre-season.",
         recoveryWindowMultiplier: 0.90, volumeCeilingMultiplier: 0.85 },
  },
  pre: {
    1: { label: "Pre-season Q1 · Velocity build", accent: "Velocity",
         headline: "Build throwing velocity.", description: "Throwing ladder ramps. Bat speed density climbs. Lifts hold at 3x/wk.",
         recoveryWindowMultiplier: 0.95, volumeCeilingMultiplier: 1.0 },
    2: { label: "Pre-season Q2 · Skill density", accent: "Skill",
         headline: "Reps that count.", description: "Skill volume with intent. Speed 3x/wk with acceleration bias.",
         recoveryWindowMultiplier: 0.90, volumeCeilingMultiplier: 1.0 },
    3: { label: "Pre-season Q3 · Game readiness", accent: "Readiness",
         headline: "Rehearse the game.", description: "Live scenarios, competitive rounds. Lifts trim to sharpness.",
         recoveryWindowMultiplier: 0.85, volumeCeilingMultiplier: 0.9 },
    4: { label: "Pre-season Q4 · Competition primer", accent: "Primer",
         headline: "Peaked and rested.", description: "Deload week. Freshness > volume — first live games arriving.",
         recoveryWindowMultiplier: 0.80, volumeCeilingMultiplier: 0.7 },
  },
  in: {
    1: { label: "In-season Q1 · Heavy maintenance", accent: "Maintain",
         headline: "Hold the strength you built.", description: "2x/wk maintenance lifts, skill work daily but capped.",
         recoveryWindowMultiplier: 1.00, volumeCeilingMultiplier: 0.8 },
    2: { label: "In-season Q2 · Sharpness", accent: "Sharp",
         headline: "Sharpen the tools.", description: "1x freshness speed. Skill volume with high intent, low count.",
         recoveryWindowMultiplier: 1.00, volumeCeilingMultiplier: 0.7 },
    3: { label: "In-season Q3 · Preserve", accent: "Preserve",
         headline: "Preserve the arm and legs.", description: "Everything is subordinate to Saturday's game.",
         recoveryWindowMultiplier: 1.10, volumeCeilingMultiplier: 0.6 },
    4: { label: "In-season Q4 · Playoff peaking", accent: "Peaking",
         headline: "Best version, now.", description: "Micro-taper into playoffs. Freshness is the goal.",
         recoveryWindowMultiplier: 1.15, volumeCeilingMultiplier: 0.55 },
  },
  post: {
    1: { label: "Post-season Q1 · Unload", accent: "Unload",
         headline: "Full unload.", description: "Rest, mobility, film. Nothing forced.",
         recoveryWindowMultiplier: 1.30, volumeCeilingMultiplier: 0.4 },
    2: { label: "Post-season Q2 · Restoration", accent: "Restore",
         headline: "Restore tissue.", description: "Movement quality, sleep, low-intent skill work.",
         recoveryWindowMultiplier: 1.20, volumeCeilingMultiplier: 0.5 },
    3: { label: "Post-season Q3 · Movement quality", accent: "Movement",
         headline: "Fix the leaks.", description: "Corrective + FRC + light strength returns.",
         recoveryWindowMultiplier: 1.15, volumeCeilingMultiplier: 0.7 },
    4: { label: "Post-season Q4 · Base rebuild", accent: "Rebuild",
         headline: "Rebuild the base.", description: "General strength + capacity returns. Onramp to off-season.",
         recoveryWindowMultiplier: 1.05, volumeCeilingMultiplier: 0.85 },
  },
};

function coercePhase(v: string | null): SeasonPhase {
  return v === "pre" || v === "in" || v === "post" ? v : "off";
}

/**
 * Compute weeks between two dates (ISO). Floors, never negative.
 */
function weeksBetween(startIso: string | null, today: Date): number {
  if (!startIso) return -1;
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return -1;
  const ms = today.getTime() - start.getTime();
  if (ms < 0) return 0;
  return Math.floor(ms / (7 * 24 * 60 * 60 * 1000));
}

/**
 * A phase typically spans ~12 weeks; each quarter ≈ 3 weeks. Athletes with
 * no phase-start date default to Q2 (safe middle).
 */
export function quartersFromWeeks(weeks: number): SeasonQuarter {
  if (weeks < 0) return 2;
  if (weeks < 3) return 1;
  if (weeks < 6) return 2;
  if (weeks < 9) return 3;
  return 4;
}

export interface SeasonQuarterInput {
  /** ISO start of the current phase, from the canonical season resolver. */
  readonly phaseStartedAt?: string | null;
  /** Canonical phase (short form) from `resolveSeasonPhase`/`resolveWkPhase`. */
  readonly resolvedPhase?: SeasonPhase | null;
  /** Where that phase came from. `default` == no real signal. */
  readonly phaseSource?: SeasonPhaseSource | null;
}

export const UNSET_QUARTER: QuarterDescriptor = {
  phase: "off",
  quarter: 2,
  phaseKnown: false,
  quarterKnown: false,
  label: "Season phase not set",
  accent: "Unset",
  headline: "Set your season dates.",
  description:
    "No season dates or phase are on file, so we can't say which block you're in. Set your season dates in your profile and this becomes a real mesocycle arc.",
  // Conservative middle dosing until the athlete tells us the truth.
  recoveryWindowMultiplier: 1.0,
  volumeCeilingMultiplier: 0.85,
};

export function resolveSeasonQuarter(
  proj: AthleteContextProjection,
  input: SeasonQuarterInput | string | null,
  today: Date,
): QuarterDescriptor {
  const opts: SeasonQuarterInput =
    input == null
      ? { phaseStartedAt: null }
      : typeof input === "string"
        ? { phaseStartedAt: input }
        : input;

  const phaseStartedAt = opts.phaseStartedAt ?? null;
  const source = opts.phaseSource ?? null;

  // Unified with the canonical season resolver: prefer its phase, fall back to
  // the context projection only when the caller didn't pass one.
  const rawPhase = opts.resolvedPhase ?? (proj.seasonPhase as string | null);
  const phaseIsReal =
    source != null ? source !== "default" : rawPhase === "pre" || rawPhase === "in" || rawPhase === "post" || rawPhase === "off";

  if (!phaseIsReal) return UNSET_QUARTER;

  const phase = coercePhase(rawPhase ?? null);
  const weeks = weeksBetween(phaseStartedAt, today);
  const quarterKnown = weeks >= 0;
  const q = quartersFromWeeks(weeks);
  const row = TABLE[phase][q];
  if (!quarterKnown) {
    const phaseName = row.label.split(" ")[0]; // "Off-season" / "In-season" ...
    return {
      phase,
      quarter: q,
      phaseKnown: true,
      quarterKnown: false,
      label: `${phaseName} · block not set`,
      accent: row.accent,
      headline: row.headline,
      description:
        "We know your season phase, but not when it started — so we can't place you in a specific block. Add your season dates to unlock the quarter arc.",
      recoveryWindowMultiplier: 1.0,
      volumeCeilingMultiplier: 0.85,
    };
  }
  return { phase, quarter: q, phaseKnown: true, quarterKnown: true, ...row };
}

