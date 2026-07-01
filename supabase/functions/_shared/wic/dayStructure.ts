// WIC canonical day structure. The order below is constitutional — it is
// how the daily plan is rendered and how the validator enforces flow.

import type { WicEngine } from "./constitution.ts";

export const NORMAL_DAY_ORDER: WicEngine[] = [
  "movement_prep",
  "warmup",
  "sprint",
  "bat_speed",
  "power",
  "strength",
  // practice/competition inserted here by the client
  "conditioning",
  "recovery",
  "mobility",
  "arm_care",
  "cross_sport", // offseason only — enforced by seasonal legality
];

export const GAME_DAY_ORDER: WicEngine[] = [
  "movement_prep",
  "cross_sport", // short neural primer
  "sprint",     // prep only
  "bat_speed",  // prep only
  // pregame practice + competition rendered by client
  "recovery",
];

// Engines suppressed on game day — regular lifts and conditioning belong
// nowhere near a competition window.
export const GAME_DAY_SUPPRESSED: WicEngine[] = [
  "strength",
  "power",
  "conditioning",
  "mobility",
  "arm_care",
];

// Sequence value used by the client when rendering cards; lower = earlier.
export function engineSequence(engine: WicEngine, isGameDay: boolean): number {
  const order = isGameDay ? GAME_DAY_ORDER : NORMAL_DAY_ORDER;
  const i = order.indexOf(engine);
  return i === -1 ? 999 : i;
}
