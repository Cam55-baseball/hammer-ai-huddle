/**
 * dailyEngagement.ts — Hammers Today engagement layer.
 *
 * Frontend-only, additive. Purely interpretive: never authors organism_truth,
 * athlete_intent, authority_override, hard_stop, or rehabilitation_state.
 *
 * Provides four surfaces the daily plan reads:
 *   1. Daily intent narrative     — "Why today, connecting yesterday → tomorrow"
 *   2. Rotation / variety engine  — flags monotony across a rolling 14d window
 *   3. Streaks + earned unlocks   — consistency milestones per athlete
 *   4. Adaptive re-plan           — recomputes remaining volumes on done/skip
 *
 * State is persisted in localStorage keyed by user id. This is a UI convenience
 * layer — the canonical ledger remains the source of truth for organism state.
 * Guarded for SSR-style environments without `window`.
 *
 * Constitutional subordination: Eternal Laws · Megaphase 151–160 · RR-5 · RR-6.
 */

import type {
  PrescribedBlock,
  ModalityKey,
  BlockPhase,
  HammerDailyPlanResult,
} from "@/lib/hammer/prescription/dailyPlan";

// ---------- persistence ----------

const KEY_PREFIX = "hammer.today.engagement.v1";
const WINDOW_DAYS = 14;
const STREAK_GRACE_DAYS = 1;

export type CompletionState = "done" | "skipped";

export interface DayEntry {
  readonly date: string; // YYYY-MM-DD
  readonly completions: Partial<Record<ModalityKey, CompletionState>>;
  /** phase signature per modality — powers rotation detection. */
  readonly phases: Partial<Record<ModalityKey, BlockPhase>>;
}

export interface EngagementState {
  readonly userId: string;
  readonly days: DayEntry[]; // newest last
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function safeLocalStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadEngagement(userId: string | null | undefined): EngagementState {
  const uid = userId ?? "anon";
  const ls = safeLocalStorage();
  if (!ls) return { userId: uid, days: [] };
  try {
    const raw = ls.getItem(`${KEY_PREFIX}:${uid}`);
    if (!raw) return { userId: uid, days: [] };
    const parsed = JSON.parse(raw) as EngagementState;
    if (!parsed || !Array.isArray(parsed.days)) return { userId: uid, days: [] };
    // Trim to window
    const cutoff = Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000;
    const days = parsed.days.filter((d) => {
      const t = new Date(`${d.date}T00:00:00`).getTime();
      return Number.isFinite(t) && t >= cutoff;
    });
    return { userId: uid, days };
  } catch {
    return { userId: uid, days: [] };
  }
}

function saveEngagement(state: EngagementState): void {
  const ls = safeLocalStorage();
  if (!ls) return;
  try {
    ls.setItem(`${KEY_PREFIX}:${state.userId}`, JSON.stringify(state));
  } catch {
    /* quota — ignore */
  }
}

function upsertToday(state: EngagementState, mutator: (d: DayEntry) => DayEntry): EngagementState {
  const key = todayKey();
  const existing = state.days.find((d) => d.date === key);
  const base: DayEntry = existing ?? { date: key, completions: {}, phases: {} };
  const next = mutator(base);
  const others = state.days.filter((d) => d.date !== key);
  return { ...state, days: [...others, next].sort((a, b) => a.date.localeCompare(b.date)) };
}

// ---------- public mutators ----------

export function recordCompletion(
  userId: string | null | undefined,
  modality: ModalityKey,
  status: CompletionState,
): EngagementState {
  const state = loadEngagement(userId);
  const next = upsertToday(state, (d) => ({
    ...d,
    completions: { ...d.completions, [modality]: status },
  }));
  saveEngagement(next);
  return next;
}

export function recordPhaseSignature(
  userId: string | null | undefined,
  blocks: ReadonlyArray<PrescribedBlock>,
): void {
  const state = loadEngagement(userId);
  const phases: Partial<Record<ModalityKey, BlockPhase>> = {};
  for (const b of blocks) {
    if (b.status === "suppressed") continue;
    phases[b.modality] = b.phase;
  }
  const next = upsertToday(state, (d) => ({ ...d, phases: { ...d.phases, ...phases } }));
  saveEngagement(next);
}

export function todayCompletion(
  state: EngagementState,
  modality: ModalityKey,
): CompletionState | null {
  const t = state.days.find((d) => d.date === todayKey());
  return (t?.completions[modality] as CompletionState | undefined) ?? null;
}

// ---------- streaks + milestones ----------

export interface StreakSummary {
  /** Consecutive days with ≥1 completion. */
  readonly currentDays: number;
  /** Total "done" completions across the window. */
  readonly windowDone: number;
  /** 0–7 count of the last 7 days that had ≥1 completion. */
  readonly last7Active: number;
  /** Ordered oldest→newest for the last 7 days (true = at least 1 done). */
  readonly weekArc: boolean[];
}

export function computeStreak(state: EngagementState): StreakSummary {
  const map = new Map(state.days.map((d) => [d.date, d]));
  const now = new Date();
  const iso = (offset: number): string => {
    const d = new Date(now);
    d.setDate(d.getDate() - offset);
    return d.toISOString().slice(0, 10);
  };

  const hasDone = (date: string): boolean => {
    const d = map.get(date);
    if (!d) return false;
    return Object.values(d.completions).some((v) => v === "done");
  };

  // Current streak with 1-day grace
  let current = 0;
  let grace = STREAK_GRACE_DAYS;
  for (let i = 0; i < WINDOW_DAYS; i++) {
    if (hasDone(iso(i))) {
      current++;
      grace = STREAK_GRACE_DAYS;
    } else if (grace > 0 && current > 0) {
      grace--;
    } else {
      break;
    }
  }

  const weekArc: boolean[] = [];
  for (let i = 6; i >= 0; i--) weekArc.push(hasDone(iso(i)));
  const last7Active = weekArc.filter(Boolean).length;

  let windowDone = 0;
  for (const d of state.days) {
    windowDone += Object.values(d.completions).filter((v) => v === "done").length;
  }

  return { currentDays: current, windowDone, last7Active, weekArc };
}

export interface Milestone {
  readonly id: string;
  readonly label: string;
  readonly earned: boolean;
  readonly hint: string;
}

export function computeMilestones(streak: StreakSummary): Milestone[] {
  return [
    {
      id: "spark",
      label: "First Rep",
      earned: streak.windowDone >= 1,
      hint: "Log one completed block.",
    },
    {
      id: "week3",
      label: "3-Day Rhythm",
      earned: streak.currentDays >= 3,
      hint: "Show up 3 days in a row (1-day grace allowed).",
    },
    {
      id: "week5",
      label: "Weekly Discipline",
      earned: streak.last7Active >= 5,
      hint: "Complete work on 5 of the last 7 days.",
    },
    {
      id: "streak7",
      label: "7-Day Forge",
      earned: streak.currentDays >= 7,
      hint: "Seven straight active days.",
    },
    {
      id: "volume20",
      label: "Volume Warrior",
      earned: streak.windowDone >= 20,
      hint: "20 completed blocks in 14 days.",
    },
  ];
}

// ---------- rotation / variety engine ----------

export interface RotationNote {
  readonly modality: ModalityKey;
  /** Number of consecutive prior days the same phase signature appeared. */
  readonly repeatDays: number;
  /** Human copy the UI can render. */
  readonly copy: string;
}

/**
 * Flag modalities whose phase signature has repeated for ≥ threshold days.
 * Rest / recover / warmup are exempt — those are protocol-driven and repetition
 * is intentional. Only interpretive; never mutates the plan.
 */
export function detectMonotony(
  state: EngagementState,
  blocks: ReadonlyArray<PrescribedBlock>,
  threshold = 2,
): RotationNote[] {
  const exempt = new Set<ModalityKey>(["warmup", "recovery", "fueling"]);
  const notes: RotationNote[] = [];
  const sorted = [...state.days].sort((a, b) => b.date.localeCompare(a.date));
  const priorDays = sorted.filter((d) => d.date !== todayKey());

  for (const b of blocks) {
    if (exempt.has(b.modality)) continue;
    if (b.status !== "ready") continue;
    let repeat = 0;
    for (const d of priorDays) {
      if (d.phases[b.modality] === b.phase) repeat++;
      else break;
    }
    if (repeat >= threshold) {
      notes.push({
        modality: b.modality,
        repeatDays: repeat,
        copy: `${labelForModality(b.modality)} has been in "${b.phase}" for ${repeat} straight days — Hammer is dialing in a fresh angle so you keep adapting.`,
      });
    }
  }
  return notes;
}

function labelForModality(m: ModalityKey): string {
  switch (m) {
    case "warmup": return "Warm-up";
    case "speed": return "Speed";
    case "strength": return "Strength";
    case "hitting": return "Hitting";
    case "throwing": return "Throwing";
    case "defense": return "Defense";
    case "baserunning": return "Baserunning";
    case "game_iq": return "Game IQ";
    case "fueling": return "Fueling";
    case "recovery": return "Recovery";
  }
}

// ---------- daily intent narrative ----------

export interface DailyIntent {
  readonly headline: string;
  readonly yesterday: string;
  readonly today: string;
  readonly tomorrow: string;
}

/**
 * Mentor-voice: warm, motivating, always tied to reasoning. Purely derived
 * from the plan + engagement history — no AI call, deterministic.
 */
export function buildDailyIntent(
  plan: HammerDailyPlanResult,
  state: EngagementState,
  streak: StreakSummary,
  cnsHigh: boolean,
): DailyIntent {
  const phase = plan.seasonPhase ?? "in-season";
  const posture = plan.schedulePosture;
  const readyBlocks = plan.blocks.filter((b) => b.status === "ready");
  const primary = readyBlocks[0]?.modality ?? null;

  // Yesterday recap
  const yKey = (() => {
    const d = new Date(); d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  })();
  const yesterday = state.days.find((d) => d.date === yKey);
  const yDone = yesterday
    ? Object.entries(yesterday.completions).filter(([, v]) => v === "done").map(([k]) => k as ModalityKey)
    : [];
  const ySkipped = yesterday
    ? Object.entries(yesterday.completions).filter(([, v]) => v === "skipped").map(([k]) => k as ModalityKey)
    : [];

  const yesterdayCopy = (() => {
    if (yDone.length === 0 && ySkipped.length === 0) {
      return "Fresh page — no work logged yesterday, so today we plant the flag.";
    }
    if (yDone.length > 0 && ySkipped.length === 0) {
      return `Yesterday you closed ${yDone.length} block${yDone.length === 1 ? "" : "s"} (${yDone.map(labelForModality).join(", ")}). That's the foundation we build on.`;
    }
    if (yDone.length === 0 && ySkipped.length > 0) {
      return `Yesterday didn't land — that's data, not defeat. We recalibrate today.`;
    }
    return `Yesterday: ${yDone.length} done, ${ySkipped.length} skipped. We honor both — today reflects what you actually did.`;
  })();

  const todayCopy = (() => {
    if (posture === "game") return "Game day. Everything today serves competing sharp: prime, don't drain.";
    if (posture === "tournament") return "Tournament posture — legs and CNS are currency. Move with intent, waste nothing.";
    if (posture === "taper") return "Tapering into competition. Volume drops, quality rises. Every rep is a rehearsal.";
    if (posture === "camp") return "Camp day. Team sets the load; Hammer supports what you can't get there.";
    if (posture === "travel") return "Travel day. Hydration, mobility, breath — the invisible wins.";
    if (cnsHigh) return `${phase === "offseason" ? "Off-season" : "In-season"} build day, but CNS is already loaded — skill work stays crisp, not compounding.`;
    if (primary === "speed") return "Fresh CNS window — speed leads, and the day follows. Attack the first rep.";
    if (primary === "strength") return "Strength anchors today. Move heavy things with intent; every rep pays a debt to your future self.";
    if (primary === "hitting") return "Bat leads the day. Quality of contact > quantity of swings.";
    if (primary === "throwing") return "Arm forward today. Command precedes velocity — always.";
    return "Purposeful day. Each block feeds the next; nothing here is filler.";
  })();

  const tomorrowCopy = (() => {
    if (posture === "game") return "Tomorrow: recovery leads. We refill what today spends.";
    if (cnsHigh) return "Tomorrow will step down intensity so today's stimulus turns into adaptation.";
    if (phase === "offseason") return "Tomorrow we stack — off-season is a compound-interest game.";
    if (streak.currentDays >= 3) return `Tomorrow keeps your ${streak.currentDays}-day rhythm alive. Consistency is the multiplier.`;
    return "Tomorrow builds on what you do here — protect the pattern.";
  })();

  const headline = (() => {
    if (streak.currentDays >= 7) return `Day ${streak.currentDays} — the forge is hot.`;
    if (streak.currentDays >= 3) return `Day ${streak.currentDays} — rhythm is real.`;
    if (streak.currentDays === 0 && streak.windowDone === 0) return "Start line. First honest rep changes everything.";
    return "Today has a reason — let's execute it.";
  })();

  return { headline, yesterday: yesterdayCopy, today: todayCopy, tomorrow: tomorrowCopy };
}

// ---------- adaptive re-plan ----------

export interface AdaptiveAdjustment {
  readonly modality: ModalityKey;
  /** Delta to apply to prescribed duration (minutes). Negative = shrink. */
  readonly durationDeltaMin: number;
  readonly note: string;
}

/**
 * When the athlete marks blocks done/skipped mid-session, propose adjustments
 * for remaining blocks. Pure — returns a projection, does not mutate anything.
 * The UI surfaces these as coaching notes; the ledger of truth is unchanged.
 */
export function projectAdaptiveAdjustments(
  blocks: ReadonlyArray<PrescribedBlock>,
  state: EngagementState,
): AdaptiveAdjustment[] {
  const today = state.days.find((d) => d.date === todayKey());
  if (!today) return [];
  const skipped = new Set<ModalityKey>(
    Object.entries(today.completions)
      .filter(([, v]) => v === "skipped")
      .map(([k]) => k as ModalityKey),
  );
  const done = new Set<ModalityKey>(
    Object.entries(today.completions)
      .filter(([, v]) => v === "done")
      .map(([k]) => k as ModalityKey),
  );
  if (skipped.size === 0 && done.size === 0) return [];

  const adjustments: AdaptiveAdjustment[] = [];
  const remaining = blocks.filter(
    (b) => b.status === "ready" && !done.has(b.modality) && !skipped.has(b.modality),
  );

  // Rule 1: speed skipped → shrink conditioning (already-tired CNS signal)
  if (skipped.has("speed")) {
    const cond = remaining.find((b) => b.modality === "strength" || b.modality === "throwing");
    if (cond) {
      adjustments.push({
        modality: cond.modality,
        durationDeltaMin: -10,
        note: "Speed was skipped — trim intensity here so we protect tomorrow rather than dig a hole.",
      });
    }
  }

  // Rule 2: strength skipped → keep skill sharp but cap volume
  if (skipped.has("strength")) {
    for (const b of remaining) {
      if (b.modality === "hitting" || b.modality === "throwing") {
        adjustments.push({
          modality: b.modality,
          durationDeltaMin: -5,
          note: "Strength off the board — hold skill quality, cut volume so you finish fresh.",
        });
      }
    }
  }

  // Rule 3: 3+ done already → gently bias remaining toward recovery/skill
  if (done.size >= 3) {
    const cond = remaining.find((b) => b.modality === "strength");
    if (cond) {
      adjustments.push({
        modality: cond.modality,
        durationDeltaMin: -5,
        note: "You've already done real work today — keep this crisp, not crushing.",
      });
    }
  }

  return adjustments;
}
