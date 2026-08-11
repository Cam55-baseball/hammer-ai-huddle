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

import {
  deriveCanonicalMetrics,
  LOWER_IS_BETTER,
  type LoggedRound,
} from "./metricNormalizer.ts";

/** Fixed global anchor (a Monday) so block/week math never drifts. */
const WAVE_ANCHOR_ISO = "2024-01-01";

export type BlockWeekPhase = "accumulate" | "intensify" | "peak" | "deload";

export interface HistoryPrescriptionRow {
  plan_date: string;
  slot: string;
  sequence_role?: string | null;
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

/**
 * Every card on Hammers Today resolves to exactly one training domain. The
 * domain is what carries progression: its own exposure history, its own
 * session floor, its own tracked metric, its own place in the wave.
 */
export type TrainingDomain =
  | "movement_prep"
  | "warmup"
  | "speed"
  | "bat_speed"
  | "lift"
  | "supplemental"
  | "conditioning"
  | "cross_sport"
  | "recovery"
  | "mobility"
  | "arm_care"
  | "throwing"
  | "other";

/** Minimum / target movement count for a full training day, per domain. */
export const DOMAIN_SHAPE_FLOOR: Record<TrainingDomain, { min: number; max: number }> = {
  movement_prep: { min: 2, max: 5 },
  warmup: { min: 3, max: 7 },
  speed: { min: 3, max: 6 },
  bat_speed: { min: 4, max: 6 },
  lift: { min: 5, max: 9 },
  supplemental: { min: 1, max: 4 },
  conditioning: { min: 1, max: 3 },
  cross_sport: { min: 1, max: 2 },
  recovery: { min: 1, max: 4 },
  mobility: { min: 1, max: 4 },
  arm_care: { min: 1, max: 4 },
  throwing: { min: 2, max: 5 },
  other: { min: 1, max: 6 },
};

/** The metric each domain progresses against, when the athlete logs one. */
export const DOMAIN_METRIC_KEY: Record<TrainingDomain, string | null> = {
  movement_prep: null,
  warmup: null,
  speed: "sprint_time_s",
  bat_speed: "bat_speed_mph",
  lift: "load_lb",
  supplemental: "load_lb",
  conditioning: null,
  cross_sport: null,
  recovery: null,
  mobility: null,
  arm_care: "throw_velo_mph",
  throwing: "throw_velo_mph",
  other: null,
};

const DOMAIN_SESSION_NAME: Record<TrainingDomain, string> = {
  movement_prep: "Movement Prep",
  warmup: "Warm-up",
  speed: "Running Speed",
  bat_speed: "Bat Speed",
  lift: "Strength",
  supplemental: "Supplemental Strength",
  conditioning: "Conditioning",
  cross_sport: "Cross-Sport",
  recovery: "Recovery",
  mobility: "Mobility",
  arm_care: "Arm Care",
  throwing: "Throwing",
  other: "Training",
};

export function domainSessionName(domain: TrainingDomain): string {
  return DOMAIN_SESSION_NAME[domain] ?? "Training";
}

/** Canonical slot/role → domain resolution. Single source of truth. */
export function domainForSlotRole(slot: string, role?: string | null): TrainingDomain {
  const s = (slot ?? "").toLowerCase();
  const r = (role ?? "").toLowerCase();
  if (r === "arm_care") return "arm_care";
  switch (s) {
    case "movement_prep": return "movement_prep";
    case "warmup": return "warmup";
    case "speed": return "speed";
    case "bat_speed": return "bat_speed";
    case "lift": return "lift";
    case "supplemental": return "supplemental";
    case "conditioning": return "conditioning";
    case "cross_sport": return "cross_sport";
    case "recovery": return "recovery";
    case "mobility": return "mobility";
    case "arm_care": return "arm_care";
    case "throwing":
    case "pitching": return "throwing";
    default: return "other";
  }
}

/** Where the athlete sits on the multi-year arc — today always serves this. */
export type CareerStage = "foundation" | "development" | "expression" | "peak" | "sustain" | "longevity";

export interface CareerHorizon {
  readonly stage: CareerStage;
  readonly label: string;
  /** One plain-English line: what this stage is buying the athlete. */
  readonly focus: string;
}

export interface DomainProgress {
  readonly domain: TrainingDomain;
  /** Most recent plan_date this domain was trained, or null. */
  readonly lastSessionDate: string | null;
  readonly daysSinceLastSession: number | null;
  /** Prescribed sessions (distinct days) inside the history window. */
  readonly sessionsInWindow: number;
  /** Distinct days inside the window where at least one item was logged. */
  readonly loggedSessions: number;
  /** loggedSessions / sessionsInWindow, or null with no history. */
  readonly completionRate: number | null;
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
  /** domain → its own history slice. */
  readonly domains: ReadonlyMap<TrainingDomain, DomainProgress>;
  /** Multi-year arc this block sits inside. */
  readonly career: CareerHorizon;
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

/**
 * Metric extraction from a session log row — only what was really recorded.
 *
 * Three sources, in precedence order:
 *   1. canonical top-level keys written by the normalizer at save time,
 *   2. the raw `rounds[]` the athlete typed (covers every log written before
 *      the normalizer existed — no backfill required),
 *   3. real columns (`load_used`, `distance_feet_completed`).
 */
function metricsFromLog(log: HistorySessionLogRow): Array<{ key: string; label: string; value: number; unit: string }> {
  const out: Array<{ key: string; label: string; value: number; unit: string }> = [];
  const seen = new Set<string>();
  const m = (log.metrics ?? {}) as Record<string, unknown>;
  const num = (v: unknown): number | null => {
    const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  const add = (key: string, label: string, value: number | null, unit: string) => {
    if (value == null || seen.has(key)) return;
    seen.add(key);
    out.push({ key, label, value, unit });
  };

  // 1 — canonical keys.
  add("bat_speed_mph", "peak bat speed", num(m["bat_speed_mph"]) ?? num(m["peak_bat_speed"]), "mph");
  add("exit_velo_mph", "exit velo", num(m["exit_velo_mph"]) ?? num(m["exit_velocity"]), "mph");
  add("sprint_time_s", "sprint time", num(m["sprint_time_s"]) ?? num(m["time_seconds"]), "s");
  add("throw_velo_mph", "throwing velo", num(m["throw_velo_mph"]) ?? num(m["velo_mph"]), "mph");
  add("jump_height_in", "jump height", num(m["jump_height_in"]), "in");

  // 2 — derive from the rounds the athlete actually typed.
  const rounds = Array.isArray(m["rounds"]) ? (m["rounds"] as LoggedRound[]) : null;
  const templateId = typeof m["template_id"] === "string" ? (m["template_id"] as string) : null;
  for (const metric of deriveCanonicalMetrics(templateId, rounds)) {
    add(metric.key, metric.label, metric.value, metric.unit);
  }

  // 3 — real columns.
  add("sprint_distance_ft", "sprint distance", num(log.distance_feet_completed), "ft");
  add("load_lb", "load", num(log.load_used), "lb");

  return out;
}


export interface BuildProgressionInput {
  readonly planDate: string;
  readonly prescriptions: readonly HistoryPrescriptionRow[];
  readonly logs: readonly HistorySessionLogRow[];
  /** Chronological age, when known — drives the career horizon only. */
  readonly ageYears?: number | null;
  /** Years of structured training, when known. */
  readonly trainingAgeYears?: number | null;
}

/** Multi-year arc. Interpretive only — never a ceiling on what is prescribed. */
export function resolveCareerHorizon(
  ageYears?: number | null,
  trainingAgeYears?: number | null,
): CareerHorizon {
  const age = Number.isFinite(Number(ageYears)) ? Number(ageYears) : null;
  const ta = Number.isFinite(Number(trainingAgeYears)) ? Number(trainingAgeYears) : null;

  if ((age != null && age < 13) || (age == null && (ta ?? 0) < 1)) {
    return {
      stage: "foundation",
      label: "Foundation years",
      focus: "Own every position and pattern first — skill volume beats load right now.",
    };
  }
  if (age != null && age < 16) {
    return {
      stage: "development",
      label: "Development years",
      focus: "Build the engine: repeatable strength, clean speed mechanics, daily skill touches.",
    };
  }
  if (age != null && age < 19) {
    return {
      stage: "expression",
      label: "Expression years",
      focus: "Turn strength into game speed and bat speed — this is where recruiters see the output.",
    };
  }
  if (age != null && age < 27) {
    return {
      stage: "peak",
      label: "Peak output years",
      focus: "Highest ceiling window — push output hard and let recovery protect the ceiling.",
    };
  }
  if (age != null && age < 33) {
    return {
      stage: "sustain",
      label: "Sustain years",
      focus: "Hold peak output with sharper recovery and lower junk volume.",
    };
  }
  return {
    stage: "longevity",
    label: "Longevity years",
    focus: "Protect the qualities that keep you on the field: tissue health, speed, and arm care.",
  };
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

  // ---- per-domain history ---------------------------------------------
  // Every card gets its own lineage: when it last ran, how often, and how
  // reliably the athlete actually completed it.
  const domainDays = new Map<TrainingDomain, Set<string>>();
  const domainLoggedDays = new Map<TrainingDomain, Set<string>>();
  for (const rx of prescriptions) {
    if (!rx.plan_date) continue;
    const domain = domainForSlotRole(rx.slot, (rx as { sequence_role?: string }).sequence_role);
    if (!domainDays.has(domain)) domainDays.set(domain, new Set());
    domainDays.get(domain)!.add(rx.plan_date);
    if (loggedSlugDates.has(`${rx.plan_date}::${rx.movement_slug}`)) {
      if (!domainLoggedDays.has(domain)) domainLoggedDays.set(domain, new Set());
      domainLoggedDays.get(domain)!.add(rx.plan_date);
    }
  }
  const domains = new Map<TrainingDomain, DomainProgress>();
  for (const [domain, days] of domainDays) {
    const sorted = [...days].sort();
    const last = sorted[sorted.length - 1] ?? null;
    const logged = domainLoggedDays.get(domain)?.size ?? 0;
    domains.set(domain, {
      domain,
      lastSessionDate: last,
      daysSinceLastSession: last ? daysBetween(last, planDate) : null,
      sessionsInWindow: days.size,
      loggedSessions: logged,
      completionRate: days.size ? Math.min(1, logged / days.size) : null,
    });
  }

  return {
    blockIndex,
    weekInBlock: weekSlot + 1,
    blockPhase,
    volumeFactor: factors.volume,
    intentFactor: factors.intent,
    isDeloadWeek: blockPhase === "deload",
    exposures,
    bests,
    domains,
    career: resolveCareerHorizon(input.ageYears, input.trainingAgeYears),
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
  /** Which card/domain this lineage belongs to. */
  readonly domain?: TrainingDomain;
  /** Domain-level cadence line, e.g. "Strength ran 6x in the last 4 weeks". */
  readonly domain_history?: string | null;
  readonly career_stage?: CareerStage;
  readonly career_label?: string;
  readonly career_focus?: string;
  /** True when this item is the block's scheduled re-test for its domain. */
  readonly test_day?: boolean;
  /** Canonical metric to capture on a test day. */
  readonly test_metric?: string | null;
  readonly test_metric_label?: string | null;
  /** Plain line when a measurable domain has gone a block with no number. */
  readonly measurement_gap?: string | null;
}

/** Domains that carry a measurable number and therefore a re-test cadence. */
export const MEASURABLE_DOMAINS: readonly TrainingDomain[] = [
  "speed",
  "bat_speed",
  "lift",
  "throwing",
];

const METRIC_LABEL: Record<string, string> = {
  sprint_time_s: "sprint time",
  bat_speed_mph: "bat speed",
  load_lb: "top load",
  throw_velo_mph: "throwing velo",
  exit_velo_mph: "exit velo",
  jump_height_in: "jump height",
};

export function metricLabel(metricKey: string | null | undefined): string | null {
  if (!metricKey) return null;
  return METRIC_LABEL[metricKey] ?? metricKey.replace(/_/g, " ");
}

/**
 * Days since the athlete last produced a number for this metric, or null when
 * they never have. Drives both the re-test prompt and the honest
 * "no measured number since …" line.
 */
export function daysSinceLastMeasurement(
  state: ProgressionState,
  metricKey: string | null | undefined,
): number | null {
  if (!metricKey) return null;
  const best = state.bests.get(metricKey);
  if (!best) return null;
  return daysBetween(best.lastDate, state.planDate);
}

/**
 * Is this domain due for a re-test? Deload week is the constitutional re-test
 * window; a measurable domain with no number inside the whole history window
 * is due regardless of week, because the next block would otherwise progress
 * from nothing.
 */
export function isTestDue(state: ProgressionState, domain: TrainingDomain): boolean {
  if (!MEASURABLE_DOMAINS.includes(domain)) return false;
  const metricKey = DOMAIN_METRIC_KEY[domain];
  if (!metricKey) return false;
  const since = daysSinceLastMeasurement(state, metricKey);
  if (since == null) return true;
  return state.isDeloadWeek && since >= 7;
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
  domain?: TrainingDomain;
  /** Generator marks exactly one item per domain as the block's re-test. */
  testDay?: boolean;
}): ProgressionPayload {
  const { state, slug, metricKey, domain, testDay } = args;

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

  const dp = domain ? state.domains.get(domain) : undefined;
  const domainHistory = dp
    ? `${domainSessionName(dp.domain)} ran ${dp.sessionsInWindow}x in the last 4 weeks` +
      (dp.daysSinceLastSession != null
        ? `, last ${dp.daysSinceLastSession === 0 ? "today" : dp.daysSinceLastSession === 1 ? "yesterday" : `${dp.daysSinceLastSession} days ago`}`
        : "") +
      (dp.completionRate != null ? ` · ${Math.round(dp.completionRate * 100)}% completed.` : ".")
    : domain
    ? `${domainSessionName(domain)} has no history in the last 4 weeks — today sets the reference.`
    : null;

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
    domain,
    domain_history: domainHistory,
    career_stage: state.career.stage,
    career_label: state.career.label,
    career_focus: state.career.focus,
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
