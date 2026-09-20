// v1.2 §B1 — onboarding: "where you are now", planned off days, last four
// weeks, on-ramp. Pure: every input is passed in, nothing reads a clock or a DB.

import { TCS_CONFIG } from "../tissueCost/config.ts";
import type { DaySchedule, TankLevels, TcsConfig } from "../tissueCost/types.ts";
import { runTanks } from "../tissueCost/tanks.ts";
import { ARC, addDays, daysBetween, layoutArc, locate, nominalOffsetOf } from "./blocks.ts";
import type {
  OnboardingInput,
  OnboardingResult,
  PlannedOffDays,
  RecentTraining,
} from "./types.ts";

/** Nominal loadable length of the whole arc. */
const ARC_DAYS = ARC.reduce((n, b) => n + b.nominalDays, 0);

/**
 * v1.2 §B1.3 — resolve planned off days to concrete dates.
 * Explicit dates always win. A bare count is spread evenly across the arc so
 * no single block swallows the whole shutdown.
 */
export function resolveOffDays(
  arcStart: string,
  offDays: PlannedOffDays | null | undefined,
): string[] {
  const explicit = [...new Set(offDays?.dates ?? [])].sort();
  const count = Math.max(0, Math.floor(offDays?.count ?? 0));
  if (count === 0) return explicit;
  const out = new Set(explicit);
  const gap = Math.max(1, Math.floor(ARC_DAYS / (count + 1)));
  for (let i = 1; out.size < explicit.length + count && i <= count * 4; i++) {
    const d = addDays(arcStart, i * gap);
    if (!out.has(d)) out.add(d);
  }
  return [...out].sort();
}

/** v1.2 §B1.4 — turn the quick pickers into 28 days of synthetic history. */
export function seedHistory(asOf: string, recent: RecentTraining): DaySchedule[] {
  const days: DaySchedule[] = [];
  const liftDays = clamp(recent.liftingDaysPerWeek, 0, 7);
  const practiceDays = clamp(recent.practicesPerWeek, 0, 7);
  const minutes = { none: 0, light: 45, moderate: 75, heavy: 105 }[recent.overall];
  const intensity = ({ none: "light", light: "light", moderate: "moderate", heavy: "high" } as const)[
    recent.overall
  ];
  const liftClass = ({ none: "L", light: "L", moderate: "M", heavy: "H" } as const)[recent.overall];
  const throws = {
    not_throwing: 0,
    catch_play: 10,
    long_toss: 25,
    bullpens: 40,
    games: 50,
  }[recent.throwingStatus];

  for (let back = 28; back >= 1; back--) {
    const date = addDays(asOf, -back);
    const dow = back % 7; // deterministic spread inside each week
    const day: DaySchedule = { date };
    if (recent.overall !== "none" && dow < liftDays) {
      day.lift = { class: liftClass };
    }
    if (dow < practiceDays && minutes > 0) {
      day.practiceMinutes = minutes;
      day.practiceIntensity = intensity;
    }
    if (throws > 0 && dow < Math.max(1, practiceDays)) day.maxIntentThrows = throws;
    days.push(day);
  }

  // A stated lay-off wins over the pickers: blank the tail.
  const gap = recent.daysSinceLastLoadedLift ?? null;
  if (gap !== null && gap > 0) {
    for (const d of days) {
      if (daysBetween(d.date, asOf) <= gap) {
        delete d.lift;
        if (gap >= 14) {
          delete d.practiceMinutes;
          delete d.practiceIntensity;
          delete d.maxIntentThrows;
        }
      }
    }
  }
  return days;
}

/** Tank levels the athlete starts with, from the seeded history. */
export function seedTanks(
  input: OnboardingInput,
  config: TcsConfig = TCS_CONFIG,
): TankLevels {
  const { levels } = runTanks({
    days: seedHistory(input.asOf, input.recent),
    today: input.asOf,
    todayDay: null,
    profile: { phase: input.anchor.phase },
    checkInByDate: new Map(),
    config,
  });
  return levels;
}

/**
 * v1.2 §B1.5 on-ramp, using the Step 5 TCS on-ramp config so the two can never
 * disagree: a gap at or over `triggerGapDays` (or a none/light last four weeks)
 * caps the class for `windowDays`; a gap at or over `longGapDays` for
 * `longWindowDays`.
 */
export function onRampFor(
  asOf: string,
  recent: RecentTraining,
  config: TcsConfig = TCS_CONFIG,
): { days: number; until: string | null } {
  const gap = recent.daysSinceLastLoadedLift ?? null;
  const coldPickers = recent.overall === "none" || recent.overall === "light";
  const longGap = gap !== null && gap >= config.onRamp.longGapDays;
  const triggerGap = gap !== null && gap >= config.onRamp.triggerGapDays;
  if (!coldPickers && !triggerGap) return { days: 0, until: null };
  const days = longGap ? config.onRamp.longWindowDays : config.onRamp.windowDays;
  return { days, until: addDays(asOf, days - 1) };
}

/** v1.2 §B1.1 — back-calculate everything from whichever anchor was given. */
export function resolveOnboarding(
  input: OnboardingInput,
  config: TcsConfig = TCS_CONFIG,
): OnboardingResult {
  const notes: string[] = [];
  const { anchor } = input;

  let phaseStartDate: string;
  if (anchor.phaseStartDate) {
    phaseStartDate = anchor.phaseStartDate;
  } else if (anchor.daysIntoPhase != null) {
    phaseStartDate = addDays(input.asOf, -Math.max(0, Math.floor(anchor.daysIntoPhase)));
  } else if (anchor.blockName) {
    phaseStartDate = addDays(input.asOf, -nominalOffsetOf(anchor.blockName));
    notes.push(`Phase start back-calculated from the block "${anchor.blockName}".`);
  } else {
    phaseStartDate = input.asOf;
    notes.push("No anchor given — today is treated as day 1 of the phase.");
  }

  const offDayDates = resolveOffDays(phaseStartDate, input.offDays);
  const arc = layoutArc(phaseStartDate, offDayDates);
  const { block, dayInBlock } = locate(arc, input.asOf);

  for (const b of arc) {
    if (b.workingDays < b.minimumDays) {
      notes.push(`Block "${b.name}" would fall under its minimum — the arc was stretched instead.`);
    }
  }
  if (offDayDates.length > 0) {
    notes.push(`${offDayDates.length} planned off day(s) — the arc stretches around them.`);
  }

  const ramp = onRampFor(input.asOf, input.recent, config);
  if (ramp.days > 0) notes.push("Easing back in after time off.");

  return {
    phase: anchor.phase,
    phaseStartDate,
    daysIntoPhase: Math.max(0, daysBetween(phaseStartDate, input.asOf)),
    currentBlock: block.name,
    dayInBlock,
    arc,
    offDayDates,
    onRampUntil: ramp.until,
    onRampDays: ramp.days,
    onRampCap: ramp.days > 0 ? config.onRamp.cap : null,
    notes,
  };
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, Math.floor(Number.isFinite(n) ? n : 0)));
}
