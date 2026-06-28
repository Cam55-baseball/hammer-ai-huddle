/**
 * Sub-goal catalog — mechanism-level, plain-language goals the athlete can
 * actually pick when they don't know *why* they're lacking power/speed/etc.
 *
 * Keyed by (sport, discipline, category). Each sub-goal carries:
 *   - `id`         — stable identifier persisted in athlete_context.category_goals
 *   - `label`      — short user-facing chip text
 *   - `helpText`   — one plain-English sentence describing what this means
 *   - `weightHints`— map of Hammer prescription levers this sub-goal boosts.
 *                    `dailyPlan.ts` consumes these to weight skill blocks.
 *
 * Constitutional rules:
 *  - The catalog is the SINGLE source of truth for legal sub-goal ids. Any id
 *    not present here is dropped by `normalizeCategoryGoals`.
 *  - Pitcher and position-player lists are disjoint by design. Pitchers never
 *    see position-player Throwing; position players never see Pitching.
 *  - Softball-pitcher Pitching never offers `hold_runners` (no pickoffs in SB).
 *  - All weights sum within [0,1] per sub-goal — the 70/30 primary/secondary
 *    split is applied at scoring time, not here.
 */

export type Sport = "baseball" | "softball";
export type Discipline = "position" | "pitcher";
export type CategoryKey =
  | "speed"
  | "power"
  | "throwing"
  | "hitting"
  | "fielding"
  | "pitching";

/** Hammer skill levers a sub-goal can influence. Match modality keys in dailyPlan. */
export type SkillLever =
  | "speed_max_velocity"
  | "speed_acceleration"
  | "speed_baserunning"
  | "speed_conditioning"
  | "strength_lower"
  | "strength_upper"
  | "strength_rotational"
  | "strength_grip"
  | "hitting_bat_speed"
  | "hitting_contact"
  | "hitting_plate_discipline"
  | "hitting_two_strike"
  | "hitting_oppo_power"
  | "throwing_velocity"
  | "throwing_accuracy"
  | "throwing_transfer"
  | "throwing_long_toss"
  | "throwing_footwork"
  | "fielding_range"
  | "fielding_hands"
  | "fielding_first_step"
  | "fielding_double_play"
  | "fielding_pre_pitch"
  | "pitching_command"
  | "pitching_velocity"
  | "pitching_secondary"
  | "pitching_mix"
  | "pitching_stamina"
  | "pitching_hold_runners"
  | "recovery_arm_care";

export interface SubGoal {
  readonly id: string;
  readonly label: string;
  readonly helpText: string;
  readonly weightHints: Partial<Record<SkillLever, number>>;
}

/** Shared (sport-agnostic) sub-goals where the mechanics are identical. */
const SPEED: ReadonlyArray<SubGoal> = [
  { id: "first_step", label: "Quicker first step", helpText: "Explode out of your stance — the first 10 feet decide most plays.", weightHints: { speed_acceleration: 0.7, strength_lower: 0.3 } },
  { id: "top_end", label: "Higher top-end speed", helpText: "Run faster once you're already moving — gap-to-gap, first-to-third.", weightHints: { speed_max_velocity: 0.8, strength_lower: 0.2 } },
  { id: "base_stealing", label: "Steal more bases", helpText: "Better reads, jumps, and slides on the bases.", weightHints: { speed_baserunning: 0.8, speed_acceleration: 0.2 } },
  { id: "conditioning", label: "Stay fast late in games", helpText: "Maintain speed in inning 7 the way you had it in inning 1.", weightHints: { speed_conditioning: 0.7, strength_lower: 0.3 } },
];

const POWER_POSITION: ReadonlyArray<SubGoal> = [
  { id: "bat_speed", label: "Faster bat speed", helpText: "Swing the bat harder through the zone.", weightHints: { hitting_bat_speed: 0.7, strength_rotational: 0.3 } },
  { id: "rotational_horsepower", label: "Rotational horsepower", helpText: "Turn your hips and torso harder — the engine behind every swing and throw.", weightHints: { strength_rotational: 0.7, hitting_bat_speed: 0.3 } },
  { id: "contact_strength", label: "Strength at contact", helpText: "Hold the barrel through contact instead of getting knocked back.", weightHints: { strength_grip: 0.5, strength_upper: 0.3, hitting_contact: 0.2 } },
  { id: "lower_half_drive", label: "Lower-half drive", helpText: "Push the ground harder so your swing and sprint start from the floor up.", weightHints: { strength_lower: 0.7, speed_acceleration: 0.3 } },
  { id: "explosive_jump", label: "Explosive jump / vertical", helpText: "More vertical pop — translates to first step and rotational power.", weightHints: { strength_lower: 0.5, speed_acceleration: 0.5 } },
];

const POWER_PITCHER: ReadonlyArray<SubGoal> = [
  { id: "mound_explosiveness", label: "Mound explosiveness", helpText: "More force off the rubber so velocity climbs without overthrowing.", weightHints: { strength_lower: 0.5, strength_rotational: 0.3, pitching_velocity: 0.2 } },
  { id: "rotational_horsepower", label: "Rotational horsepower", helpText: "Turn the hips harder against a firm front side.", weightHints: { strength_rotational: 0.7, pitching_velocity: 0.3 } },
  { id: "lower_half_drive", label: "Lower-half drive", helpText: "Push the ground harder so your delivery stops leaking energy.", weightHints: { strength_lower: 0.7, pitching_velocity: 0.3 } },
  { id: "upper_body_durability", label: "Upper-body durability", helpText: "Build the shoulders, scaps, and forearm so the arm survives volume.", weightHints: { strength_upper: 0.5, recovery_arm_care: 0.5 } },
];

const THROWING_POSITION: ReadonlyArray<SubGoal> = [
  { id: "arm_strength", label: "Arm strength", helpText: "Carry the ball longer with less effort — outfield throws, infield gun.", weightHints: { throwing_velocity: 0.6, throwing_long_toss: 0.4 } },
  { id: "on_line_accuracy", label: "On-line accuracy", helpText: "Hit the chest, every throw, every base.", weightHints: { throwing_accuracy: 0.8, throwing_footwork: 0.2 } },
  { id: "transfer_exchange", label: "Glove-to-hand transfer", helpText: "Cleaner, faster exchange so runners don't beat the throw.", weightHints: { throwing_transfer: 0.8, fielding_hands: 0.2 } },
  { id: "footwork", label: "Footwork into the throw", helpText: "Get your feet right so the throw is online before the arm tries to save it.", weightHints: { throwing_footwork: 0.7, throwing_accuracy: 0.3 } },
  { id: "long_toss_capacity", label: "Long-toss capacity", helpText: "Build a durable, healthy arm with progressive distance.", weightHints: { throwing_long_toss: 0.7, recovery_arm_care: 0.3 } },
];

const HITTING: ReadonlyArray<SubGoal> = [
  { id: "barrel_control", label: "Barrel control", helpText: "Square up more pitches — get the barrel to the ball more often.", weightHints: { hitting_contact: 0.7, hitting_bat_speed: 0.3 } },
  { id: "plate_discipline", label: "Plate discipline", helpText: "Swing at strikes, take balls — own the zone.", weightHints: { hitting_plate_discipline: 0.9 } },
  { id: "two_strike_approach", label: "Two-strike approach", helpText: "Survive and damage with two strikes — no easy at-bats given up.", weightHints: { hitting_two_strike: 0.8, hitting_contact: 0.2 } },
  { id: "oppo_power", label: "Oppo / all-fields power", helpText: "Drive the ball to all fields, not just pull side.", weightHints: { hitting_oppo_power: 0.7, hitting_bat_speed: 0.3 } },
  { id: "launch_consistency", label: "Consistent launch", helpText: "Quit hitting the top of the ball — line drives and lift, not chops.", weightHints: { hitting_contact: 0.5, hitting_bat_speed: 0.5 } },
];

const FIELDING: ReadonlyArray<SubGoal> = [
  { id: "range", label: "Expand range", helpText: "Get to more balls — lateral and back-pedal coverage.", weightHints: { fielding_range: 0.7, fielding_first_step: 0.3 } },
  { id: "hands", label: "Cleaner hands", helpText: "Stop kicking balls — soft, quiet, repeatable glove work.", weightHints: { fielding_hands: 0.9 } },
  { id: "first_step", label: "First-step read", helpText: "Read the ball off the bat one step faster.", weightHints: { fielding_first_step: 0.8, fielding_pre_pitch: 0.2 } },
  { id: "double_play", label: "Double-play turn", helpText: "Cleaner pivot, faster feed — middle-infield specialty.", weightHints: { fielding_double_play: 0.8, throwing_transfer: 0.2 } },
  { id: "pre_pitch_routine", label: "Pre-pitch routine", helpText: "Set up early so the play is half-won before contact.", weightHints: { fielding_pre_pitch: 0.9 } },
];

const PITCHING_BASEBALL: ReadonlyArray<SubGoal> = [
  { id: "command", label: "Command / zone %", helpText: "Hit your spots — strike one, edges, no give-up pitches.", weightHints: { pitching_command: 0.9 } },
  { id: "velocity", label: "Add velocity", helpText: "Climb the fastball — measured, replay-safe, never overthrown.", weightHints: { pitching_velocity: 0.7, strength_rotational: 0.3 } },
  { id: "secondary_pitch", label: "Develop a secondary pitch", helpText: "Build a true second weapon (curve, slider, change, split).", weightHints: { pitching_secondary: 0.9 } },
  { id: "pitch_mix", label: "Sequencing / pitch mix", helpText: "Use what you have on purpose — set up the put-away.", weightHints: { pitching_mix: 0.9 } },
  { id: "stamina", label: "Stamina / pitch count", helpText: "Hold velo and command deeper into outings.", weightHints: { pitching_stamina: 0.7, speed_conditioning: 0.3 } },
  { id: "hold_runners", label: "Hold runners / pickoffs", helpText: "Vary times, hold the bag, take the running game away.", weightHints: { pitching_hold_runners: 0.9 } },
];

const PITCHING_SOFTBALL: ReadonlyArray<SubGoal> = [
  // Same as baseball MINUS hold_runners (no pickoffs in fastpitch).
  { id: "command", label: "Command / zone %", helpText: "Hit your spots — strike one, edges, no give-up pitches.", weightHints: { pitching_command: 0.9 } },
  { id: "velocity", label: "Add velocity", helpText: "Climb the fastball — measured, replay-safe, never overthrown.", weightHints: { pitching_velocity: 0.7, strength_rotational: 0.3 } },
  { id: "secondary_pitch", label: "Develop a secondary pitch", helpText: "Build a true second weapon (drop, rise, change, screw).", weightHints: { pitching_secondary: 0.9 } },
  { id: "pitch_mix", label: "Sequencing / pitch mix", helpText: "Use what you have on purpose — set up the put-away.", weightHints: { pitching_mix: 0.9 } },
  { id: "stamina", label: "Stamina / pitch count", helpText: "Hold velo and command deeper into the circle.", weightHints: { pitching_stamina: 0.7, speed_conditioning: 0.3 } },
];

/** Categories a discipline pane offers. */
export const CATEGORIES_FOR: Record<Discipline, ReadonlyArray<CategoryKey>> = {
  position: ["speed", "power", "throwing", "hitting", "fielding"],
  pitcher: ["speed", "power", "hitting", "pitching"],
  // Pitchers can still hit (DH/two-way variants), and they always train speed/power.
  // Position players never see Pitching, pitchers never see position-player Throwing.
};

export function subGoalsFor(
  sport: Sport,
  discipline: Discipline,
  category: CategoryKey,
): ReadonlyArray<SubGoal> {
  if (category === "speed") return SPEED;
  if (category === "hitting") return HITTING;
  if (category === "fielding") return FIELDING;
  if (category === "throwing") {
    if (discipline === "pitcher") return []; // pitcher pane never shows position throwing
    return THROWING_POSITION;
  }
  if (category === "power") {
    return discipline === "pitcher" ? POWER_PITCHER : POWER_POSITION;
  }
  if (category === "pitching") {
    if (discipline !== "pitcher") return [];
    return sport === "softball" ? PITCHING_SOFTBALL : PITCHING_BASEBALL;
  }
  return [];
}

/** Look up a single sub-goal by (sport, discipline, category, id). */
export function findSubGoal(
  sport: Sport,
  discipline: Discipline,
  category: CategoryKey,
  id: string,
): SubGoal | null {
  return subGoalsFor(sport, discipline, category).find((g) => g.id === id) ?? null;
}

/** All legal sub-goal ids for a given (sport, discipline, category) cell — used by normalizer. */
export function legalSubGoalIds(
  sport: Sport,
  discipline: Discipline,
  category: CategoryKey,
): ReadonlySet<string> {
  return new Set(subGoalsFor(sport, discipline, category).map((g) => g.id));
}
