// In-season post-game plan — training-intelligence-v1 §9, as amended by
// tissue-cost-scheduler-v1 §0 D1. Pure: no clock, no I/O, no database.
//
// Everything here only ever tightens the day. It decides WHEN the lift sits
// (always post-game, never pre-game, always after skill work), which of the two
// role sets it uses, and the pre-game elastic primer.

import type { MethodKey } from "../dosage/methods.ts";

export const IN_SEASON_PLAN_VERSION = "in-season-post-game-v1";

export type LiftSlot = "A" | "B";
export type GameRoleLike = "position" | "catcher" | "starting_pitcher" | "reliever";

export interface InSeasonRole {
  readonly order: number;
  readonly role: string;
  readonly label: string;
  readonly method: MethodKey | null;
  /** Fallback when the equipment is missing. */
  readonly noEquipmentFallback: string | null;
}

/** §9.3 Lift A — Power Anchor. ≤25 minutes, ≤4 movements plus arm care. */
export const LIFT_A_ROLES: readonly InSeasonRole[] = Object.freeze([
  Object.freeze({
    order: 1,
    role: "overcoming_isometric",
    label: "Push into the pins",
    method: "overcoming_isometric" as MethodKey,
    noEquipmentFallback: "wall_drive_isometric",
  }),
  Object.freeze({
    order: 2,
    role: "compound_lower",
    label: "Heavy triples, concentric-dominant",
    method: "heavy_triples" as MethodKey,
    noEquipmentFallback: null,
  }),
  Object.freeze({
    order: 3,
    role: "sled_push",
    label: "Heavy sled push",
    method: null,
    noEquipmentFallback: "band_resisted_march",
  }),
  Object.freeze({
    order: 4,
    role: "arm_care",
    label: "Arm care",
    method: null,
    noEquipmentFallback: null,
  }),
]);

/** §9.3 Lift B — Velocity Reload. ≤25 minutes, ≤4 movements plus arm care. */
export const LIFT_B_ROLES: readonly InSeasonRole[] = Object.freeze([
  Object.freeze({
    order: 1,
    role: "compound_lower",
    label: "Banded speed lift",
    method: "banded_velocity" as MethodKey,
    noEquipmentFallback: "same_lift_max_speed",
  }),
  Object.freeze({
    order: 2,
    role: "sled_drag",
    label: "Light backward sled drag",
    method: null,
    noEquipmentFallback: "backward_walk",
  }),
  Object.freeze({
    order: 3,
    role: "tissue",
    label: "Low-volume tissue work",
    method: null,
    noEquipmentFallback: null,
  }),
  Object.freeze({
    order: 4,
    role: "arm_care",
    label: "Short mobility flow and arm care",
    method: null,
    noEquipmentFallback: null,
  }),
]);

export const IN_SEASON_LIMITS = Object.freeze({
  maxMinutes: 25,
  maxMovements: 4, // plus arm care
  minRir: 3,
  eccentricOverload: false,
  novelty: false,
});

export interface InSeasonPlanInput {
  readonly phase: string;
  readonly planDate: string;
  readonly isGameDay: boolean;
  readonly gameRole: GameRoleLike;
  /** Declared start today / tomorrow for a starting pitcher. */
  readonly startsToday?: boolean;
  readonly startsTomorrow?: boolean;
  /** Days since the last declared start (starting pitchers, 5-day rotation). */
  readonly daysSinceStart?: number | null;
  /** This athlete pitched in relief today. */
  readonly pitchedInReliefToday?: boolean;
  /** Slot of the last completed lift, so A and B alternate. */
  readonly lastLiftSlot?: LiftSlot | null;
  readonly tournamentToday?: boolean;
  readonly doubleheaderToday?: boolean;
  /** Days since the last sprint effort at 90% or more (§9.4). */
  readonly daysSinceMaxVelocity?: number | null;
  /** 4 or more games inside the rolling week. */
  readonly highDensity?: boolean;
}

export interface InSeasonPlanResult {
  readonly applies: boolean;
  readonly slot: LiftSlot | null;
  readonly roles: readonly InSeasonRole[];
  readonly timing: "post_game" | "after_skill_work" | "none";
  readonly timingNote: string | null;
  readonly liftAllowed: boolean;
  readonly primerOnly: boolean;
  /** Pre-game elastic primer (§9.2). */
  readonly preGamePrimer: boolean;
  /** Offer the weekly max-velocity touch (§9.4) — never forced. */
  readonly offerMaxVelocity: boolean;
  /** Catchers never squat deep in-season (§9.3). */
  readonly lowerPattern: "hinge_or_trap_bar" | "any";
  readonly reasons: readonly string[];
  readonly version: string;
}

function none(reasons: string[], preGamePrimer: boolean): InSeasonPlanResult {
  return {
    applies: true,
    slot: null,
    roles: [],
    timing: "none",
    timingNote: null,
    liftAllowed: false,
    primerOnly: true,
    preGamePrimer,
    offerMaxVelocity: false,
    lowerPattern: "any",
    reasons,
    version: IN_SEASON_PLAN_VERSION,
  };
}

/**
 * §9 — resolve the in-season day. Returns applies:false outside the season so
 * the caller keeps today's behaviour untouched.
 */
export function resolveInSeasonPlan(input: InSeasonPlanInput): InSeasonPlanResult {
  const phase = (input.phase ?? "").toLowerCase();
  if (phase !== "in_season") {
    return {
      applies: false,
      slot: null,
      roles: [],
      timing: "none",
      timingNote: null,
      liftAllowed: true,
      primerOnly: false,
      preGamePrimer: false,
      offerMaxVelocity: false,
      lowerPattern: "any",
      reasons: [],
      version: IN_SEASON_PLAN_VERSION,
    };
  }

  const isStarter = input.gameRole === "starting_pitcher";
  // §9.2 — every game day except a starting pitcher on his start day.
  const preGamePrimer = input.isGameDay && !(isStarter && input.startsToday === true);

  if (input.tournamentToday) {
    return none(["Tournament day — primer and recovery flow only."], preGamePrimer);
  }
  if (input.doubleheaderToday) {
    return none(["Doubleheader today — no lift."], preGamePrimer);
  }
  if (isStarter && input.startsToday) {
    return none(["You start today — no lift."], preGamePrimer);
  }
  if (isStarter && input.startsTomorrow) {
    return none(["You start tomorrow — primer only."], preGamePrimer);
  }

  // Which role set. Starters follow the rotation; relievers who threw take B.
  let slot: LiftSlot;
  const reasons: string[] = [];
  if (isStarter && typeof input.daysSinceStart === "number") {
    slot = input.daysSinceStart <= 1 ? "A" : "B";
    reasons.push(
      slot === "A"
        ? "Day after your start — lower body, no heavy pressing."
        : "Two days past your start — speed work.",
    );
  } else if (input.gameRole === "reliever" && input.pitchedInReliefToday) {
    slot = "B";
    reasons.push("You threw today — speed work only.");
  } else {
    slot = input.lastLiftSlot === "A" ? "B" : "A";
  }

  const roles = slot === "A" ? LIFT_A_ROLES : LIFT_B_ROLES;

  const timing: "post_game" | "after_skill_work" = input.isGameDay ? "post_game" : "after_skill_work";
  const timingNote = input.isGameDay ? "Do this after the game." : "Do this after your skill work.";
  reasons.push(
    slot === "A" ? "Power anchor day — 25 minutes." : "Velocity reload day — 25 minutes.",
  );
  reasons.push("Leave 3 or more reps in the tank on everything.");

  const offerMaxVelocity =
    input.gameRole !== "starting_pitcher" &&
    input.gameRole !== "reliever" &&
    !input.isGameDay &&
    input.highDensity !== true &&
    (input.daysSinceMaxVelocity == null || input.daysSinceMaxVelocity >= 7);

  return {
    applies: true,
    slot,
    roles,
    timing,
    timingNote,
    liftAllowed: true,
    primerOnly: false,
    preGamePrimer,
    offerMaxVelocity,
    lowerPattern: input.gameRole === "catcher" ? "hinge_or_trap_bar" : "any",
    reasons,
    version: IN_SEASON_PLAN_VERSION,
  };
}

/** §9.2 — the primer itself. Intensity class `elastic`, counts in the JUMP ledger. */
export const PRE_GAME_PRIMER = Object.freeze({
  maxMinutes: 10,
  jumpSets: 3,
  jumpRepsPerSet: 5,
  jumpTier: 1 as const,
  medBallSets: 1,
  medBallReps: 5,
  intensityClass: "elastic" as const,
  note: "After the team warm-up, before field work: quick pogos and skips, then five easy med-ball throws.",
});

/** §9.4 — the offer text. Never forced. */
export const MAX_VELOCITY_OFFER =
  "Optional: 2–3 build-up runs of 20–30 yards at near-full speed, if the legs feel good.";
