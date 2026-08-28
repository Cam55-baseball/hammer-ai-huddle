/**
 * Sport-specific combine event sets and their measurement metadata.
 *
 * Baseball runs a 30-yard dash with a 10-yard split. Softball runs the
 * 10/20/40-yard dashes plus the Flying 20. Everything else is shared.
 *
 * This layer only decides *which* events a sport measures — tier gating
 * (tierGating.ts) still decides which of those an athlete's tier includes,
 * and neither may be loosened by the other.
 */

import { COMBINE_EVENTS, type CombineEvent, type CombineSport } from "./events";

export interface CombineEventMeta {
  readonly event: CombineEvent;
  readonly label: string;
  readonly unit: string;
  /** Lower value is better (times), vs higher is better (jumps, velocity). */
  readonly lowerIsBetter: boolean;
  readonly hint: string;
}

const META: Record<CombineEvent, Omit<CombineEventMeta, "event">> = {
  thirty_yard_dash: { label: "30-Yard Dash", unit: "s", lowerIsBetter: true, hint: "Standing start, hand or laser timed" },
  ten_yard_split: { label: "10-Yard Split", unit: "s", lowerIsBetter: true, hint: "Split off the 30-yard run" },
  ten_yard_dash: { label: "10-Yard Dash", unit: "s", lowerIsBetter: true, hint: "Standing start" },
  twenty_yard_dash: { label: "20-Yard Dash", unit: "s", lowerIsBetter: true, hint: "Standing start" },
  forty_yard_dash: { label: "40-Yard Dash", unit: "s", lowerIsBetter: true, hint: "Standing start" },
  flying_twenty: { label: "Flying 20", unit: "s", lowerIsBetter: true, hint: "Rolling start into a timed 20 yards" },
  broad_jump: { label: "Broad Jump", unit: "in", lowerIsBetter: false, hint: "Standing, heel-to-heel measurement" },
  vertical_jump_height: { label: "Vertical Jump", unit: "in", lowerIsBetter: false, hint: "Countermovement jump" },
  y_balance_reach: { label: "Y-Balance Reach", unit: "cm", lowerIsBetter: false, hint: "Composite reach distance" },
  five_ten_five_shuttle: { label: "5-10-5 Shuttle", unit: "s", lowerIsBetter: true, hint: "Pro agility, best of the trials" },
  reactive_agility: { label: "Reactive Agility", unit: "s", lowerIsBetter: true, hint: "Cued change of direction" },
  active_rom_shoulder: { label: "Shoulder Active ROM", unit: "deg", lowerIsBetter: false, hint: "Goniometer reading" },
  active_rom_elbow: { label: "Elbow Active ROM", unit: "deg", lowerIsBetter: false, hint: "Goniometer reading" },
  active_rom_hip: { label: "Hip Active ROM", unit: "deg", lowerIsBetter: false, hint: "Goniometer reading" },
  squat_form_score: { label: "Squat Form Score", unit: "score", lowerIsBetter: false, hint: "Evaluator score, 0-10" },
  bullpen_velocity: { label: "Bullpen Velocity", unit: "mph", lowerIsBetter: false, hint: "Off a mound, best of the pen" },
  exit_velocity: { label: "Exit Velocity", unit: "mph", lowerIsBetter: false, hint: "Best batted-ball reading" },
  throw_velocity: { label: "Throw Velocity", unit: "mph", lowerIsBetter: false, hint: "Position throw, best reading" },
  pop_time: { label: "Pop Time", unit: "s", lowerIsBetter: true, hint: "Catch to glove at the bag" },
};

const BASEBALL_ONLY: readonly CombineEvent[] = ["thirty_yard_dash", "ten_yard_split"];
const SOFTBALL_ONLY: readonly CombineEvent[] = [
  "ten_yard_dash",
  "twenty_yard_dash",
  "forty_yard_dash",
  "flying_twenty",
];

/** Events a sport measures, in catalog order. */
export function combineEventsForSport(sport: CombineSport): readonly CombineEvent[] {
  const excluded = sport === "softball" ? BASEBALL_ONLY : SOFTBALL_ONLY;
  return COMBINE_EVENTS.filter((e) => !excluded.includes(e));
}

export function combineEventMeta(event: CombineEvent): CombineEventMeta {
  return { event, ...META[event] };
}
