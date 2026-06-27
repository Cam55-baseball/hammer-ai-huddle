/**
 * Athlete Context Decision Filters — P0-3 Decision Activation.
 *
 * Pure, deterministic helpers that turn the canonical context envelope into
 * decision branches for workout / speed / roadmap / recommendation engines.
 *
 * Read-path only. No new doctrine, no new schema. Every function:
 *   - takes the existing spine envelope (or a synthetic projection in tests)
 *   - returns lineage-visible filter/rerank decisions
 *   - preserves missingness (a missing variable is a permissive branch — never a
 *     fabricated certainty per FC global continuity).
 *
 * Used by:
 *   - `useDrillRecommendations` (RFL-029)
 *   - `useWorkoutRecommendations` body (RFL-029)
 *   - `src/lib/pieV2/recommendDrills` (RFL-029)
 *   - `src/lib/pieV2/recommendVideos` (RFL-029)
 *   - `useSpeedProgress` derived focus (RFL-030)
 *   - `useRoadmapProgress` ordering (RFL-031)
 */
import type { HammerAthleteContext } from "@/lib/hammer/context/athleteContext";
import { injuryHistoryToText } from "@/lib/hammer/context/normalizers";
import {
  normalizeCategoryGoals,
  type CategoryGoalsPayload,
} from "@/lib/hammer/goals/categoryGoals";

/* ── Envelope-shaped projection ──────────────────────────────────────────── */

export interface AthleteContextProjection {
  readonly equipment: string | null; // canonical: full_gym | home_gym | bodyweight | bands | hotel | …
  readonly equipmentScope: string | null; // persistent | temporary | session | inferred
  readonly injury: string | null;
  readonly injuryRegions: ReadonlyArray<string>; // ["shoulder","ucl",…]
  readonly liftingAgeYears: number | null;
  readonly lifecycleBand: string | null; // u10 | u12 | u14 | u16 | u18 | adult
  readonly seasonPhase: string | null; // off | pre | in | post
  readonly developmentPriorities: ReadonlyArray<string>; // ["strength","power","speed","mobility","skill","recovery","maintenance"]
  readonly weeklyAvailabilityDays: number | null;
  readonly goalSummary: string | null;
  readonly goalHorizon: string | null;
  readonly categoryGoals: CategoryGoalsPayload | null;
  readonly readinessScore: number | null; // 0..1
  readonly workloadHigh: boolean;
  readonly asymmetryPct: number | null;
  readonly speedFreshness: number | null; // 0..1
  // RFL-034 — minor-athlete supremacy (interpretive, read-only).
  // Derived strictly from spine projections; never authored here.
  readonly isMinor: boolean | null; // null when both lifecycle_band and dob missing
  readonly parentSupremacyActive: boolean; // active parent_link projected on spine
  readonly parentConcerns: ReadonlyArray<string>; // ["arm_load","speed_max","heavy_lift",…]
  readonly missing: ReadonlyArray<string>;
}

const MINOR_BANDS = new Set(["u10", "u12", "u14", "u16", "u18"]);


const KNOWN_INJURY_REGIONS = [
  "shoulder", "ucl", "elbow", "wrist", "hand",
  "hip", "knee", "ankle", "foot", "back", "lumbar", "neck",
  "hamstring", "quad", "groin", "calf", "achilles",
];

/**
 * Coerce the canonical `injury_history` spine value to a normalized
 * lowercased text blob suitable for region-keyword matching.
 *
 * Delegates to the canonical `injuryHistoryToText()` normalizer so every
 * consumer agrees on shape handling. Returns `null` when the input carries
 * no usable text — missingness is preserved, never fabricated.
 */
function normalizeInjuryToText(raw: unknown): string | null {
  const txt = injuryHistoryToText(raw);
  return txt === "" ? null : txt;
}

export function projectEnvelope(ctx: HammerAthleteContext): AthleteContextProjection {
  const eq = ctx.get<unknown>("equipment_effective")?.value as
    | { equipment?: string; scope?: string }
    | string
    | null;
  const equipment =
    typeof eq === "string"
      ? eq
      : (eq as { equipment?: string } | null)?.equipment ?? null;
  const equipmentScope =
    typeof eq === "object" && eq !== null
      ? ((eq as { scope?: string }).scope ?? null)
      : null;

  // RFL: spine `injury_history` is heterogeneous across producers:
  //   - useHammerOnboardingDirector → [] | [{ note, reported_at }]
  //   - PhysioHealthIntakeDialog    → string[]
  //   - legacy/free-text            → string
  // Normalize defensively. Missingness is preserved (null), never fabricated.
  const injury = normalizeInjuryToText(ctx.get<unknown>("injury_history")?.value);
  const injuryRegions = injury
    ? KNOWN_INJURY_REGIONS.filter((r) => injury.includes(r))
    : [];

  const readinessRaw = ctx.get<{ score?: number }>("readiness")?.value as
    | { score?: number }
    | number
    | null;
  const readinessScore =
    typeof readinessRaw === "number"
      ? readinessRaw
      : typeof readinessRaw?.score === "number"
        ? readinessRaw.score
        : null;

  const devPriorities =
    (ctx.get<string[]>("development_priorities")?.value as string[] | null) ?? [];

  // Best-effort live projections (existing surfaces — workload, asymmetry, freshness).
  const workloadVal = ctx.get<{ status?: string } | number>("workload")?.value;
  const workloadHigh =
    (typeof workloadVal === "object" && (workloadVal as { status?: string })?.status === "high") ||
    (typeof workloadVal === "number" && workloadVal > 0.75);

  const asymVal = ctx.get<number>("asymmetry_pct")?.value as number | null;
  const freshnessVal = ctx.get<number>("speed_freshness")?.value as number | null;

  const missing = ctx.missing.map((v) => v.key);

  const lifecycleBand = (ctx.get<string>("lifecycle_band")?.value as string | null) ?? null;
  // RFL-034 — minor inference. lifecycle_band is canonical; dob is fallback.
  const dob = ctx.get<string>("date_of_birth")?.value as string | null | undefined;
  let isMinor: boolean | null = null;
  if (lifecycleBand) {
    isMinor = MINOR_BANDS.has(lifecycleBand);
  } else if (dob) {
    const ageMs = Date.now() - new Date(dob).getTime();
    const ageYears = ageMs / (365.25 * 24 * 3600 * 1000);
    isMinor = Number.isFinite(ageYears) ? ageYears < 18 : null;
  }
  const parentLink = ctx.get<unknown>("parent_link_active")?.value as unknown;
  const parentSupremacyActive =
    (typeof parentLink === "object" && parentLink !== null && (parentLink as { status?: string }).status === "active") ||
    parentLink === "active" ||
    parentLink === true;
  const parentConcerns =
    (ctx.get<string[]>("parent_concerns")?.value as string[] | null) ?? [];

  return {
    equipment,
    equipmentScope,
    injury,
    injuryRegions,
    liftingAgeYears: (ctx.get<number>("lifting_age_years")?.value as number | null) ?? null,
    lifecycleBand,
    seasonPhase: (ctx.get<string>("season_phase")?.value as string | null) ?? null,
    developmentPriorities: devPriorities,
    weeklyAvailabilityDays:
      (ctx.get<number>("weekly_availability_days")?.value as number | null) ?? null,
    goalSummary: (ctx.get<string>("goal_summary")?.value as string | null) ?? null,
    goalHorizon: (ctx.get<string>("goal_horizon")?.value as string | null) ?? null,
    readinessScore,
    workloadHigh,
    asymmetryPct: asymVal ?? null,
    speedFreshness: freshnessVal ?? null,
    isMinor,
    parentSupremacyActive: !!parentSupremacyActive,
    parentConcerns,
    missing,
  };
}


/* ── Equipment legality ──────────────────────────────────────────────────── */

const EQUIPMENT_PATTERN_BLOCKLIST: Record<string, ReadonlyArray<string>> = {
  bodyweight: ["barbell", "trap_bar", "deadlift", "back_squat", "bench_press", "rack_pull", "kettlebell", "dumbbell"],
  bands: ["barbell", "trap_bar", "deadlift", "back_squat", "bench_press"],
  hotel: ["barbell", "trap_bar", "deadlift", "back_squat", "bench_press", "rack"],
  home_gym: ["specialty_bar", "platform_drop"],
  full_gym: [],
};

export function isEquipmentLegal(
  drillTagsOrName: ReadonlyArray<string>,
  proj: Pick<AthleteContextProjection, "equipment">,
): boolean {
  const eq = proj.equipment;
  if (!eq) return true; // missingness → permissive
  const block = EQUIPMENT_PATTERN_BLOCKLIST[eq] ?? [];
  if (block.length === 0) return true;
  const haystack = drillTagsOrName.join(" ").toLowerCase();
  return !block.some((p) => haystack.includes(p));
}

/* ── Injury legality ─────────────────────────────────────────────────────── */

const INJURY_BLOCKED_PATTERNS: Record<string, ReadonlyArray<string>> = {
  shoulder: ["overhead_press", "snatch", "jerk", "max_throw"],
  ucl: ["max_throw", "long_toss_max", "pull_down"],
  elbow: ["max_throw", "weighted_ball_max"],
  knee: ["max_jump", "depth_jump", "heavy_squat", "lunge_jump"],
  ankle: ["sprint_max", "depth_jump", "lateral_bound_max"],
  hamstring: ["sprint_max", "deadlift_max", "rdl_max"],
  groin: ["lateral_bound_max", "lateral_lunge_heavy"],
  back: ["deadlift_max", "good_morning_heavy", "back_squat_max"],
  lumbar: ["deadlift_max", "good_morning_heavy"],
};

export function isInjuryLegal(
  drillTagsOrName: ReadonlyArray<string>,
  proj: Pick<AthleteContextProjection, "injuryRegions">,
): boolean {
  if (proj.injuryRegions.length === 0) return true;
  const haystack = drillTagsOrName.join(" ").toLowerCase();
  for (const region of proj.injuryRegions) {
    const blocked = INJURY_BLOCKED_PATTERNS[region] ?? [];
    if (blocked.some((p) => haystack.includes(p))) return false;
  }
  return true;
}

/* ── Lifecycle legality ──────────────────────────────────────────────────── */

const YOUTH_BANDS = new Set(["u10", "u12", "u14"]);
const YOUTH_BLOCKED = ["max_load", "1rm", "weighted_ball_max", "depth_jump_max", "pull_down"];

export function isLifecycleLegal(
  drillTagsOrName: ReadonlyArray<string>,
  proj: Pick<AthleteContextProjection, "lifecycleBand">,
): boolean {
  if (!proj.lifecycleBand) return true;
  if (!YOUTH_BANDS.has(proj.lifecycleBand)) return true;
  const haystack = drillTagsOrName.join(" ").toLowerCase();
  return !YOUTH_BLOCKED.some((p) => haystack.includes(p));
}

/* ── Minor-athlete + parent-supremacy legality (RFL-034) ─────────────────── */

// High-risk patterns for any minor, regardless of parent concerns.
const MINOR_HIGH_RISK = [
  "max_load", "1rm", "weighted_ball_max", "depth_jump_max", "pull_down",
  "max_throw", "heavy_squat", "back_squat_max", "deadlift_max",
];

// Parent-concern token → blocked drill patterns.
const PARENT_CONCERN_PATTERNS: Record<string, ReadonlyArray<string>> = {
  arm_load: ["max_throw", "weighted_ball", "long_toss_max", "pull_down"],
  speed_max: ["sprint_max", "max_velocity"],
  heavy_lift: ["max_load", "1rm", "heavy_squat", "deadlift_max", "back_squat_max"],
  jump_load: ["depth_jump", "depth_jump_max", "max_jump"],
  contact: ["collision", "contact"],
};

export function isMinorParentLegal(
  drillTagsOrName: ReadonlyArray<string>,
  proj: Pick<AthleteContextProjection, "isMinor" | "parentConcerns" | "parentSupremacyActive">,
): { legal: boolean; reasons: ReadonlyArray<string> } {
  const reasons: string[] = [];
  // Missingness-permissive: unknown minor status → adult prescription.
  if (proj.isMinor !== true) return { legal: true, reasons };

  const hay = drillTagsOrName.join(" ").toLowerCase();
  // Baseline minor protection — superset of YOUTH_BLOCKED, applies to all minors.
  if (MINOR_HIGH_RISK.some((p) => hay.includes(p))) {
    reasons.push("minor:high-risk");
    return { legal: false, reasons };
  }
  // Parent-flagged concerns add additional patterns.
  for (const concern of proj.parentConcerns) {
    const pats = PARENT_CONCERN_PATTERNS[concern] ?? [];
    if (pats.some((p) => hay.includes(p))) {
      reasons.push(`minor:parent-concern:${concern}`);
      return { legal: false, reasons };
    }
  }
  return { legal: true, reasons };
}

/* ── Composite legality + priority rerank ────────────────────────────────── */

export interface ContextFilterDecision<T> {
  readonly item: T;
  readonly legal: boolean;
  readonly priorityBoost: number;
  readonly reasons: ReadonlyArray<string>;
}

export interface ItemContextView {
  readonly tags: ReadonlyArray<string>; // includes name + module + skill_target tokens
}

export function applyContextFilter<T extends ItemContextView>(
  items: ReadonlyArray<T>,
  proj: AthleteContextProjection,
): ReadonlyArray<ContextFilterDecision<T>> {
  return items.map((it) => {
    const reasons: string[] = [];
    let legal = true;
    if (!isEquipmentLegal(it.tags, proj)) {
      legal = false;
      reasons.push(`equipment:${proj.equipment}`);
    }
    if (!isInjuryLegal(it.tags, proj)) {
      legal = false;
      reasons.push(`injury:${proj.injuryRegions.join(",")}`);
    }
    if (!isLifecycleLegal(it.tags, proj)) {
      legal = false;
      reasons.push(`lifecycle:${proj.lifecycleBand}`);
    }
    // RFL-034 — minor + parent-supremacy gate.
    const mp = isMinorParentLegal(it.tags, proj);
    if (!mp.legal) {
      legal = false;
      for (const r of mp.reasons) reasons.push(r);
    }
    let boost = 0;
    const hay = it.tags.join(" ").toLowerCase();
    for (const p of proj.developmentPriorities) {
      if (hay.includes(p.toLowerCase())) {
        boost += 10;
        reasons.push(`priority+${p}`);
      }
    }
    if (proj.seasonPhase === "in" && hay.includes("max")) {
      boost -= 5;
      reasons.push("inseason-deintensify");
    }
    if (proj.seasonPhase === "off" && hay.includes("volume")) {
      boost += 3;
      reasons.push("offseason-volume");
    }
    return { item: it, legal, priorityBoost: boost, reasons };
  });
}

/* ── Speed focus selection (RFL-030) ─────────────────────────────────────── */

export type SpeedFocusKind =
  | "deload"
  | "unilateral_symmetry"
  | "offseason_volume"
  | "inseason_freshness"
  | "tempo_recovery"
  | "max_velocity"
  | "acceleration_base";

export interface SpeedFocusDecision {
  readonly focus: SpeedFocusKind;
  readonly rationale: string;
  readonly maxEffortAllowed: boolean;
  readonly recommendedReps: number;
}

export function selectSpeedFocus(proj: AthleteContextProjection): SpeedFocusDecision {
  // RFL-034 — minor + parent-concern supremacy (precedes injury per minor-supremacy doctrine).
  if (proj.isMinor === true && proj.parentConcerns.includes("speed_max")) {
    return {
      focus: "tempo_recovery",
      rationale: "minor + parent concern (speed_max) — max-effort sprints suppressed",
      maxEffortAllowed: false,
      recommendedReps: 4,
    };
  }
  // Injury supremacy — RR-6 doctrine.
  if (proj.injuryRegions.some((r) => ["hamstring", "ankle", "knee", "groin"].includes(r))) {
    return {
      focus: "tempo_recovery",
      rationale: `injury (${proj.injuryRegions.join(",")}) — max-effort sprints suppressed`,
      maxEffortAllowed: false,
      recommendedReps: 4,
    };
  }
  if (proj.workloadHigh || (proj.readinessScore !== null && proj.readinessScore < 0.4)) {
    return {
      focus: "deload",
      rationale: "high workload / low readiness — deload",
      maxEffortAllowed: false,
      recommendedReps: 3,
    };
  }
  if (proj.asymmetryPct !== null && proj.asymmetryPct > 10) {
    return {
      focus: "unilateral_symmetry",
      rationale: `asymmetry ${proj.asymmetryPct.toFixed(1)}% > 10% — unilateral focus`,
      maxEffortAllowed: true,
      recommendedReps: 6,
    };
  }
  if (proj.seasonPhase === "in") {
    return {
      focus: "inseason_freshness",
      rationale: "in-season — preserve freshness",
      maxEffortAllowed: true,
      recommendedReps: 4,
    };
  }
  if (proj.seasonPhase === "off") {
    return {
      focus: "offseason_volume",
      rationale: "off-season — volume + base",
      maxEffortAllowed: true,
      recommendedReps: 8,
    };
  }
  if (proj.developmentPriorities.includes("speed") || proj.developmentPriorities.includes("power")) {
    return {
      focus: "max_velocity",
      rationale: "development priority: speed/power",
      maxEffortAllowed: true,
      recommendedReps: 5,
    };
  }
  return {
    focus: "acceleration_base",
    rationale: "default — acceleration base",
    maxEffortAllowed: true,
    recommendedReps: 5,
  };
}

/* ── Roadmap ordering (RFL-031a) ─────────────────────────────────────────── */

export interface RoadmapMilestoneView {
  readonly id: string;
  readonly module: string | null;
  readonly title: string | null;
  readonly tags: ReadonlyArray<string>;
  readonly lifecycleBands?: ReadonlyArray<string>;
  readonly milestoneOrder?: number | null;
}

export interface OrderedMilestone<T extends RoadmapMilestoneView> {
  readonly milestone: T;
  readonly score: number;
  readonly suppressed: boolean;
  readonly reasons: ReadonlyArray<string>;
}

export function orderRoadmapMilestones<T extends RoadmapMilestoneView>(
  milestones: ReadonlyArray<T>,
  proj: AthleteContextProjection,
): ReadonlyArray<OrderedMilestone<T>> {
  return milestones
    .map((m) => {
      const reasons: string[] = [];
      let score = -(m.milestoneOrder ?? 0); // preserve baseline ordering inversely
      let suppressed = false;

      const hay = (m.tags.join(" ") + " " + (m.title ?? "") + " " + (m.module ?? "")).toLowerCase();

      // Lifecycle gating
      if (m.lifecycleBands && proj.lifecycleBand && !m.lifecycleBands.includes(proj.lifecycleBand)) {
        suppressed = true;
        reasons.push(`lifecycle-mismatch:${proj.lifecycleBand}`);
      }

      // Injury suppression: defer high-load milestones during active injury
      if (proj.injuryRegions.length > 0 && /max|heavy|sprint_max|throw_max/.test(hay)) {
        suppressed = true;
        reasons.push("injury-defer");
      }
      // RFL-034 — minor + parent concern defers high-load milestones.
      if (proj.isMinor === true && proj.parentConcerns.length > 0 && /max|heavy|sprint_max|throw_max/.test(hay)) {
        suppressed = true;
        reasons.push("minor-parent-defer");
      }
      // High workload defers max-effort
      if (proj.workloadHigh && /max|heavy/.test(hay)) {
        score -= 50;
        reasons.push("workload-defer");
      }

      // Development priorities promote
      for (const p of proj.developmentPriorities) {
        if (hay.includes(p.toLowerCase())) {
          score += 30;
          reasons.push(`priority+${p}`);
        }
      }

      // Goal horizon: short-horizon goals promote near-term milestones
      if (proj.goalHorizon === "short" && m.milestoneOrder !== null && m.milestoneOrder !== undefined) {
        score += Math.max(0, 20 - m.milestoneOrder);
        reasons.push("short-horizon-front-load");
      }

      // Season phase shaping
      if (proj.seasonPhase === "in" && hay.includes("base")) {
        score -= 10;
        reasons.push("inseason-deemphasize-base");
      }
      if (proj.seasonPhase === "off" && hay.includes("base")) {
        score += 10;
        reasons.push("offseason-emphasize-base");
      }

      return { milestone: m, score, suppressed, reasons };
    })
    .sort((a, b) => Number(a.suppressed) - Number(b.suppressed) || b.score - a.score);
}

/* ── Lightweight envelope payload for edge functions (RFL-029 server-side) ─ */

export function toEdgeFunctionPayload(proj: AthleteContextProjection) {
  return {
    equipment: proj.equipment,
    equipment_scope: proj.equipmentScope,
    injury: proj.injury,
    injury_regions: proj.injuryRegions,
    lifting_age_years: proj.liftingAgeYears,
    lifecycle_band: proj.lifecycleBand,
    season_phase: proj.seasonPhase,
    development_priorities: proj.developmentPriorities,
    weekly_availability_days: proj.weeklyAvailabilityDays,
    goal_summary: proj.goalSummary,
    goal_horizon: proj.goalHorizon,
    readiness_score: proj.readinessScore,
    workload_high: proj.workloadHigh,
    asymmetry_pct: proj.asymmetryPct,
    speed_freshness: proj.speedFreshness,
    is_minor: proj.isMinor,
    parent_supremacy_active: proj.parentSupremacyActive,
    parent_concerns: proj.parentConcerns,
    missing: proj.missing,
  };
}
