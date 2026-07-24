/**
 * Weekly Microcycle Engine
 * ────────────────────────
 * Pure, deterministic authority for "does this modality run today, why,
 * and when does it come back?"  No I/O, no side effects, replay-safe:
 * a `today: Date` is always injected so unit tests are frame-stable.
 *
 * Consumed by `buildHammerDailyPlan` as a POST-PROCESSOR — the existing
 * builders still assemble every block, and the microcycle re-writes the
 * ones that shouldn't run today into `off-day` blocks with a visible
 * "Next: Thu" rationale.  Rules that outrank the microcycle (injury,
 * parent supremacy, game/tournament posture, readiness deload) already
 * ran before this stage and are preserved: an `awaiting-input` or
 * `suppressed` block is NEVER promoted back to `ready` by the microcycle.
 *
 * Constitutional stance:
 *   - Never authors organism truth.
 *   - Interpretive-only reshape of the prescription envelope.
 *   - Missingness-permissive: unknown season / availability → permissive
 *     everyday template (matches prior behaviour) rather than fabricating
 *     a false rest schedule.
 */
import type { AthleteContextProjection } from "@/lib/hammer/context/decisionFilters";
import type { ModalityKey } from "./dailyPlan";

/** Day-of-week using JS getDay(): 0=Sun … 6=Sat */
export type Dow = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type ModalityIntensity =
  | "primary"      // full prescription
  | "secondary"   // trim to ~60%
  | "activation"  // trim to ~30%
  | "off";        // convert to off-day card

export interface ModalityDayDecision {
  readonly scheduled: boolean;             // false → off-day card
  readonly intensity: ModalityIntensity;
  readonly microcycleLabel: string;        // e.g. "Day 2 of 5 · Heavy lower"
  readonly nextScheduledDow: Dow | null;   // next day this modality returns
  readonly nextScheduledLabel: string | null; // "Wed" | "in 2 days" | null
  readonly reason: string;
}

/** Template = for each modality, the ordered set of days-of-week it runs. */
export type WeeklyTemplate = {
  readonly id: string;
  readonly label: string;
  readonly perModality: Record<ModalityKey, ReadonlyArray<Dow>>;
  /**
   * Optional intensity accent per (modality, dow).  When absent the day
   * defaults to `primary`.
   */
  readonly intensityOverrides?: Partial<Record<ModalityKey, Partial<Record<Dow, ModalityIntensity>>>>;
  /** Optional per-day accent label (e.g. "Heavy lower" for Mon lift). */
  readonly dayLabels?: Partial<Record<ModalityKey, Partial<Record<Dow, string>>>>;
  /**
   * Deterministic priority order for skill days when the ladder target is
   * lower or higher than the template's base slots. Days earlier in the
   * list are picked/kept first; extra days added beyond template slots
   * come from the tail of this ordering and render at `activation`.
   */
  readonly priorityDayOrder?: Partial<Record<ModalityKey, ReadonlyArray<Dow>>>;
};

/** Modalities the microcycle actually schedules on/off. */
export const SCHEDULABLE_MODALITIES: ReadonlyArray<ModalityKey> = [
  "speed",
  "strength",
  "hitting",
  "throwing",
  "defense",
  "baserunning",
];

/** Anchors that always render (never turned into off-day cards). */
export const ANCHOR_MODALITIES: ReadonlyArray<ModalityKey> = [
  "warmup",
  "fueling",
  "recovery",
  "game_iq",
];

const DOW_SHORT: Record<Dow, string> = {
  0: "Sun",
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
};

/* ── Templates ──────────────────────────────────────────────────────────── */

/**
 * OFF-SEASON — 5-day athlete.
 * CNS pairing: heavy lift Mon/Thu (lower/upper split), max-velocity Tue/Fri
 * (never adjacent to heavy lower), Wed full recovery, Sat skill volume,
 * Sun rest.
 */
const OFF_SEASON_5D: WeeklyTemplate = {
  id: "off_5d",
  label: "Off-season · 5-day build",
  perModality: {
    warmup:      [0, 1, 2, 3, 4, 5, 6],
    fueling:     [0, 1, 2, 3, 4, 5, 6],
    recovery:    [0, 1, 2, 3, 4, 5, 6],
    game_iq:     [0, 1, 2, 3, 4, 5, 6],
    speed:       [2, 5],                   // Tue, Fri
    strength:    [1, 2, 4, 5],             // Mon, Tue, Thu, Fri
    hitting:     [1, 2, 4, 5, 6],          // Mon, Tue, Thu, Fri, Sat
    throwing:    [1, 2, 4, 5, 6],
    defense:     [2, 4, 6],                // Tue, Thu, Sat
    baserunning: [5, 6],                   // Fri, Sat
  },
  intensityOverrides: {
    hitting:  { 6: "secondary" },            // Sat: skill volume, not max
    throwing: { 6: "secondary" },
    speed:    { 5: "secondary" },            // Fri: accel base, not max-vel again
  },
  dayLabels: {
    strength: { 1: "Heavy lower", 2: "Upper push", 4: "Heavy upper", 5: "Lower dynamic" },
    speed:    { 2: "Max velocity", 5: "Acceleration base" },
  },
  priorityDayOrder: {
    hitting:     [1, 4, 6, 2, 5, 3, 0],
    throwing:    [1, 4, 6, 2, 5, 3, 0],
    defense:     [2, 4, 6, 1, 5, 3, 0],
    baserunning: [5, 6, 3, 1, 4, 2, 0],
  },
};

/** OFF-SEASON — 4-day athlete (drop Fri/Sat volume). */
const OFF_SEASON_4D: WeeklyTemplate = {
  id: "off_4d",
  label: "Off-season · 4-day build",
  perModality: {
    warmup: [0, 1, 2, 3, 4, 5, 6],
    fueling: [0, 1, 2, 3, 4, 5, 6],
    recovery: [0, 1, 2, 3, 4, 5, 6],
    game_iq: [0, 1, 2, 3, 4, 5, 6],
    speed:    [2, 5],
    strength: [1, 2, 4, 5],
    hitting:  [1, 2, 4, 5],
    throwing: [1, 2, 4, 5],
    defense:  [2, 4],
    baserunning: [5],
  },
  dayLabels: {
    strength: { 1: "Heavy lower", 2: "Upper", 4: "Heavy upper", 5: "Lower dynamic" },
    speed:    { 2: "Max velocity", 5: "Acceleration" },
  },
  priorityDayOrder: {
    hitting:     [1, 4, 2, 5, 6, 3, 0],
    throwing:    [1, 4, 2, 5, 6, 3, 0],
    defense:     [2, 4, 6, 1, 5, 3, 0],
    baserunning: [5, 6, 3, 1, 4, 2, 0],
  },
};

/** PRE-SEASON — sharpen skills, hold strength, keep speed sharp. */
const PRE_SEASON_5D: WeeklyTemplate = {
  id: "pre_5d",
  label: "Pre-season · sharpen",
  perModality: {
    warmup: [0, 1, 2, 3, 4, 5, 6],
    fueling: [0, 1, 2, 3, 4, 5, 6],
    recovery: [0, 1, 2, 3, 4, 5, 6],
    game_iq: [0, 1, 2, 3, 4, 5, 6],
    speed:       [1, 3, 5],
    strength:    [1, 3, 5],
    hitting:     [1, 2, 3, 4, 5],
    throwing:    [1, 2, 3, 4, 5],
    defense:     [2, 4, 6],
    baserunning: [3, 6],
  },
  intensityOverrides: {
    strength: { 5: "secondary" },
    speed:    { 5: "secondary" },
  },
  dayLabels: {
    strength: { 1: "Heavy full-body", 3: "Dynamic effort", 5: "Repetition effort" },
    speed:    { 1: "Acceleration", 3: "Max velocity", 5: "Tempo / freshness" },
  },
  priorityDayOrder: {
    hitting:     [1, 3, 5, 2, 4, 6, 0],
    throwing:    [1, 3, 5, 2, 4, 6, 0],
    defense:     [2, 4, 6, 1, 3, 5, 0],
    baserunning: [3, 6, 1, 5, 2, 4, 0],
  },
};

/**
 * IN-SEASON — game preservation.  Lift 2× (Mon/Thu maintenance), speed 1×
 * for freshness only, skill work daily but capped at secondary/activation.
 */
const IN_SEASON: WeeklyTemplate = {
  id: "in_season",
  label: "In-season · preserve & compete",
  perModality: {
    warmup: [0, 1, 2, 3, 4, 5, 6],
    fueling: [0, 1, 2, 3, 4, 5, 6],
    recovery: [0, 1, 2, 3, 4, 5, 6],
    game_iq: [0, 1, 2, 3, 4, 5, 6],
    speed:       [2],                          // Tue freshness only
    strength:    [1, 4],                       // Mon + Thu maintenance
    hitting:     [1, 2, 3, 4, 5, 6],
    throwing:    [1, 2, 3, 4, 5],
    defense:     [2, 4],
    baserunning: [3],
  },
  intensityOverrides: {
    hitting: {
      1: "secondary", 2: "activation", 3: "secondary",
      4: "activation", 5: "secondary", 6: "activation",
    },
    throwing: {
      1: "secondary", 2: "activation", 3: "secondary",
      4: "activation", 5: "activation",
    },
    strength: { 1: "secondary", 4: "secondary" },
    speed:    { 2: "activation" },
  },
  dayLabels: {
    strength: { 1: "Maintenance", 4: "Maintenance" },
    speed:    { 2: "Freshness (short reps)" },
  },
  priorityDayOrder: {
    hitting:     [1, 3, 5, 2, 4, 6, 0],
    throwing:    [1, 3, 5, 2, 4, 6, 0],
    defense:     [2, 4, 6, 1, 3, 5, 0],
    baserunning: [3, 6, 1, 5, 2, 4, 0],
  },
};

/** POST-SEASON — recovery-first. */
const POST_SEASON: WeeklyTemplate = {
  id: "post_season",
  label: "Post-season · recover & rebuild base",
  perModality: {
    warmup: [0, 1, 2, 3, 4, 5, 6],
    fueling: [0, 1, 2, 3, 4, 5, 6],
    recovery: [0, 1, 2, 3, 4, 5, 6],
    game_iq: [0, 1, 2, 3, 4, 5, 6],
    speed:       [3],
    strength:    [2, 5],
    hitting:     [2, 5],
    throwing:    [3],
    defense:     [5],
    baserunning: [],
  },
  intensityOverrides: {
    strength: { 2: "secondary", 5: "secondary" },
    speed:    { 3: "activation" },
    hitting:  { 2: "activation", 5: "activation" },
    throwing: { 3: "activation" },
  },
  dayLabels: {
    strength: { 2: "Rebuild base", 5: "Rebuild base" },
  },
  priorityDayOrder: {
    hitting:     [2, 5, 3, 1, 4, 6, 0],
    throwing:    [3, 1, 5, 2, 4, 6, 0],
    defense:     [5, 2, 4, 6, 1, 3, 0],
    baserunning: [3, 6, 1, 5, 2, 4, 0],
  },
};

/** YOUTH (U14 and below or lifting_age < 1yr) — motor-learning bias. */
const YOUTH: WeeklyTemplate = {
  id: "youth",
  label: "Youth · motor learning",
  perModality: {
    warmup: [0, 1, 2, 3, 4, 5, 6],
    fueling: [0, 1, 2, 3, 4, 5, 6],
    recovery: [0, 1, 2, 3, 4, 5, 6],
    game_iq: [0, 1, 2, 3, 4, 5, 6],
    speed:       [2, 4],
    strength:    [1, 4],                    // 2× only, movement quality
    hitting:     [1, 2, 3, 4, 5],
    throwing:    [1, 2, 3, 4, 5],
    defense:     [2, 4, 6],
    baserunning: [3, 6],
  },
  intensityOverrides: {
    strength: { 1: "secondary", 4: "secondary" },
    speed:    { 2: "activation", 4: "activation" },
  },
  dayLabels: {
    strength: { 1: "Movement quality", 4: "Movement quality" },
    speed:    { 2: "Short ATP-CP", 4: "Short ATP-CP" },
  },
  priorityDayOrder: {
    hitting:     [1, 3, 5, 2, 4, 6, 0],
    throwing:    [1, 3, 5, 2, 4, 6, 0],
    defense:     [2, 4, 6, 1, 3, 5, 0],
    baserunning: [3, 6, 1, 5, 2, 4, 0],
  },
};

/** Permissive fallback when we truly can't classify the athlete. */
const PERMISSIVE_DAILY: WeeklyTemplate = {
  id: "permissive",
  label: "Everyday · unclassified",
  perModality: {
    warmup: [0, 1, 2, 3, 4, 5, 6],
    fueling: [0, 1, 2, 3, 4, 5, 6],
    recovery: [0, 1, 2, 3, 4, 5, 6],
    game_iq: [0, 1, 2, 3, 4, 5, 6],
    speed:       [1, 3, 5],
    strength:    [1, 2, 4, 5],
    hitting:     [1, 2, 3, 4, 5, 6],
    throwing:    [1, 2, 3, 4, 5, 6],
    defense:     [2, 4, 6],
    baserunning: [3, 6],
  },
  priorityDayOrder: {
    hitting:     [1, 3, 5, 2, 4, 6, 0],
    throwing:    [1, 3, 5, 2, 4, 6, 0],
    defense:     [2, 4, 6, 1, 3, 5, 0],
    baserunning: [3, 6, 1, 5, 2, 4, 0],
  },
};

/* ── Resolver ───────────────────────────────────────────────────────────── */

export function resolveWeeklyTemplate(proj: AthleteContextProjection): WeeklyTemplate {
  const band = proj.lifecycleBand;
  const youngBand = band === "u10" || band === "u12" || band === "u14";
  const lowLiftingAge = typeof proj.liftingAgeYears === "number" && proj.liftingAgeYears < 1;
  if (youngBand || lowLiftingAge) return YOUTH;

  const phase = proj.seasonPhase;
  const days = proj.weeklyAvailabilityDays;

  if (phase === "in") return IN_SEASON;
  if (phase === "post") return POST_SEASON;
  if (phase === "pre") return PRE_SEASON_5D;
  if (phase === "off") {
    if (typeof days === "number" && days <= 4) return OFF_SEASON_4D;
    return OFF_SEASON_5D;
  }
  return PERMISSIVE_DAILY;
}

/* ── Applier ────────────────────────────────────────────────────────────── */

function nextScheduled(today: Dow, dows: ReadonlyArray<Dow>): Dow | null {
  if (dows.length === 0) return null;
  for (let i = 1; i <= 7; i++) {
    const d = ((today + i) % 7) as Dow;
    if (dows.includes(d)) return d;
  }
  return null;
}

function daysUntil(today: Dow, target: Dow): number {
  return ((target - today + 7) % 7) || 7;
}

function orderedFromToday(dows: ReadonlyArray<Dow>, today: Dow): Dow[] {
  const sorted = [...new Set(dows)].sort((a, b) => a - b);
  const rotated = [...sorted.filter((d) => d >= today), ...sorted.filter((d) => d < today)];
  return rotated;
}

function todayPositionLabel(dows: ReadonlyArray<Dow>, today: Dow): string {
  const uniq = [...new Set(dows)].sort((a, b) => a - b);
  const idx = uniq.indexOf(today);
  if (idx === -1) return "";
  return `Day ${idx + 1} of ${uniq.length}`;
}

export interface ResolvedMicrocycle {
  readonly template: WeeklyTemplate;
  readonly today: Dow;
  readonly perModality: Record<ModalityKey, ModalityDayDecision>;
}

export function applyMicrocycle(
  template: WeeklyTemplate,
  today: Date,
): ResolvedMicrocycle {
  const dow = today.getDay() as Dow;
  const perModality = {} as Record<ModalityKey, ModalityDayDecision>;

  const allKeys: ModalityKey[] = [
    ...ANCHOR_MODALITIES,
    ...SCHEDULABLE_MODALITIES,
  ] as ModalityKey[];

  for (const m of allKeys) {
    const dows = template.perModality[m] ?? [];
    const isScheduled = dows.includes(dow);
    const isAnchor = ANCHOR_MODALITIES.includes(m);

    if (isAnchor) {
      perModality[m] = {
        scheduled: true,
        intensity: "primary",
        microcycleLabel: template.label,
        nextScheduledDow: dow,
        nextScheduledLabel: "Today",
        reason: template.label,
      };
      continue;
    }

    if (!isScheduled) {
      const nxt = nextScheduled(dow, dows);
      const label =
        nxt === null
          ? "not scheduled this cycle"
          : (() => {
              const dd = daysUntil(dow, nxt);
              return dd === 1
                ? `tomorrow (${DOW_SHORT[nxt]})`
                : `${DOW_SHORT[nxt]} · in ${dd} days`;
            })();
      const dayList = orderedFromToday(dows, dow).map((d) => DOW_SHORT[d]).join(" · ");
      perModality[m] = {
        scheduled: false,
        intensity: "off",
        microcycleLabel: `${template.label} — off today`,
        nextScheduledDow: nxt,
        nextScheduledLabel: nxt === null ? null : DOW_SHORT[nxt],
        reason:
          nxt === null
            ? `Not scheduled this cycle in the ${template.label} template.`
            : `Next ${m}: ${label}. Weekly slots: ${dayList || "none"}. CNS spacing keeps you fresh.`,
      };
      continue;
    }

    const intensity =
      template.intensityOverrides?.[m]?.[dow] ?? ("primary" as ModalityIntensity);
    const accent = template.dayLabels?.[m]?.[dow];
    const position = todayPositionLabel(dows, dow);
    const microcycleLabel = accent
      ? `${position} · ${accent}`
      : position;
    const nxt = nextScheduled(dow, dows);
    const nxtLabel =
      nxt === null || nxt === dow
        ? null
        : (() => {
            const dd = daysUntil(dow, nxt);
            return dd === 1
              ? `Next ${m}: tomorrow (${DOW_SHORT[nxt]})`
              : `Next ${m}: ${DOW_SHORT[nxt]} (in ${dd} days)`;
          })();
    perModality[m] = {
      scheduled: true,
      intensity,
      microcycleLabel,
      nextScheduledDow: nxt,
      nextScheduledLabel: nxt === null ? null : DOW_SHORT[nxt],
      reason:
        intensity === "primary"
          ? `${microcycleLabel}${nxtLabel ? ` · ${nxtLabel}.` : "."}`
          : `${microcycleLabel} · ${intensity === "activation" ? "activation dose (~30%)" : "secondary dose (~60%)"}${nxtLabel ? ` · ${nxtLabel}` : ""}.`,
    };
  }

  return { template, today: dow, perModality };
}

/* ── Weekly roadmap projection for the UI strip ─────────────────────────── */

export interface RoadmapDay {
  readonly dow: Dow;
  readonly short: string;
  readonly isToday: boolean;
  /** Modalities scheduled at primary or secondary intensity. */
  readonly modalities: ReadonlyArray<{ key: ModalityKey; intensity: ModalityIntensity; accent: string | null }>;
  readonly restDay: boolean;
}

export function projectWeeklyRoadmap(
  template: WeeklyTemplate,
  today: Date,
): ReadonlyArray<RoadmapDay> {
  const todayDow = today.getDay() as Dow;
  const days: RoadmapDay[] = [];
  for (let d = 0 as Dow; d <= 6; d = (d + 1) as Dow) {
    const modalities: RoadmapDay["modalities"] = SCHEDULABLE_MODALITIES.flatMap((m) => {
      const dows = template.perModality[m] ?? [];
      if (!dows.includes(d)) return [];
      const intensity =
        template.intensityOverrides?.[m]?.[d] ?? ("primary" as ModalityIntensity);
      const accent = template.dayLabels?.[m]?.[d] ?? null;
      return [{ key: m, intensity, accent }];
    });
    days.push({
      dow: d,
      short: DOW_SHORT[d],
      isToday: d === todayDow,
      modalities,
      restDay: modalities.length === 0,
    });
    if (d === 6) break;
  }
  return days;
}
