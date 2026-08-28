/**
 * Combine event catalog.
 *
 * Both sports write into the same `combine_results` table — sport comes from
 * the parent `combine_sessions` row, never from the event name.
 *
 * FOUNDATION ONLY. Not wired to any live surface.
 */

export const COMBINE_EVENTS = [
  "thirty_yard_dash",
  "ten_yard_split",
  "ten_yard_dash",
  "twenty_yard_dash",
  "forty_yard_dash",
  "flying_twenty",
  "broad_jump",
  "vertical_jump_height",

  "y_balance_reach",
  "five_ten_five_shuttle",
  "reactive_agility",
  "active_rom_shoulder",
  "active_rom_elbow",
  "active_rom_hip",
  "squat_form_score",
  "bullpen_velocity",
  "exit_velocity",
  "throw_velocity",
  "pop_time",
] as const;

export type CombineEvent = (typeof COMBINE_EVENTS)[number];

/** Events that measure pitching velocity off a mound. */
export const PITCHING_VELOCITY_EVENTS: readonly CombineEvent[] = ["bullpen_velocity"];

export function isCombineEvent(value: string): value is CombineEvent {
  return (COMBINE_EVENTS as readonly string[]).includes(value);
}

export type CombineSport = "baseball" | "softball";

export type CombineSource = "video_detected" | "manual_entry";
