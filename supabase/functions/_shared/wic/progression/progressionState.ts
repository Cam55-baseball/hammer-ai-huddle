// WIC Progression State — canonical, pure derivation of "where is this
// athlete inside their development wave, and what did they already do?"
//
// Inputs are raw history rows (wk_prescriptions + wk_session_logs) loaded once
// by the generator. This module performs NO I/O and has NO side effects, so
// every daily plan remains deterministically replayable from the ledger.
//
// Constitutional stance: interpretive only. Progression never authors
// organism truth, never overrides safety / recovery / medical layers, and
// never fabricates a performance number that was not logged.

/** Fixed global anchor (a Monday) so block/week math never drifts. */
const WAVE_ANCHOR_ISO = "2024-01-01";

export type BlockWeekPhase = "accumulate" | "intensify" | "peak" | "deload";

export interface HistoryPrescriptionRow {
  plan_date: string;
  slot: string;
  movement_slug: string;
  sets?: number | null;
  reps?: number | null;
  distance_feet?: number | null;
  total_reps?: number | null;
  duration_seconds?: number | null;
  why_payload?: Record<string, unknown> | null;
}

export interface HistorySessionLogRow {
  plan_date: string;
  movement_slug: string;
  sets_completed?: number | null;
  total_reps_completed?: number | null;
  distance_feet_completed?: number | null;
  duration_seconds_completed?: number | null;
  load_used?: number | null;
  rpe?: number | null;
  bar_feel?: string | null;
  metrics?: Record<string, unknown> | null;
}

export interface MovementExposure {
  readonly slug: string;
  /** Most recent plan_date this movement was prescribed. */
  readonly lastPrescribedDate: string;
  readonly daysSince: number;
  /** How many times inside the loaded history window. */
  readonly exposures: number;
  /** Whether the athlete actually logged it the last time it appeared. */
  readonly lastLogged: boolean;
}

/** A tracked, comparable performance metric with the athlete's own best. */
export interface MetricBest {
  readonly key: string;          // "bat_speed_mph" | "sprint_distance_ft" | "load_lb" | …
  readonly label: string;
  readonly best: number;
  readonly bestDate: string;
  readonly last: number;
  readonly lastDate: string;
  readonly unit: string;
}

export interface ProgressionState {
  /** 0-based development block since the global anchor. */
  readonly blockIndex: number;
  /** 1..4 */
  readonly weekInBlock: number;
  readonly blockPhase: BlockWeekPhase;
  /** Multiplier applied to working volume for the week. */
  readonly volumeFactor: number;
  /** Multiplier applied to intent/intensity exposure for the week. */
  readonly intentFactor: number;
  /** True on the deload week — the plan re-tests instead of piling on. */
  readonly isDeloadWeek: boolean;
  /** slug → exposure record (all slots). */
  readonly exposures: ReadonlyMap<string, MovementExposure>;
  /** metric key → athlete's own best/last. */
  readonly bests: ReadonlyMap<string, MetricBest>;
  /** Average RPE across the window, or null when nothing was logged. */
  readonly avgRpe: number | null;
  /** Share of prescribed items that were actually logged (0..1), null if none. */
  readonly completionRate: number | null;
  /** True when we have no usable history — cards say "baseline session". */
  readonly isBaseline: boolean;
  /** The plan date this state was derived for (ISO yyyy-mm-dd). */
  readonly planDate: string;
}

const BLOCK_PHASES: readonly BlockWeekPhase[] = ["accumulate", "intensify", "peak", "deload"];

const PHASE_FACTORS: Record<BlockWeekPhase, { volume: number; intent: number }> = {
  accumulate: { volume: 1.0, intent: 0.85 },
  intensify: { volume: 1.1, intent: 0.95 },
  peak: { volume: 1.0, intent: 1.15 },
  deload: { volume: 0.6, intent: 0.8 },
};

function daysBetween(fromIso: string, toIso: string): number {
  const a = new Date(fromIso + "T00:00:00Z").getTime();
  const b = new Date(toIso + "T00:00:00Z").getTime();
  return Math.floor((b - a) / 86400000);
}

/** Metric extraction from a session log row — only what was really recorded. */
function metricsFromLog(log: HistorySessionLogRow): Array<{ key: string; label: string; value: number; unit: string }> {
  const out: Array<{ key: string; label: string; value: number; unit: string }> = [];
  const m = (log.metrics ?? {}) as Record<string, unknown>;
  const num = (v: unknown): number | null => {
    const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  const batSpeed =
    num(m["bat_speed_mph"]) ?? num(m["peak_bat_speed"]) ?? num(m["bat_speed"]);
  if (batSpeed) out.push({ key: "bat_speed_mph", label: "peak bat speed", value: batSpeed, unit: "mph" });

  const exitVelo = num(m["exit_velo_mph"]) ?? num(m["exit_velocity"]);
  if (exitVelo) out.push({ key: "exit_velo_mph", label: "exit velo", value: exitVelo, unit: "mph" });

  const sprintTime = num(m["sprint_time_s"]) ?? num(m["time_seconds"]);
  if (sprintTime) out.push({ key: "sprint_time_s", label: "sprint time", value: sprintTime, unit: "s" });

  const throwVelo = num(m["throw_velo_mph"]) ?? num(m["velo_mph"]);
  if (throwVelo) out.push({ key: "throw_velo_mph", label: "throwing velo", value: throwVelo, unit: "mph" });

  const distance = num(log.distance_feet_completed);
  if (distance) out.push({ key: "sprint_distance_ft", label: "sprint distance", value: distance, unit: "ft" });

  const load = num(log.load_used);
  if (load) out.push({ key: "load_lb", label: "load", value: load, unit: "lb" });

  return out;
}

/** Lower-is-better metrics get inverted comparison for "best". */
const LOWER_IS_BETTER = new Set(["sprint_time_s"]);

export interface BuildProgressionInput {
  readonly planDate: string;
  readonly prescriptions: readonly HistoryPrescriptionRow[];
  readonly logs: readonly HistorySessionLogRow[];
}

export function buildProgressionState(input: BuildProgressionInput): ProgressionState {
  const { planDate, prescriptions, logs } = input;

  const daysSinceAnchor = Math.max(0, daysBetween(WAVE_ANCHOR_ISO, planDate));
  const weekIndex = Math.floor(daysSinceAnchor / 7);
  const blockIndex = Math.floor(weekIndex / 4);
  const weekSlot = weekIndex % 4;
  const blockPhase = BLOCK_PHASES[weekSlot];
  const factors = PHASE_FACTORS[blockPhase];

  // ---- exposures -------------------------------------------------------
  const loggedSlugDates = new Set(logs.map((l) => `${l.plan_date}::${l.movement_slug}`));
  const exposures = new Map<string, MovementExposure>();
  for (const rx of prescriptions) {
    if (!rx.movement_slug || !rx.plan_date) continue;
    const prev = exposures.get(rx.movement_slug);
    const isNewer = !prev || rx.plan_date > prev.lastPrescribedDate;
    exposures.set(rx.movement_slug, {
      slug: rx.movement_slug,
      lastPrescribedDate: isNewer ? rx.plan_date : prev!.lastPrescribedDate,
      daysSince: isNewer ? daysBetween(rx.plan_date, planDate) : prev!.daysSince,
      exposures: (prev?.exposures ?? 0) + 1,
      lastLogged: isNewer
        ? loggedSlugDates.has(`${rx.plan_date}::${rx.movement_slug}`)
        : prev!.lastLogged,
    });
  }

  // ---- personal bests --------------------------------------------------
  const bests = new Map<string, MetricBest>();
  const sortedLogs = [...logs].sort((a, b) => (a.plan_date < b.plan_date ? -1 : 1));
  for (const log of sortedLogs) {
    for (const metric of metricsFromLog(log)) {
      const prev = bests.get(metric.key);
      const better =
        !prev ||
        (LOWER_IS_BETTER.has(metric.key) ? metric.value < prev.best : metric.value > prev.best);
      bests.set(metric.key, {
        key: metric.key,
        label: metric.label,
        unit: metric.unit,
        best: better ? metric.value : prev!.best,
        bestDate: better ? log.plan_date : prev!.bestDate,
        last: metric.value,
        lastDate: log.plan_date,
      });
    }
  }

  // ---- effort + adherence ---------------------------------------------
  const rpes = logs.map((l) => Number(l.rpe)).filter((n) => Number.isFinite(n) && n > 0);
  const avgRpe = rpes.length ? Math.round((rpes.reduce((a, b) => a + b, 0) / rpes.length) * 10) / 10 : null;
  const completionRate = prescriptions.length
    ? Math.min(1, loggedSlugDates.size / prescriptions.length)
    : null;

  return {
    blockIndex,
    weekInBlock: weekSlot + 1,
    blockPhase,
    volumeFactor: factors.volume,
    intentFactor: factors.intent,
    isDeloadWeek: blockPhase === "deload",
    exposures,
    bests,
    avgRpe,
    completionRate,
    isBaseline: prescriptions.length === 0 && logs.length === 0,
    planDate,
  };
}

/**
 * Days a movement must rest before it may be re-prescribed, unless it is the
 * deliberate progression vehicle for the current block.
 */
export function reExposureWindowDays(category: string | null | undefined): number {
  const c = (category ?? "").toLowerCase();
  if (c.includes("mobility") || c.includes("pvc") || c.includes("band")) return 0;
  if (c.includes("recovery")) return 1;
  if (c.includes("top_speed") || c.includes("overspeed") || c.includes("pap")) return 5;
  if (c.includes("plyometric") || c.includes("elastic") || c.includes("overload") || c.includes("underload")) return 3;
  return 2;
}

/** True when the slug is inside its re-exposure window on `planDate`. */
export function isInReExposureWindow(
  state: ProgressionState,
  slug: string,
  category: string | null | undefined,
): boolean {
  const exposure = state.exposures.get(slug);
  if (!exposure) return false;
  return exposure.daysSince < reExposureWindowDays(category);
}

export interface ProgressionPayload {
  readonly block_index: number;
  readonly week_in_block: number;
  readonly block_phase: BlockWeekPhase;
  readonly volume_factor: number;
  readonly intent_factor: number;
  readonly is_deload_week: boolean;
  readonly builds_on: string | null;
  readonly target: string | null;
  readonly next_step: string;
  readonly baseline: boolean;
}

const PHASE_LABEL: Record<BlockWeekPhase, string> = {
  accumulate: "Week 1 · build the base",
  intensify: "Week 2 · add work",
  peak: "Week 3 · peak intent",
  deload: "Week 4 · deload + re-test",
};

export function blockLabel(state: ProgressionState, sessionName: string): string {
  return `Block ${state.blockIndex + 1} · ${PHASE_LABEL[state.blockPhase]} — ${sessionName}`;
}

/**
 * Build the lineage payload rendered on the card: what today builds on,
 * what number to beat, and what happens next. Never fabricates a target —
 * when there is no logged history the payload says so.
 */
export function buildProgressionPayload(args: {
  state: ProgressionState;
  slug: string;
  metricKey?: string | null;
  sessionName: string;
}): ProgressionPayload {
  const { state, slug, metricKey, sessionName } = args;
  const exposure = state.exposures.get(slug);
  const best = metricKey ? state.bests.get(metricKey) : undefined;

  const buildsOn = exposure
    ? `Last did ${exposure.daysSince === 0 ? "today" : `${exposure.daysSince}d ago`}${
        exposure.lastLogged ? " and logged it" : " (not logged)"
      }.`
    : "First exposure — this becomes your reference point.";

  const target = best
    ? `Beat ${best.best}${best.unit} ${best.label} (set ${daysAgoLabel(best.bestDate, state)}).`
    : null;

  const nextStep = state.isDeloadWeek
    ? "Next week starts a fresh block — volume climbs again from the number you set this week."
    : state.blockPhase === "peak"
    ? "Next week deloads volume ~40% and re-tests this quality."
    : "Next week adds work on the same quality so the progression is measurable.";

  return {
    block_index: state.blockIndex,
    week_in_block: state.weekInBlock,
    block_phase: state.blockPhase,
    volume_factor: state.volumeFactor,
    intent_factor: state.intentFactor,
    is_deload_week: state.isDeloadWeek,
    builds_on: buildsOn,
    target,
    next_step: nextStep,
    baseline: state.isBaseline || !best,
  };
}

function daysAgoLabel(iso: string, state: ProgressionState): string {
  const days = daysBetween(iso, state.planDate);
  if (!Number.isFinite(days) || days < 0) return "recently";
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

/** Scale a prescribed set count by the week's volume factor, clamped sanely. */
export function scaleSets(base: number | null | undefined, state: ProgressionState): number | null {
  if (typeof base !== "number" || !Number.isFinite(base)) return base ?? null;
  const scaled = Math.round(base * state.volumeFactor);
  return Math.max(1, Math.min(base + 2, scaled));
}
