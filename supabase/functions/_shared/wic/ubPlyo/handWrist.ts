/**
 * Hand and Wrist Chain safety rules (Hammers v1.2 §C3). Pure code — not wired
 * into generation. All UBP v1 §2–§5 rules apply on top of these.
 */

import type { Role, UbHistory, UbProfile } from "./rules.ts";
import {
  HAND_CHAIN_FLOOR_MIN_AGE,
  HAND_CHAIN_MAX_CONTACTS_PER_SESSION,
  HAND_CHAIN_WALL_MIN_AGE,
  HAND_CHAIN_WEEKS_PER_LEVEL_MIN,
  type HandChainMovement,
} from "./v11Movements.ts";

export const EXPOSURE_CHANNEL = "UB_PLYO";
/** §C3 — hand-chain contacts load the Arm tank. */
export const HAND_CHAIN_TANK = "arm";

export interface HandChainContext {
  /** Whole weeks the athlete has spent at this level. */
  weeksAtLevel: number;
  /** Contacts already planned in today's session. */
  contactsPlannedToday: number;
  /** Pitchers: today is a start day. */
  isStartDay?: boolean;
  /** Pitchers: tomorrow is a start day. */
  isDayBeforeStart?: boolean;
}

export interface HandChainDecision {
  allowed: boolean;
  blockedBy: string | null;
  maxContacts: number;
  /** Athlete-facing cue only; the staff cue never reaches the athlete. */
  athleteCue: string;
}

const FLOORISH = new Set(["kneeling", "floor"]);
const INTERMEDIATE_PLUS = new Set(["intermediate", "advanced", "elite", "professional"]);
const PITCHERS: Role[] = ["starting_pitcher", "reliever"];

export function isFloorVersion(m: HandChainMovement): boolean {
  return FLOORISH.has(m.surface);
}

export function resolveHandChain(
  m: HandChainMovement,
  p: UbProfile,
  h: UbHistory,
  ctx: HandChainContext,
): HandChainDecision {
  const base = { maxContacts: 0, athleteCue: m.cue };
  const deny = (blockedBy: string): HandChainDecision => ({ ...base, allowed: false, blockedBy });

  if (h.painFlag) return deny("pain_rules");
  if (p.ageYears < HAND_CHAIN_WALL_MIN_AGE) return deny("min_age");

  if (isFloorVersion(m)) {
    if (p.ageYears < HAND_CHAIN_FLOOR_MIN_AGE) return deny("floor_version_min_age");
    if (!INTERMEDIATE_PLUS.has(p.trainingAge)) return deny("floor_version_training_age");
  }

  if (m.levelIndex > 0 && ctx.weeksAtLevel < HAND_CHAIN_WEEKS_PER_LEVEL_MIN) {
    return deny("weeks_at_level");
  }

  if (
    m.maxFingertipLoading &&
    PITCHERS.includes(p.role) &&
    (ctx.isStartDay || ctx.isDayBeforeStart)
  ) {
    return deny("pitcher_start_window");
  }

  const remaining = HAND_CHAIN_MAX_CONTACTS_PER_SESSION - Math.max(0, ctx.contactsPlannedToday);
  if (remaining <= 0) return deny("session_contact_cap");

  return { allowed: true, blockedBy: null, maxContacts: remaining, athleteCue: m.cue };
}

/** Contacts a hand-chain block adds to the UB_PLYO channel and the Arm tank. */
export function handChainExposure(entries: { contacts: number }[]) {
  const contacts = entries.reduce((sum, e) => sum + Math.max(0, e.contacts), 0);
  return {
    channel: EXPOSURE_CHANNEL,
    tank: HAND_CHAIN_TANK,
    contacts,
    overCap: contacts > HAND_CHAIN_MAX_CONTACTS_PER_SESSION,
  };
}
