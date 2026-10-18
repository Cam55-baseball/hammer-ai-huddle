// How-sure levels for every Hammers Card (owner decision: Measured / Pattern / Hunch / Need more data).
export type HowSure = "measured" | "pattern" | "hunch" | "need_more_data";

export const HOW_SURE_LABEL: Record<HowSure, string> = {
  measured: "Measured",
  pattern: "Pattern",
  hunch: "Hunch",
  need_more_data: "Need more data",
};

export const HOW_SURE_DOTS: Record<HowSure, number> = {
  measured: 3,
  pattern: 2,
  hunch: 1,
  need_more_data: 0,
};

/** Below this many data points a card must say "early read". */
export const EARLY_READ_MAX = 4;

export interface Evidence {
  /** Number of real data points behind the claim. */
  samples: number;
  /** The value itself was directly recorded (a test, a logged number). */
  directlyRecorded?: boolean;
  /** The same thing kept showing up together across samples. */
  repeatsTogether?: boolean;
}

/**
 * Pick the honest level. Never upgrades thin data: zero samples is always
 * "Need more data"; cause-like claims without a recorded value top out at Pattern.
 */
export function howSureFor(e: Evidence): HowSure {
  if (!Number.isFinite(e.samples) || e.samples <= 0) return "need_more_data";
  if (e.directlyRecorded) return "measured";
  if (e.repeatsTogether && e.samples >= 3) return "pattern";
  return "hunch";
}

export function isEarlyRead(samples: number): boolean {
  return samples > 0 && samples <= EARLY_READ_MAX;
}
