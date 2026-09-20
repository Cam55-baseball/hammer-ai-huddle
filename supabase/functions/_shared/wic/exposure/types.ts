/**
 * Step 14 — Exposure Ledger & Spike Governor (TI-1 / TI-2, §5 of
 * docs/wic/training-intelligence-v1.md).
 *
 * Pure types. Channels are NEVER added together into one number (§5.1).
 */

export const EXPOSURE_VERSION = "exposure_ledger_v1";
export const GOVERNOR_VERSION = "exposure_governor_v1";

export const CHANNELS = [
  "LIFT",
  "JUMP",
  "UB_PLYO",
  "SPRINT",
  "THROW",
  "SWING",
  "SPORT",
] as const;
export type Channel = (typeof CHANNELS)[number];

/** Tiers per channel. "all" is the channel-level roll-up row. */
export const TIERS: Record<Channel, readonly string[]> = {
  LIFT: ["main", "other"],
  JUMP: ["T1", "T2", "T3"],
  UB_PLYO: ["U1", "U2", "U3"],
  SPRINT: ["max_velocity", "resisted"],
  THROW: ["high", "moderate", "low"],
  SWING: ["high"],
  SPORT: ["practice", "game", "catcher_innings"],
};

/** Lowest-cost tier in each channel — the cold-start floor tier. */
export const LOWEST_TIER: Record<Channel, string> = {
  LIFT: "other",
  JUMP: "T3",
  UB_PLYO: "U1",
  SPRINT: "resisted",
  THROW: "low",
  SWING: "high",
  SPORT: "practice",
};

/** Ordered heaviest → lightest, for deterministic tier step-downs. */
export const TIER_ORDER: Record<Channel, readonly string[]> = {
  LIFT: ["main", "other"],
  JUMP: ["T1", "T2", "T3"],
  UB_PLYO: ["U3", "U2", "U1"],
  SPRINT: ["max_velocity", "resisted"],
  THROW: ["high", "moderate", "low"],
  SWING: ["high"],
  SPORT: ["game", "practice", "catcher_innings"],
};

/** Units, for the plain-English reason sentences. */
export const CHANNEL_UNIT: Record<Channel, string> = {
  LIFT: "hard sets",
  JUMP: "contacts",
  UB_PLYO: "contacts",
  SPRINT: "yards",
  THROW: "throws",
  SWING: "swings",
  SPORT: "load",
};

export const CHANNEL_LABEL: Record<Channel, string> = {
  LIFT: "Lifting",
  JUMP: "Jumps",
  UB_PLYO: "Upper-body plyos",
  SPRINT: "Sprints",
  THROW: "Throwing",
  SWING: "Swings",
  SPORT: "Practice and games",
};

/** One measured contribution to a channel on a given day. */
export interface ExposureEntry {
  channel: Channel;
  tier: string;
  amount: number;
  source: string;
}

/** A day's exposure, per channel and tier. Never summed across channels. */
export interface ExposureDay {
  date: string;
  entries: ExposureEntry[];
}

/** Largest single-day total in the last 28 days, per channel and per tier. */
export interface Rm28 {
  /** channel → largest single-day channel total */
  byChannel: Record<string, number>;
  /** `${channel}:${tier}` → largest single-day tier total */
  byTier: Record<string, number>;
  /** channel → the date that set the channel maximum */
  onDate: Record<string, string | null>;
  daysObserved: number;
}

/** A single prescribed row the governor may trim. Hammers' own work only. */
export interface GovItem {
  slug: string;
  name: string;
  channel: Channel;
  tier: string;
  /** Sets the row currently prescribes. */
  sets: number;
  /** Exposure amount produced by ONE set of this row. */
  amountPerSet: number;
  /** Lowest number of sets the envelope allows before the row is dropped. */
  floorSets: number;
  substitutionFamily: string | null;
  /** Team practice / games are never trimmed. */
  isTeamLoad?: boolean;
}

/** A lighter sibling the governor may step down to, same substitution family. */
export interface GovAlternative {
  slug: string;
  name: string;
  channel: Channel;
  tier: string;
  amountPerSet: number;
  floorSets: number;
  substitutionFamily: string | null;
}

export type TrimAction = "sets_removed" | "tier_step_down" | "row_dropped" | "blocked";

export interface Trim {
  slug: string;
  channel: Channel;
  action: TrimAction;
  from: { slug: string; tier: string; sets: number; amount: number };
  to: { slug: string; tier: string; sets: number; amount: number } | null;
  reason: string;
}
