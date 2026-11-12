// Owner-approved Nov 12 (build 13 fix 1): the exact moment a locked Early 6-Week Recap opens, so the
// button can show the date in the player's own time zone. Same block math as earlyRecapEligibility.
import { currentBlock, EARLY_RECAP } from "./rules.ts";

const DAY = 86400000;

/** ISO time the current block's early recap opens, or null when it is already open / there is no start. */
export function recapOpensAt(anchor: Date | null, now: Date): string | null {
  if (!anchor) return null;
  const b = currentBlock(anchor, now);
  if (b.dayInBlock >= EARLY_RECAP.minDays) return null;
  return new Date(b.start.getTime() + EARLY_RECAP.minDays * DAY).toISOString();
}
