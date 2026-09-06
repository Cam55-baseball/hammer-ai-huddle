/**
 * Reload Detector — Stage 6 (spec §4).
 *
 * Replaces the calendar deload with an evidence-driven one. This module DECIDES
 * and EXPLAINS; it never writes a dose. The doctrine still owns sets and reps —
 * a reload week simply asks the doctrine for the envelope floor, exactly as the
 * calendar deload did.
 *
 * Pure, deterministic, no I/O.
 */

export const RELOAD_DETECTOR_VERSION = "reload_detector_v1";

export interface CheckIn {
  /** ISO date, YYYY-MM-DD. */
  date: string;
  sleepHours?: number | null;
  /** 1-10 readiness. */
  readiness?: number | null;
  soreness?: number | null;
  painFlag?: boolean | null;
  illness?: boolean | null;
}

export interface ReloadInputs {
  /** ISO date the decision is being made for. */
  today: string;
  checkins: readonly CheckIn[];
  /** 0..1 completion of prescribed sessions over the last 7 days. */
  completionRate7d?: number | null;
  /** True when RIR at the same load has drifted up versus two weeks ago. */
  rirDriftUp?: boolean | null;
  /** Percent change in measured on-field output vs the athlete's recent best. */
  outputTrendPct?: number | null;
  /** Consecutive days the CNS cap was hit. */
  cnsCapHitStreak?: number | null;
  sessionsLogged: number;
  weeksTraining: number;
  /** ISO date of the last reload, or null. */
  lastReloadDate?: string | null;
  /** ISO date the athlete's program started — the cold-start wave anchor. */
  programStartDate?: string | null;
}

export type ReloadSignalKind = "hard" | "soft";

export interface ReloadSignal {
  key: string;
  kind: ReloadSignalKind;
  /** Plain English, athlete-facing. */
  text: string;
}

export interface ReloadDecision {
  reload: boolean;
  /** Plain-English reason rendered on the card. Null when not reloading. */
  reason: string | null;
  signals: ReloadSignal[];
  /** True when there is not enough data and the four-week wave is used. */
  coldStart: boolean;
  /** 0 = normal, 1 = first week back (lower half of the envelope), 2 = normal. */
  rampWeek: 0 | 1;
  /** Forced by the six-week ceiling rather than by a signal. */
  forced: boolean;
  version: string;
}

const DAY_MS = 86_400_000;

function day(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = Date.parse(`${iso}T00:00:00Z`);
  return Number.isFinite(t) ? t : null;
}

function daysBetween(a: string, b: string | null | undefined): number | null {
  const x = day(a);
  const y = day(b);
  if (x === null || y === null) return null;
  return Math.round((x - y) / DAY_MS);
}

/** Most recent `n` check-ins, newest first. */
function recent(checkins: readonly CheckIn[], today: string, n: number): CheckIn[] {
  return [...checkins]
    .filter((c) => {
      const d = daysBetween(today, c.date);
      return d !== null && d >= 0 && d < n;
    })
    .sort((a, b) => (day(b.date) ?? 0) - (day(a.date) ?? 0));
}

export const COLD_START_MIN_SESSIONS = 10;
export const COLD_START_MIN_CHECKINS = 7;
export const MIN_WEEKS_BEFORE_RELOAD = 2;
export const RELOAD_COOLDOWN_DAYS = 14;
export const FORCED_RELOAD_DAYS = 42;

/** The four-week calendar wave, anchored to the athlete's own start date. */
export function coldStartWaveWeek(today: string, programStartDate: string | null | undefined): number {
  const d = daysBetween(today, programStartDate ?? null);
  if (d === null || d < 0) return 2; // neutral week when the anchor is unknown
  return (Math.floor(d / 7) % 4) + 1;
}

export function detectReload(input: ReloadInputs): ReloadDecision {
  const signals: ReloadSignal[] = [];
  const last5 = recent(input.checkins ?? [], input.today, 5);
  const last7 = recent(input.checkins ?? [], input.today, 7);

  // ── hard signals ─────────────────────────────────────────────────────────
  if (last7.some((c) => c.painFlag === true)) {
    signals.push({ key: "pain", kind: "hard", text: "you flagged pain this week" });
  }
  if (last7.some((c) => c.illness === true)) {
    signals.push({ key: "illness", kind: "hard", text: "you logged illness this week" });
  }
  const shortNights = last7.filter((c) => typeof c.sleepHours === "number" && (c.sleepHours as number) < 6).length;
  if (shortNights >= 3) {
    signals.push({ key: "sleep", kind: "hard", text: `you've had ${shortNights} nights under six hours' sleep` });
  }

  // ── soft signals ─────────────────────────────────────────────────────────
  const lowReadiness = last5.filter((c) => typeof c.readiness === "number" && (c.readiness as number) <= 4).length;
  if (lowReadiness >= 3) {
    signals.push({
      key: "readiness",
      kind: "soft",
      text: `your readiness has been 4 or below on ${lowReadiness} of the last 5 days`,
    });
  }
  if (typeof input.completionRate7d === "number" && input.completionRate7d < 0.7) {
    signals.push({
      key: "completion",
      kind: "soft",
      text: `you finished under 70% of this week's sessions`,
    });
  }
  if (input.rirDriftUp === true) {
    signals.push({
      key: "rir_drift",
      kind: "soft",
      text: "you're leaving more reps in the tank at the same weight than two weeks ago",
    });
  }
  if (typeof input.outputTrendPct === "number" && input.outputTrendPct < -5) {
    signals.push({
      key: "output",
      kind: "soft",
      text: `your measured output is down ${Math.abs(Math.round(input.outputTrendPct))}% from your own recent best`,
    });
  }
  if (typeof input.cnsCapHitStreak === "number" && input.cnsCapHitStreak >= 5) {
    signals.push({ key: "cns", kind: "soft", text: "you've hit the daily nervous-system cap five days running" });
  }

  const coldStart =
    (input.sessionsLogged ?? 0) < COLD_START_MIN_SESSIONS &&
    (input.checkins?.length ?? 0) < COLD_START_MIN_CHECKINS;

  const sinceLast = daysBetween(input.today, input.lastReloadDate ?? null);
  const tooSoon = sinceLast !== null && sinceLast < RELOAD_COOLDOWN_DAYS;
  const tooEarly = (input.weeksTraining ?? 0) < MIN_WEEKS_BEFORE_RELOAD;
  const forced = sinceLast !== null && sinceLast >= FORCED_RELOAD_DAYS && !tooEarly;

  const hard = signals.filter((s) => s.kind === "hard");
  const soft = signals.filter((s) => s.kind === "soft");
  const fired = hard.length >= 1 || soft.length >= 2;

  const reload = !tooEarly && !tooSoon && (fired || forced);

  let reason: string | null = null;
  if (reload) {
    if (forced && !fired) {
      reason =
        "This week is a reload. You've trained six weeks straight without one. " +
        "Volume drops, quality holds. You ramp back next week.";
    } else {
      const used = (hard.length ? hard : soft).map((s) => s.text);
      const list =
        used.length === 1 ? used[0] : `${used.slice(0, -1).join(", ")} and ${used[used.length - 1]}`;
      reason = `This week is a reload. ${capitalise(list)}. Volume drops, quality holds. You ramp back next week.`;
    }
  }

  // Week one back sits in the lower half of the envelope.
  const rampWeek: 0 | 1 =
    !reload && sinceLast !== null && sinceLast >= 1 && sinceLast <= 7 ? 1 : 0;

  return {
    reload,
    reason,
    signals,
    coldStart,
    rampWeek,
    forced: reload && forced && !fired,
    version: RELOAD_DETECTOR_VERSION,
  };
}

function capitalise(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}
