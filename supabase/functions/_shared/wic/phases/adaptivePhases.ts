/**
 * Adaptive phases v1 — spec docs/wic/adaptive-phases-and-schedule-v1.md §3–§6, §10.
 *
 * Pure. No I/O. Deterministic. Shared by the shadow job, the client strip and
 * tests. Decides WHICH phase each discipline sits in and for how long. It never
 * authors a dose, a movement, a floor, a hard rule or an age gate — phases map
 * onto the existing arc blocks (§3) and the block engine keeps every law.
 */

export const ADAPTIVE_PHASES_VERSION = "adaptive_phases_v1";

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

export type PlanMode = "full_arc" | "two_phase" | "bridge" | "in_season" | "year_round" | "mini_block" | "short_arc";

export interface PhaseSegment {
  phase: PhaseKey;
  weeks: number;
  /** Last week of the segment is a sharpening week (B5). */
  endsWithSharpen: boolean;
  shortened: boolean;
  shortenedReason: string | null;
  /** Bridge mode: no new heavy methods, no new tiers. */
  noNewHeavy: boolean;
}

export interface AllocationInput {
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
    if (w > 1) out.push(seg("P1", w - 1, { noNewHeavy: true }));
    out.push(seg("P3", 1, { endsWithSharpen: true, noNewHeavy: true }));
    return { mode: "bridge", completed, segments: out };
  }

  const ranked = rankNeed(need, credit);
  const pending = BUILD.filter((p) => !completed.includes(p));

  // 4 ≤ W < 7 → two phases, ≥2 weeks each, finish with a sharpening week.
  if (w < 7) {
    let pick: BuildPhase[];
    if (pending.length <= 2 && pending.length > 0) {
      pick = [...pending];
      if (pick.length === 1) {
        const other = ranked.find((p) => p !== pick[0])!;
        pick.push(other);
      }
    } else {
      pick = ranked.filter((p) => pending.includes(p) || pending.length === 0).slice(0, 2);
    }
    // The run must end sharp: P3 always closes the window.
    if (!pick.includes("P3")) pick = [pick[0], "P3"];
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
  const shareSum = active.reduce((a, p) => a + SHARE[p], 0);
  const weeks: Record<string, number> = {};
  for (const p of active) weeks[p] = Math.max(remainingMin(p, credit), Math.floor((SHARE[p] / shareSum) * w));
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

// ---------------------------------------------------------------- per athlete

export interface AthletePhaseInput {
  today: string;
  /** First game or big event ahead (the hard date). */
  hardDate: string | null;
  hardDateLabel?: string | null;
  inSeason: boolean;
  yearRound: boolean;
  /** Days until the next game when in season (null if none on file). */
  nextGameGapDays: number | null;
  /** Planned off days + holds inside the window. */
  offDaysInWindow: number;
  /** A hold covers today. */
  holdToday: boolean;
  /** Weeks since the season/arc anchor, used to rotate year-round micro-phases. */
  weeksIntoSeason: number;
  records: readonly WeekRecord[];
  need: NeedInput;
  /** Throwing may already be in-season while lifting still builds (§3). */
  disciplinesInSeason?: readonly Discipline[];
}

export interface DisciplinePlan {
  discipline: Discipline;
  mode: PlanMode;
  current: PhaseKey;
  weeksLeft: number;
  next: PhaseKey | null;
  nextWeeks: number | null;
  sharpenWeek: boolean;
  noNewHeavy: boolean;
  shortened: { phase: PhaseKey; reason: string }[];
  completed: BuildPhase[];
  credit: Record<BuildPhase, number>;
  segments: PhaseSegment[];
  emphasis: string | null;
  paused: boolean;
}

export interface AthletePhasePlan {
  version: string;
  today: string;
  windowWeeks: number | null;
  hardDate: string | null;
  disciplines: DisciplinePlan[];
}

const ROTATION = ["strength", "speed", "sharpen"] as const;

export function windowWeeksFor(today: string, hardDate: string | null, offDays: number): number | null {
  if (!hardDate) return null;
  const days = daysBetween(today, hardDate) - Math.max(0, offDays);
  return Math.max(0, Math.floor(days / 7));
}

export function planAthlete(input: AthletePhaseInput): AthletePhasePlan {
  const ledger = buildCreditLedger(input.records, input.today);
  const W = input.inSeason ? null : windowWeeksFor(input.today, input.hardDate, input.offDaysInWindow);
  const disciplines = DISCIPLINES.map((d): DisciplinePlan => {
    const credit = ledger[d];
    const inSeasonHere = input.inSeason || (input.disciplinesInSeason ?? []).includes(d);
    const base = { discipline: d, credit, paused: input.holdToday, completed: BUILD.filter((p) => credit[p] >= MIN_WEEKS[p]) };

    if (inSeasonHere) {
      const gap = input.nextGameGapDays;
      // Gaps inside a season become mini blocks (§4 year-round rules).
      if (gap !== null && gap >= 21) {
        const alloc = allocateShortArc(Math.floor(gap / 7));
        return fromSegments({ ...base, mode: "short_arc", emphasis: null }, alloc, "P4");
      }
      if (gap !== null && gap >= 10) {
        const phase: BuildPhase = rankNeed(input.need, credit).find((p) => p !== "P1") ?? "P2";
        const weeks = Math.max(1, Math.floor(gap / 7));
        return fromSegments({ ...base, mode: "mini_block", emphasis: null }, [seg(phase, weeks, { endsWithSharpen: phase === "P3" })], "P4");
      }
      const emphasis = input.yearRound ? ROTATION[Math.floor(Math.max(0, input.weeksIntoSeason) / 3) % 3] : null;
      const weeksLeft = input.yearRound ? 3 - (Math.max(0, input.weeksIntoSeason) % 3) : 0;
      return {
        ...base,
        mode: input.yearRound ? "year_round" : "in_season",
        current: "P4",
        weeksLeft,
        next: null,
        nextWeeks: null,
        sharpenWeek: false,
        noNewHeavy: false,
        shortened: [],
        segments: [seg("P4", weeksLeft)],
        emphasis,
      };
    }

    const alloc = allocateWindow({ windowWeeks: W, hardDateLabel: input.hardDateLabel ?? input.hardDate, credit, need: input.need });
    return fromSegments({ ...base, mode: alloc.mode, emphasis: null }, alloc.segments, input.hardDate ? "P4" : null);
  });
  return { version: ADAPTIVE_PHASES_VERSION, today: input.today, windowWeeks: W, hardDate: input.hardDate, disciplines };
}

function allocateShortArc(w: number): PhaseSegment[] {
  // 21+ day gap → short full arc, each phase marked shortened with its reason.
  const reason = `Short break in the season (${w} weeks) — a quick version of each phase.`;
  const weeks = w >= 5 ? [w - 3, 2, 1] : [1, 1, Math.max(1, w - 2)];
  return BUILD.map((p, i) => seg(p, weeks[i], { shortened: true, shortenedReason: reason, endsWithSharpen: p === "P3" }));
}

function fromSegments(
  base: Omit<DisciplinePlan, "current" | "weeksLeft" | "next" | "nextWeeks" | "sharpenWeek" | "noNewHeavy" | "shortened" | "segments">,
  segments: PhaseSegment[],
  after: PhaseKey | null,
): DisciplinePlan {
  const live = segments.filter((s) => s.weeks > 0);
  const first = live[0] ?? seg(after ?? "P1", 0, { noNewHeavy: after === null });
  const second = live[1] ?? null;
  return {
    ...base,
    current: first.phase,
    weeksLeft: first.weeks,
    next: second ? second.phase : after,
    nextWeeks: second ? second.weeks : null,
    sharpenWeek: first.endsWithSharpen && first.weeks === 1,
    noNewHeavy: first.noNewHeavy,
    shortened: segments.filter((s) => s.shortened && s.shortenedReason).map((s) => ({ phase: s.phase, reason: s.shortenedReason! })),
    segments,
  };
}

// ---------------------------------------------------------------- athlete strip (§6)

function prettyDate(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function stripText(plan: DisciplinePlan, hardDate: string | null): string {
  const cur = PHASE_NAME[plan.current];
  if (plan.mode === "in_season") return `${cur} · in season`;
  if (plan.mode === "year_round") return `${cur} · ${plan.emphasis} focus · ${plan.weeksLeft} week${plan.weeksLeft === 1 ? "" : "s"} left`;
  if (plan.mode === "bridge" && !hardDate) return `${cur} · building the base until your next dates are set`;
  const wl = `${plan.weeksLeft} week${plan.weeksLeft === 1 ? "" : "s"} left`;
  const parts = [`${cur} · ${wl}`];
  if (plan.next && plan.next !== "P4" && plan.nextWeeks) {
    parts.push(`next: ${PHASE_NAME[plan.next]} (about ${plan.nextWeeks} week${plan.nextWeeks === 1 ? "" : "s"})`);
  }
  if (hardDate) parts.push(`Game-Ready by ${prettyDate(hardDate)}`);
  return parts.join(" → ");
}
