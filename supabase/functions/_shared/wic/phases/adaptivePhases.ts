/**
 * Adaptive phases v1.1 — docs/wic/adaptive-phases-and-schedule-v1.md §3–§6, §10,
 * amended by docs/wic/adaptive-phases-and-schedule-v1.1.md (one season state,
 * one phase, season continuity, re-entry ramp, unknown schedule, the why).
 *
 * Pure. No I/O. Deterministic. Shared by the shadow job, the client strip and
 * tests. Decides WHICH phase each discipline sits in and for how long. It never
 * authors a dose, a movement, a floor, a hard rule or an age gate — phases map
 * onto the existing arc blocks (§3) and the block engine keeps every law.
 */

import { activeRamps, type ActiveRamp, type RampDiscipline, type RampProfile } from "./rampLaw.ts";

export const ADAPTIVE_PHASES_VERSION = "adaptive_phases_v1_1";

export type Discipline = "lifting" | "throwing" | "speed" | "bat_speed";
export const DISCIPLINES: readonly Discipline[] = ["lifting", "throwing", "speed", "bat_speed"];

export type PhaseKey = "P1" | "P2" | "P3" | "P4";
export type BuildPhase = "P1" | "P2" | "P3";
const BUILD: readonly BuildPhase[] = ["P1", "P2", "P3"];

export const PHASE_NAME: Record<PhaseKey, string> = {
  P1: "Power Potential",
  P2: "Power Building",
  P3: "Explosiveness",
  P4: "Game-Ready Production",
};

/** §3 / §7 of the build brief — map onto the existing blocks, never rebuild them. */
export const PHASE_BLOCKS: Record<PhaseKey, readonly string[]> = {
  P1: ["B1", "B2"],
  P2: ["B4:heavy_banded"],
  P3: ["B4:reactive", "B5"],
  P4: ["in_season"],
};

export const PHASE_EXPLAIN: Record<PhaseKey, string> = {
  P1: "Building the base: stronger tissues, a solid strength foundation, and learning to absorb force safely.",
  P2: "Turning that base into power: heavier strength work and fast, strong movements.",
  P3: "Getting explosive: quick, springy work that sharpens you for games.",
  P4: "Game time: hold what you built, play well and stay healthy.",
};

export const SHARE: Record<BuildPhase, number> = { P1: 0.5, P2: 0.25, P3: 0.25 };
export const MIN_WEEKS: Record<BuildPhase, number> = { P1: 3, P2: 2, P3: 2 };
export const FADE_AFTER_WEEKS = 8;

// ---------------------------------------------------------------- credit ledger

export interface WeekRecord {
  discipline: Discipline;
  phase: PhaseKey;
  /** ISO date of the week's Monday (or any stable week key date). */
  weekStart: string;
  sessionsDone: number;
  sessionsPrescribed: number;
}

export type CreditLedger = Record<Discipline, Record<BuildPhase, number>>;

function emptyLedger(): CreditLedger {
  const out = {} as CreditLedger;
  for (const d of DISCIPLINES) out[d] = { P1: 0, P2: 0, P3: 0 };
  return out;
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000);
}
export function addDays(iso: string, n: number): string {
  return new Date(Date.parse(iso + "T00:00:00Z") + n * 86400000).toISOString().slice(0, 10);
}

/**
 * Banked weeks per phase per discipline. Each week counts as its adherence
 * (done ÷ prescribed, capped at 1). A quality with no work for 8+ weeks fades
 * by half for every full 8 idle weeks. Built only from completed history —
 * the schedule is not an input, so no schedule change can remove credit.
 */
export function buildCreditLedger(records: readonly WeekRecord[], today: string): CreditLedger {
  const ledger = emptyLedger();
  const last: Record<string, string> = {};
  for (const r of records) {
    if (r.phase === "P4" || r.weekStart > today) continue;
    const adh = r.sessionsPrescribed > 0 ? Math.min(1, Math.max(0, r.sessionsDone / r.sessionsPrescribed)) : 0;
    ledger[r.discipline][r.phase] += adh;
    const k = `${r.discipline}:${r.phase}`;
    if (adh > 0 && (!last[k] || r.weekStart > last[k])) last[k] = r.weekStart;
  }
  for (const d of DISCIPLINES) {
    for (const p of BUILD) {
      const k = `${d}:${p}`;
      if (!last[k]) continue;
      const idleWeeks = Math.floor((daysBetween(last[k], today) - 7) / 7);
      const halvings = Math.floor(Math.max(0, idleWeeks) / FADE_AFTER_WEEKS);
      ledger[d][p] = round2(ledger[d][p] / Math.pow(2, halvings));
    }
  }
  return ledger;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ---------------------------------------------------------------- priority need

export type Goal = "throw_harder" | "get_faster" | "hit_harder" | "stay_healthy" | null;

export interface NeedInput {
  goal: Goal;
  /** Biggest benchmark gap mapped to a phase, when a benchmark source exists. */
  benchmarkGapPhase?: BuildPhase | null;
  openPain: boolean;
}

const GOAL_PHASE: Record<Exclude<Goal, null>, BuildPhase> = {
  stay_healthy: "P1",
  throw_harder: "P2",
  hit_harder: "P2",
  get_faster: "P3",
};

/**
 * §5 ranking: open pain always pulls toward P1; then the stated goal; then the
 * biggest benchmark gap; then the phase with the least banked credit.
 */
export function rankNeed(need: NeedInput, credit: Record<BuildPhase, number>): BuildPhase[] {
  const order: BuildPhase[] = [];
  const add = (p: BuildPhase | null | undefined) => {
    if (p && !order.includes(p)) order.push(p);
  };
  if (need.openPain) add("P1");
  if (need.goal) add(GOAL_PHASE[need.goal]);
  add(need.benchmarkGapPhase ?? null);
  for (const p of [...BUILD].sort((a, b) => credit[a] - credit[b] || BUILD.indexOf(a) - BUILD.indexOf(b))) add(p);
  return order;
}

// ---------------------------------------------------------------- allocation

export type PlanMode = "full_arc" | "two_phase" | "bridge" | "in_season" | "year_round" | "mini_block" | "short_arc" | "maintenance";

export interface PhaseSegment {
  phase: PhaseKey;
  weeks: number;
  /** Last week of the segment is a sharpening week (B5). */
  endsWithSharpen: boolean;
  shortened: boolean;
  shortenedReason: string | null;
  /** Bridge mode: no new heavy methods, no new tiers. */
  noNewHeavy: boolean;
  /** Pre-game sharpening week only — not a restart of a finished phase. */
  sharpenOnly?: boolean;
  /** v1.2 §C — what job this block does inside its phase. */
  block?: string;
  /** v1.2 §C — the sharpening week that is also the first week of the ramp. */
  foldedIntoRamp?: boolean;
}

export interface AllocationInput {
  /** Stage C bounded feedback shares (only when phase_feedback is on). */
  shares?: Record<BuildPhase, number>;
  windowWeeks: number | null; // null → no hard date on file
  hardDateLabel: string | null;
  credit: Record<BuildPhase, number>;
  need: NeedInput;
}

export interface Allocation {
  mode: PlanMode;
  segments: PhaseSegment[];
  completed: BuildPhase[];
}

function remainingMin(p: BuildPhase, credit: Record<BuildPhase, number>): number {
  return Math.max(0, Math.ceil(MIN_WEEKS[p] - credit[p] - 1e-9));
}

function seg(phase: PhaseKey, weeks: number, extra: Partial<PhaseSegment> = {}): PhaseSegment {
  return { phase, weeks, endsWithSharpen: false, shortened: false, shortenedReason: null, noNewHeavy: false, ...extra };
}

/** §4 — split the window across the build phases. */
export function allocateWindow(input: AllocationInput): Allocation {
  const { credit, need } = input;
  const completed = BUILD.filter((p) => credit[p] >= MIN_WEEKS[p]);
  const W = input.windowWeeks;
  const why = (weeks: number) =>
    `Only ${weeks} week${weeks === 1 ? "" : "s"} before ${input.hardDateLabel ?? "your next hard date"}.`;

  // No dates at all → Bridge mode, open-ended (§10: every athlete has a phase).
  if (W === null) {
    return {
      mode: "bridge",
      completed,
      segments: [seg("P1", 1, { noNewHeavy: true, shortenedReason: null })],
    };
  }
  const w = Math.max(0, Math.floor(W));

  // < 4 weeks → Bridge: tissue & capacity, then one sharpening week.
  if (w < 4) {
    if (w === 0) return { mode: "bridge", completed, segments: [] };
    const out: PhaseSegment[] = [];
    // Never restart a finished phase: capacity work moves to the next unfinished one.
    const cap: BuildPhase = completed.includes("P1") ? (completed.includes("P2") ? "P3" : "P2") : "P1";
    if (w > 1) out.push(seg(cap, w - 1, { noNewHeavy: true }));
    out.push(seg("P3", 1, { endsWithSharpen: true, noNewHeavy: true }));
    return { mode: "bridge", completed, segments: out };
  }

  const ranked = rankNeed(need, credit);
  const pending = BUILD.filter((p) => !completed.includes(p));

  // 4 ≤ W < 7 → two phases, ≥2 weeks each, finish with a sharpening week.
  if (w < 7) {
    // One (or no) phase left: never re-open a finished phase. Give the
    // remaining phase the window and close with one sharpening week only.
    if (pending.length <= 1) {
      const p = pending[0] ?? "P3";
      if (p === "P3") {
        return { mode: "two_phase", completed, segments: [seg("P3", w, { endsWithSharpen: true })] };
      }
      return {
        mode: "two_phase",
        completed,
        segments: [seg(p, w - 1), seg("P3", 1, { endsWithSharpen: true, sharpenOnly: true })],
      };
    }
    let pick: BuildPhase[];
    if (pending.length === 2) {
      pick = [...pending];
    } else {
      pick = ranked.filter((p) => pending.includes(p) || pending.length === 0).slice(0, 2);
    }
    // The run must end sharp: P3 always closes the window.
    if (!pick.includes("P3") && !completed.includes("P3")) pick = [pick[0], "P3"];
    if (!pick.includes("P3")) {
      const [a, b] = pick.sort((x, y) => BUILD.indexOf(x) - BUILD.indexOf(y));
      const wa = Math.max(2, Math.ceil((w - 1) / 2)), wb = w - 1 - wa;
      const segs = [seg(a, wa), ...(wb > 0 ? [seg(b, wb)] : []), seg("P3", 1, { endsWithSharpen: true, sharpenOnly: true })];
      for (const x of segs) if (x.phase !== "P3" && x.weeks < remainingMin(x.phase as BuildPhase, credit)) { x.shortened = true; x.shortenedReason = why(w); }
      if (wb <= 0) segs.push(seg(b, 0, { shortened: true, shortenedReason: `Skipped this time — ${why(w)}` }));
      return { mode: "two_phase", completed, segments: segs };
    }
    pick = [...new Set(pick)].sort((a, b) => BUILD.indexOf(a) - BUILD.indexOf(b));
    const weeks: Record<string, number> = { [pick[0]]: 2, [pick[1]]: 2 };
    let spare = w - 4;
    const prio = ranked.find((p) => pick.includes(p)) ?? pick[0];
    while (spare-- > 0) weeks[prio] += 1;
    const out = pick.map((p, i) =>
      seg(p, weeks[p], {
        endsWithSharpen: i === pick.length - 1,
        shortened: weeks[p] < remainingMin(p, credit),
        shortenedReason: weeks[p] < remainingMin(p, credit) ? why(w) : null,
      }),
    );
    for (const p of pending) {
      if (!pick.includes(p)) {
        out.push(seg(p, 0, { shortened: true, shortenedReason: `Skipped this time — ${why(w)}` }));
      }
    }
    return { mode: "two_phase", completed, segments: out.filter((s) => s.weeks > 0 || s.shortened) };
  }

  // W ≥ 7 → share, clamp to (remaining) minimums, remainder to priority need.
  const active = pending.length ? pending : (["P3"] as BuildPhase[]);
  const SH = input.shares ?? SHARE;
  const shareSum = active.reduce((a, p) => a + SH[p], 0);
  const weeks: Record<string, number> = {};
  for (const p of active) weeks[p] = Math.max(remainingMin(p, credit), Math.floor((SH[p] / shareSum) * w));
  let used = active.reduce((a, p) => a + weeks[p], 0);
  // Over budget: trim the largest above its remaining minimum.
  while (used > w) {
    const cand = active
      .filter((p) => weeks[p] > Math.max(1, remainingMin(p, credit)))
      .sort((a, b) => weeks[b] - weeks[a])[0];
    if (!cand) break;
    weeks[cand] -= 1;
    used -= 1;
  }
  const prio = ranked.find((p) => active.includes(p)) ?? active[0];
  while (used < w) {
    weeks[prio] += 1;
    used += 1;
  }
  const out = active.map((p, i) =>
    seg(p, weeks[p], {
      endsWithSharpen: i === active.length - 1 && p === "P3",
      shortened: weeks[p] < remainingMin(p, credit),
      shortenedReason: weeks[p] < remainingMin(p, credit) ? why(w) : null,
    }),
  );
  return { mode: "full_arc", completed, segments: out };
}

// ---------------------------------------------------------------- v1.1 per athlete

export type SeasonState = "offseason" | "preseason" | "in_season" | "post_season";
export type ScheduleAnswer = "this_week" | "2_3_weeks" | "month_plus" | "not_sure";

export interface DisciplineHold {
  discipline: Discipline;
  reason: string;
}

export interface AthletePhaseInput {
  /** Stage C bounded feedback shares — only passed when the phase_feedback switch is on. */
  shares?: Record<BuildPhase, number>;
  /** Ramp Law v1 — days off per discipline and when the athlete came back. */
  rampGap?: Partial<Record<RampDiscipline, { daysOff: number; returnedOn: string } | null>>;
  rampProfile?: RampProfile;
  /** Known game dates (past and future) — ramps never land on them. */
  gameDates?: string[];
  today: string;
  /** ONE season state from settings (v1.1 §A). Flowing play can lift it to in_season (§B). */
  seasonState: SeasonState;
  /** Most recent game day played (on or before today). */
  lastGameDate: string | null;
  /** Next game day, or another hard date (season start, big event). */
  hardDate: string | null;
  hardDateLabel?: string | null;
  /** The hard date is an actual game (vs. a season start or event). */
  hardDateIsGame?: boolean;
  yearRound: boolean;
  weeksIntoSeason: number;
  /** Planned off days + holds inside the window. */
  offDaysInWindow: number;
  /** A whole-athlete break (HOLD) covers today. */
  holdToday: boolean;
  /** Pain/injury holds on single disciplines (v1.1 §A exception). */
  holds?: readonly DisciplineHold[];
  /** Check-in answer to "When's your next game?" (v1.1 §D). */
  scheduleAnswer?: ScheduleAnswer | null;
  /** Estimate from the athlete's own history. Shown only; never starts a heavy block. */
  likelyNextGame?: string | null;
  records: readonly WeekRecord[];
  need: NeedInput;
}

export type RampStepKey = "elastic_primers" | "max_velocity" | "sport_speed" | "game_ready_day";
export const RAMP_STEP_NAME: Record<RampStepKey, string> = {
  elastic_primers: "Bouncy primers",
  max_velocity: "Top-speed sprints",
  sport_speed: "Game-speed throws and swings",
  game_ready_day: "Game-ready day",
};

export interface ReentryRamp {
  minDays: number;
  days: number;
  start: string;
  /** Last ramp day — always the day before the game, never the game itself. */
  end: string;
  steps: { step: RampStepKey; from: string; to: string }[];
  activeToday: boolean;
  stepToday: RampStepKey | null;
  /** Only when the calendar itself has fewer days than the minimum. */
  calendarShortReason: string | null;
}

export const GAME_READY_FLOOR = ["One elastic primer", "One max-velocity touch", "One sport-intent exposure"] as const;

export interface DisciplinePlan {
  discipline: Discipline;
  /** Always equal to the athlete's one phase (v1.1 §A). */
  phase: PhaseKey;
  hold: DisciplineHold | null;
  credit: Record<BuildPhase, number>;
  content: string;
  why: string;
}

export interface AthletePhasePlan {
  version: string;
  today: string;
  seasonState: SeasonState;
  mode: PlanMode;
  phase: PhaseKey;
  weeksLeft: number;
  next: PhaseKey | null;
  nextWeeks: number | null;
  sharpenWeek: boolean;
  noNewHeavy: boolean;
  emphasis: string | null;
  paused: boolean;
  segments: PhaseSegment[];
  shortened: { phase: PhaseKey; reason: string }[];
  completed: BuildPhase[];
  credit: Record<BuildPhase, number>;
  ramp: ReentryRamp | null;
  gameReadyFloor: readonly string[] | null;
  schedule: { known: boolean; estimated: boolean; answer: ScheduleAnswer | null; likelyNextGame: string | null; askNextGame: boolean };
  windowWeeks: number | null;
  hardDate: string | null;
  why: string;
  disciplines: DisciplinePlan[];
  /** Ramp Law v1 — ramps running today, one plain line each. */
  ramps?: ActiveRamp[];
  /** A ramp that cannot finish before the next game (it is never shortened). */
  rampWarnings?: string[];
  /** v1.2 §C — offseason arc chosen by days (staff view). */
  arc?: { days: number; tier: ArcTier; lengths: { phase: PhaseKey; block: string; weeks: number }[]; rampDays: number };
}

const ROTATION = ["strength", "speed", "sharpen"] as const;

export function windowWeeksFor(today: string, hardDate: string | null, offDays: number): number | null {
  if (!hardDate) return null;
  const days = daysBetween(today, hardDate) - Math.max(0, offDays);
  return Math.max(0, Math.floor(days / 7));
}

/** v1.1 §B — ramp minimum by the length of the no-play gap. */
export function rampMinFor(gapDays: number): { min: number; max: number | null } | null {
  if (gapDays <= 14) return null;
  if (gapDays <= 27) return { min: 5, max: null };
  if (gapDays < 42) return { min: 7, max: null };
  return { min: 10, max: 14 };
}

/**
 * One credit record for the athlete: per phase, the lowest banked credit among
 * disciplines that have any history. Unity means the athlete never skips a
 * phase one of their trained disciplines hasn't done.
 */
function unifiedCredit(ledger: CreditLedger, records: readonly WeekRecord[]): Record<BuildPhase, number> {
  const trained = DISCIPLINES.filter((d) => records.some((r) => r.discipline === d));
  const src = trained.length ? trained : DISCIPLINES;
  const out = { P1: Infinity, P2: Infinity, P3: Infinity } as Record<BuildPhase, number>;
  for (const d of src) for (const p of BUILD) out[p] = Math.min(out[p], ledger[d][p]);
  for (const p of BUILD) if (!isFinite(out[p])) out[p] = 0;
  return out;
}

function buildRamp(today: string, game: string, days: number, min: number, calendarShort: boolean): ReentryRamp {
  const start = addDays(game, -days);
  const end = addDays(game, -1);
  const body = Math.max(0, days - 1);
  const a = Math.ceil(body / 3), b = Math.ceil((body - a) / 2), c = body - a - b;
  const steps: ReentryRamp["steps"] = [];
  let cur = start;
  for (const [step, n] of [["elastic_primers", a], ["max_velocity", b], ["sport_speed", c]] as const) {
    if (n <= 0) continue;
    steps.push({ step, from: cur, to: addDays(cur, n - 1) });
    cur = addDays(cur, n);
  }
  if (days >= 1) steps.push({ step: "game_ready_day", from: end, to: end });
  const activeToday = today >= start && today <= end;
  const stepToday = activeToday ? steps.find((s) => today >= s.from && today <= s.to)?.step ?? null : null;
  return {
    minDays: min, days, start, end, steps, activeToday, stepToday,
    calendarShortReason: calendarShort
      ? `Only ${days} day${days === 1 ? "" : "s"} before the next game — the ramp starts now and keeps every step.`
      : null,
  };
}

function allocateShortArc(w: number): PhaseSegment[] {
  const reason = `Back from a long break (${w} weeks to build) — a quick version of each phase.`;
  const weeks = w >= 5 ? [w - 3, 2, 1] : [1, 1, Math.max(1, w - 2)];
  return BUILD.map((p, i) => seg(p, weeks[i], { shortened: true, shortenedReason: reason, endsWithSharpen: p === "P3" }));
}

const RAMP_NOTE = " The re-entry ramp keeps its full length, so this phase gave way.";

// ---------------------------------------------------------------- v1.2 §C offseason arc by days

export type ArcTier = "full" | "compressed" | "three_phase" | "two_phase" | "bridge";
export const ARC_TIER_NAME: Record<ArcTier, string> = {
  full: "Full arc", compressed: "Full arc, compressed", three_phase: "Three phases", two_phase: "Two phases", bridge: "Bridge",
};
export const ABSORB_MIN_WEEKS = 2;

export function arcTierFor(days: number): ArcTier {
  if (days >= 140) return "full";
  if (days >= 98) return "compressed";
  if (days >= 56) return "three_phase";
  if (days >= 28) return "two_phase";
  return "bridge";
}

/**
 * Different lengths are different jobs (not one shape stretched).
 * Returns the build segments and the ramp length (days) before the game.
 * The re-entry ramp never drops below its v1.1 minimum (10 days after 6+ weeks
 * without play); in the three-phase tier its first week IS the sharpening week.
 */
export function arcForDays(days: number, credit: Record<BuildPhase, number>, need: NeedInput, label: string):
  { tier: ArcTier; segments: PhaseSegment[]; rampDays: number; buildWeeks: number; mode?: PlanMode } {
  const tier = arcTierFor(days);
  const done = (p: BuildPhase) => credit[p] >= MIN_WEEKS[p];
  const why = (w: number) => `Only ${w} week${w === 1 ? "" : "s"} before ${label}.`;
  if (tier === "full" || tier === "compressed") {
    const rampDays = tier === "full" ? 14 : 10;
    const W = Math.floor((days - rampDays) / 7);
    const segs: PhaseSegment[] = [];
    if (tier === "full") {
      // True absorb block and a full explosiveness block.
      let absorb = done("P1") ? 0 : Math.max(ABSORB_MIN_WEEKS + 1, Math.round(W * 0.2));
      let cap = done("P1") ? 0 : Math.max(MIN_WEEKS.P1 - ABSORB_MIN_WEEKS, Math.round(W * 0.25));
      let p2 = done("P2") ? 0 : Math.max(MIN_WEEKS.P2, Math.round(W * 0.25));
      let p3 = W - absorb - cap - p2;
      if (p3 < 4) { const give = 4 - p3; p2 = Math.max(MIN_WEEKS.P2, p2 - give); p3 = W - absorb - cap - p2; }
      if (absorb) segs.push(seg("P1", absorb, { block: "Absorb" }));
      if (cap) segs.push(seg("P1", cap, { block: "Capacity" }));
      if (p2) segs.push(seg("P2", p2, { block: "Heavy and banded" }));
      segs.push(seg("P3", p3, { block: "Full explosiveness", endsWithSharpen: true }));
    } else {
      // Absorb and explosiveness keep their minimums; the middle takes the squeeze.
      const absorb = done("P1") ? 0 : ABSORB_MIN_WEEKS;
      const p3 = MIN_WEEKS.P3;
      let rest = W - absorb - p3;
      const capMin = done("P1") ? 0 : Math.max(1, MIN_WEEKS.P1 - ABSORB_MIN_WEEKS);
      const p2Min = done("P2") ? 0 : MIN_WEEKS.P2;
      let cap = capMin, p2 = p2Min;
      rest -= cap + p2;
      const prio = rankNeed(need, credit).find((p) => (p === "P1" && capMin) || (p === "P2" && p2Min) || p === "P3") ?? "P2";
      let p3x = p3;
      while (rest-- > 0) { if (prio === "P1" && capMin) cap++; else if (prio === "P2" && p2Min) p2++; else p3x++; }
      if (absorb) segs.push(seg("P1", absorb, { block: "Absorb" }));
      if (cap) segs.push(seg("P1", cap, { block: "Capacity" }));
      if (p2) segs.push(seg("P2", p2, { block: "Heavy and banded" }));
      segs.push(seg("P3", p3x, { block: "Explosiveness", endsWithSharpen: true }));
    }
    for (const p of BUILD) {
      const tot = segs.filter((x) => x.phase === p).reduce((a, x) => a + x.weeks, 0);
      if (tot > 0 && tot < remainingMin(p, credit)) for (const x of segs) if (x.phase === p) { x.shortened = true; x.shortenedReason = why(W); }
    }
    return { tier, segments: segs, rampDays, buildWeeks: W };
  }
  if (tier === "three_phase") {
    // Sport ramp folded into the sharpening week: ramp = sharpen week + 3 days.
    const W = Math.floor((days - 3) / 7);
    const a = allocateWindow({ windowWeeks: W, hardDateLabel: label, credit, need });
    const segs: PhaseSegment[] = a.segments.map((x) => ({ ...x, block: x.phase === "P1" ? "Base" : x.phase === "P2" ? "Power" : "Explosiveness" }));
    const last = [...segs].reverse().find((x) => x.weeks > 0);
    if (last) { last.endsWithSharpen = true; last.foldedIntoRamp = true; }
    return { tier, segments: segs, rampDays: days - (W - 1) * 7, buildWeeks: W };
  }
  const rampDays = Math.min(days, 10);
  const W = Math.max(0, Math.floor((days - 10) / 7));
  const a = allocateWindow({ windowWeeks: W, hardDateLabel: label, credit, need });
  const segs: PhaseSegment[] = a.segments.map((x) => ({ ...x, block: tier === "bridge" ? (x.endsWithSharpen ? "Sharpen" : "Capacity") : undefined }));
  if (W === 0) segs.push(seg("P1", 0, { shortened: true, shortenedReason: `No room for a block before ${label} — the re-entry ramp comes first.` }));
  else for (const x of segs) if (x.shortened && !x.shortenedReason) x.shortenedReason = why(W);
  return { tier, segments: segs, rampDays: days - W * 7 > 0 ? days - W * 7 : rampDays, buildWeeks: W, mode: W === 0 ? "bridge" : a.mode };
}

export function planAthlete(input: AthletePhaseInput): AthletePhasePlan {
  const base = planAthleteCore(input);
  if (!input.rampGap || !input.rampProfile) return base;
  const ramps = activeRamps({ today: input.today, gap: input.rampGap, profile: input.rampProfile, gameDates: input.gameDates ?? [] });
  if (!ramps.length) return base;
  // Ramp Law §1: a ramp is never shortened. If it cannot finish before the next game, say so plainly.
  const next = (input.gameDates ?? []).filter((g) => g > input.today).sort()[0] ?? null;
  const NAME: Record<string, string> = { throwing: "Throwing", lifting: "Lifting", speed: "Speed", bat_speed: "Bat speed", conditioning: "Conditioning", jumps: "Jumps" };
  const rampWarnings = next ? ramps.filter((r) => r.placed.dates[r.placed.dates.length - 1] >= next)
    .map((r) => `${NAME[r.discipline]} build runs past your next game, so game work stays limited until it's done.`) : [];
  return { ...base, ramps, ...(rampWarnings.length ? { rampWarnings } : {}) };
}

function planAthleteCore(input: AthletePhaseInput): AthletePhasePlan {
  const ledger = buildCreditLedger(input.records, input.today);
  const credit = unifiedCredit(ledger, input.records);
  const completed = BUILD.filter((p) => credit[p] >= MIN_WEEKS[p]);
  const today = input.today;
  const answer = input.scheduleAnswer ?? null;

  // ---- target date: a known hard date, else a conservative estimate from the check-in answer
  let target = input.hardDate && input.hardDate >= today ? input.hardDate : null;
  let estimated = false;
  let targetIsGame = target ? input.hardDateIsGame !== false : false;
  if (!target && input.seasonState !== "in_season" && answer && answer !== "not_sure") {
    // Earliest plausible day for each answer — never later than the athlete said.
    target = addDays(today, answer === "this_week" ? 3 : answer === "2_3_weeks" ? 14 : 28);
    estimated = true;
    targetIsGame = true;
  }
  const untilTarget = target ? daysBetween(today, target) : null;

  // ---- §B season continuity: gap measured between game days
  const sinceLast = input.lastGameDate ? daysBetween(input.lastGameDate, today) : null;
  let gap: number | null = null;
  if (target && targetIsGame && input.lastGameDate) gap = daysBetween(input.lastGameDate, target);
  else if (target && input.seasonState === "in_season") gap = untilTarget;
  else if (target) gap = sinceLast !== null ? sinceLast + (untilTarget ?? 0) : Number.POSITIVE_INFINITY; // offseason, no recent play
  const flowing = gap !== null && gap <= 27 && (input.seasonState === "in_season" || sinceLast !== null || (targetIsGame && gap <= 27));
  // A gap of 28+ days is a short offseason window (§B), so the one season state says so.
  const seasonState: SeasonState = flowing
    ? "in_season"
    : input.seasonState === "in_season" && gap !== null && gap >= 28 ? "offseason" : input.seasonState;

  const known = !!input.hardDate || input.seasonState === "in_season";
  const askNextGame = !input.hardDate && (answer === null || answer === "not_sure");
  const holds: DisciplineHold[] = [...(input.holds ?? [])];
  if (input.holdToday) for (const d of DISCIPLINES) if (!holds.some((h) => h.discipline === d)) holds.push({ discipline: d, reason: "Taking a break" });

  const finish = (core: {
    mode: PlanMode; segments: PhaseSegment[]; after: PhaseKey | null; ramp: ReentryRamp | null;
    emphasis?: string | null; floor: boolean; windowWeeks: number | null;
  }): AthletePhasePlan => {
    const liveSegs = core.segments.filter((s) => s.weeks > 0);
    const rampNow = core.ramp?.activeToday || (core.ramp && liveSegs.length === 0);
    const first = liveSegs[0] ?? seg(core.after ?? "P4", 0);
    const phase: PhaseKey = rampNow ? "P4" : first.phase;
    const second = rampNow ? null : liveSegs[1] ?? null;
    const disciplines = DISCIPLINES.map((d): DisciplinePlan => ({
      discipline: d, phase, hold: holds.find((h) => h.discipline === d) ?? null,
      credit: ledger[d], content: DISCIPLINE_CONTENT[phase][d], why: WHY_BLOCK[phase][d],
    }));
    return {
      version: ADAPTIVE_PHASES_VERSION, today, seasonState, mode: core.mode, phase,
      weeksLeft: rampNow ? 0 : first.weeks,
      next: second ? second.phase : rampNow ? null : core.after,
      nextWeeks: second ? second.weeks : null,
      sharpenWeek: !rampNow && first.endsWithSharpen && first.weeks === 1,
      noNewHeavy: first.noNewHeavy || core.mode === "maintenance",
      emphasis: core.emphasis ?? null,
      paused: input.holdToday,
      segments: core.segments,
      shortened: core.segments.filter((s) => s.shortened && s.shortenedReason).map((s) => ({ phase: s.phase, reason: s.shortenedReason! })),
      completed, credit, ramp: core.ramp,
      gameReadyFloor: core.floor || !!core.ramp?.activeToday ? GAME_READY_FLOOR : null,
      schedule: { known, estimated, answer, likelyNextGame: input.likelyNextGame ?? null, askNextGame },
      windowWeeks: core.windowWeeks, hardDate: target,
      why: rampNow ? WHY_RAMP : WHY_PHASE[phase],
      disciplines,
    };
  };

  const inSeasonMaintenance = (mode: PlanMode): AthletePhasePlan => {
    const emphasis = input.yearRound ? ROTATION[Math.floor(Math.max(0, input.weeksIntoSeason) / 3) % 3] : null;
    const weeksLeft = input.yearRound ? 3 - (Math.max(0, input.weeksIntoSeason) % 3) : 0;
    return finish({
      mode: mode === "in_season" && input.yearRound ? "year_round" : mode,
      segments: [seg("P4", weeksLeft, { noNewHeavy: mode === "maintenance" })],
      after: null, ramp: null, emphasis, floor: true, windowWeeks: null,
    });
  };

  // ---- §D unknown schedule → in-season maintenance + floor, no heavy block on a guess
  if (!target) {
    if (seasonState === "in_season") return inSeasonMaintenance("in_season");
    return inSeasonMaintenance("maintenance");
  }

  // Game (or hard date) today → game day.
  if (untilTarget! <= 0) return inSeasonMaintenance("in_season");

  // ---- §B gap ≤ 14 → in-season the whole way through
  const rampRule = rampMinFor(gap ?? Number.POSITIVE_INFINITY);
  if (!rampRule) return inSeasonMaintenance("in_season");

  // Days available before the game (game day excluded), less planned off days.
  const avail = Math.max(0, untilTarget! - Math.max(0, input.offDaysInWindow));
  const calendarShort = avail < rampRule.min;
  let weeks: number = calendarShort ? 0 : Math.floor((avail - rampRule.min) / 7);
  let rampDays = calendarShort ? avail : avail - weeks * 7;
  if (rampRule.max !== null && rampDays > rampRule.max) rampDays = rampRule.max; // spare days fall to the week before
  const ramp = buildRamp(today, target, Math.max(0, Math.min(rampDays, untilTarget!)), rampRule.min, calendarShort);
  const label = input.hardDateLabel ?? (estimated ? "your next game (estimated)" : target);

  // 15–27 → stay in-season, two-week mini block (P2 or P3 by need) + ramp ≥ 5
  if (gap! <= 27) {
    const phase: BuildPhase = rankNeed(input.need, credit).find((p) => p !== "P1") ?? "P2";
    const mini = Math.min(2, weeks);
    const segs: PhaseSegment[] = [];
    if (weeks > mini) segs.push(seg("P4", weeks - mini));
    if (mini > 0) segs.push(seg(phase, mini, {
      endsWithSharpen: phase === "P3",
      shortened: mini < 2, shortenedReason: mini < 2 ? `Shortened so the ${rampRule.min}-day re-entry ramp fits before ${label}.` : null,
    }));
    else segs.push(seg(phase, 0, { shortened: true, shortenedReason: `No room for a mini block — the ${rampRule.min}-day re-entry ramp comes first before ${label}.` }));
    return finish({ mode: "mini_block", segments: segs, after: "P4", ramp, floor: true, windowWeeks: weeks });
  }

  // ≥ 42 with a known last game (break, injury, postponement) → full short arc
  let segs: PhaseSegment[];
  let mode: PlanMode;
  let arcInfo: { days: number; tier: ArcTier } | null = null;
  let rampOut = ramp;
  if (gap! >= 42 && input.lastGameDate && weeks >= 3) {
    segs = allocateShortArc(weeks);
    mode = "short_arc";
  } else if (gap! >= 42 && !input.lastGameDate && !calendarShort) {
    // v1.2 §C — a true offseason: the arc's shape is chosen by the days available.
    const arc = arcForDays(avail, credit, input.need, label);
    segs = arc.segments;
    mode = arc.mode ?? "full_arc";
    weeks = arc.buildWeeks;
    const rd = arc.segments.some((x) => x.foldedIntoRamp) ? arc.rampDays : Math.max(rampRule.min, avail - arc.buildWeeks * 7 > rampRule.max! ? arc.rampDays : avail - arc.buildWeeks * 7);
    rampOut = buildRamp(today, target, Math.min(rd, untilTarget!), rampRule.min, false);
    arcInfo = { days: avail, tier: arc.tier };
  } else {
    const alloc = allocateWindow({ windowWeeks: weeks, hardDateLabel: label, credit, need: input.need, shares: input.shares });
    segs = alloc.segments;
    mode = alloc.mode;
    // Weeks the ramp took from the window: say so on anything cut short.
    const withoutRamp = Math.floor(avail / 7);
    if (withoutRamp > weeks) for (const s of segs) if (s.shortened && s.shortenedReason) s.shortenedReason += RAMP_NOTE;
  }
  if (estimated) for (const s of segs) if (s.phase !== "P4") s.noNewHeavy = true;
  // Rarely the window is empty — name the phase that gave way.
  if (weeks === 0 && !segs.some((s) => s.shortened)) {
    segs = [seg("P1", 0, { shortened: true, shortenedReason: `No room for a block before ${label} — the re-entry ramp comes first.` })];
  }
  const out = finish({ mode, segments: segs, after: "P4", ramp: rampOut, floor: untilTarget! <= 7, windowWeeks: weeks });
  return arcInfo ? { ...out, arc: { days: arcInfo.days, tier: arcInfo.tier, lengths: segs.filter((x) => x.weeks > 0).map((x) => ({ phase: x.phase, block: x.block ?? PHASE_NAME[x.phase], weeks: x.weeks })), rampDays: rampOut.days } } : out;
}

/** v1.1 §A invariant: no two disciplines in different phases (holds never change the phase). */
export function unityViolations(plan: AthletePhasePlan): string[] {
  const out: string[] = [];
  for (const d of plan.disciplines) {
    if (d.phase !== plan.phase && !d.hold) out.push(`${d.discipline} sits in ${d.phase} while the athlete is in ${plan.phase}`);
  }
  const phases = new Set(plan.disciplines.filter((d) => !d.hold).map((d) => d.phase));
  if (phases.size > 1) out.push(`disciplines split across ${[...phases].join(", ")}`);
  return out;
}

// ---------------------------------------------------------------- the why (v1.1 §F)
// How Hammers trains — never stated as proven science, never a medical claim.

export const WHY_PHASE: Record<PhaseKey, string> = {
  P1: "We build the tissue that stores and returns energy, and the strength behind it. It's what lets everything later hit harder without breaking you down.",
  P2: "Now we add force. Heavy work and fast bar speed teach your body to produce more power on demand.",
  P3: "We turn that force into quickness — short ground contacts, fast hands, snap. This is where power becomes speed.",
  P4: "We hold everything you built and keep you fresh, so the best version of you shows up on game day.",
};

export const WHY_RAMP =
  "Coming back to games is a big step up. We build back to game speed a little at a time — bouncy primers, then fast sprints, then game-speed throws and swings. That way your first game back feels normal.";

export const WHY_BLOCK: Record<PhaseKey, Record<Discipline, string>> = {
  P1: {
    lifting: "We lift with control and train the springy tissue around your joints. Solid reps now make heavier work later feel easier.",
    throwing: "We build an arm that is ready for lots of throws. Easy volume and a clean rhythm come before any hard throwing.",
    speed: "We practise landing, pushing and bouncing well. Good contact with the ground now is how Hammers builds speed later.",
    bat_speed: "We build a swing that works as one chain, from the ground up. Hips, trunk and hands learn to move together.",
  },
  P2: {
    lifting: "Heavier lifts and fast bar speed. We teach your body to make more force when you ask for it.",
    throwing: "We add intent to your throws a little at a time. The strength you built starts moving into the arm.",
    speed: "Harder pushes and longer accelerations. We turn your strength into drive off the ground.",
    bat_speed: "We swing with more intent, using heavier and lighter tools. Force from your legs gets carried up to the barrel.",
  },
  P3: {
    lifting: "Lighter, faster lifts and jumps. We keep the strength and make it quick.",
    throwing: "Throws get closer to game speed, with full rest in between. We sharpen how fast you deliver the ball.",
    speed: "Short, fast sprints and quick bounces. Quick ground contacts are where power turns into speed.",
    bat_speed: "Fast, full-intent swings with full rest. We make your hands quick and your swing snappy.",
  },
  P4: {
    lifting: "Short, sharp lifts that hold your strength without leaving you tired for games.",
    throwing: "We keep your arm fresh around games and only add what it can handle that week.",
    speed: "One fast sprint touch each week keeps your top speed ready.",
    bat_speed: "A few full-speed swings keep your bat quick between games.",
  },
};

export const DISCIPLINE_CONTENT: Record<PhaseKey, Record<Discipline, string>> = {
  P1: { lifting: "Strength base and tissue work", throwing: "Easy volume and rhythm", speed: "Landing, pushing, bouncing", bat_speed: "Connected swing patterns" },
  P2: { lifting: "Heavy and fast-bar work", throwing: "Building throwing intent", speed: "Accelerations and hard pushes", bat_speed: "Overload and underload swings" },
  P3: { lifting: "Fast lifts and jumps", throwing: "Near game-speed throws", speed: "Max-velocity sprints and quick bounces", bat_speed: "Full-intent swings" },
  P4: { lifting: "Short maintenance lifts", throwing: "Arm care and game throwing", speed: "Weekly top-speed touch", bat_speed: "Game-speed swings" },
};

/** Wording guard for the why text (tests use it). */
export const WHY_BANNED = /\b(proven|prove[sn]?|science|scientific|studies|study shows|research(ers)? (shows?|says)|clinical(ly)?|medical(ly)?|diagnos\w*|cure[sd]?|heal(s|ing)?|treat(s|ment)?|therap\w*|prevents? injur\w*|injury[- ]proof|guarantee[sd]?|fascia (is|does|stores)|collagen)\b/i;

// ---------------------------------------------------------------- athlete strip (§6)

function prettyDate(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function stripText(plan: AthletePhasePlan): string {
  const cur = PHASE_NAME[plan.phase];
  const game = plan.hardDate ? `${plan.schedule.estimated ? "about " : ""}${prettyDate(plan.hardDate)}` : null;
  if (plan.ramp?.activeToday) {
    const day = daysBetween(plan.ramp.start, plan.today) + 1;
    return `Getting game-ready · day ${day} of ${plan.ramp.days}${plan.ramp.stepToday ? ` · ${RAMP_STEP_NAME[plan.ramp.stepToday]}` : ""}${game ? ` → first game ${game}` : ""}`;
  }
  if (plan.mode === "maintenance") return `${cur} · staying game-ready until your next game is set`;
  if (plan.mode === "in_season") return `${cur} · in season`;
  if (plan.mode === "year_round") return `${cur} · ${plan.emphasis} focus · ${plan.weeksLeft} week${plan.weeksLeft === 1 ? "" : "s"} left`;
  const parts = [`${cur} · ${plan.weeksLeft} week${plan.weeksLeft === 1 ? "" : "s"} left`];
  if (plan.next && plan.next !== "P4" && plan.nextWeeks) {
    parts.push(`next: ${PHASE_NAME[plan.next]} (about ${plan.nextWeeks} week${plan.nextWeeks === 1 ? "" : "s"})`);
  }
  if (plan.ramp) parts.push(`${plan.ramp.days}-day ramp`);
  if (game) parts.push(`Game-Ready by ${game}`);
  return parts.join(" → ");
}
