/**
 * Throwing Volume Ladder — prescribes an exact throw count and max intent
 * percentage for today so the arm is conditioned progressively toward the
 * elite target instead of thrown into max effort cold.
 *
 * Pure, replay-safe. Missingness-permissive: unknown position → position
 * player ladder; unknown ramp day → week 1.
 *
 * The ladder is (rung × quarter) aware:
 *   - Foundation athletes are capped low regardless of quarter.
 *   - Peak/Sustain athletes in mid-season quarters unlock long-toss and
 *     higher counts.
 */
import type { RoadmapRung } from "./roadmapLadder";
import type { QuarterDescriptor } from "./seasonQuarters";

export interface ThrowingLadderPrescription {
  readonly throwsToday: number;
  readonly maxIntentPercent: number;   // 0..100
  readonly longTossUnlocked: boolean;
  readonly headline: string;           // one-line UI string
  readonly rationale: string;
}

interface LadderRow {
  readonly baseThrows: number;
  readonly maxIntent: number;
  readonly longTossUnlocked: boolean;
}

const PITCHER_LADDER: Record<RoadmapRung, LadderRow> = {
  foundation: { baseThrows: 25, maxIntent: 60, longTossUnlocked: false },
  build:      { baseThrows: 35, maxIntent: 70, longTossUnlocked: false },
  bridge:     { baseThrows: 45, maxIntent: 80, longTossUnlocked: true  },
  peak:       { baseThrows: 60, maxIntent: 90, longTossUnlocked: true  },
  sustain:    { baseThrows: 55, maxIntent: 85, longTossUnlocked: true  },
};

const POSITION_LADDER: Record<RoadmapRung, LadderRow> = {
  foundation: { baseThrows: 20, maxIntent: 60, longTossUnlocked: false },
  build:      { baseThrows: 30, maxIntent: 70, longTossUnlocked: false },
  bridge:     { baseThrows: 40, maxIntent: 80, longTossUnlocked: true  },
  peak:       { baseThrows: 50, maxIntent: 90, longTossUnlocked: true  },
  sustain:    { baseThrows: 45, maxIntent: 85, longTossUnlocked: true  },
};

function isPitcher(position: string | null): boolean {
  if (!position) return false;
  const p = position.toLowerCase();
  return p === "p" || p === "sp" || p === "rp" || p.includes("pitch");
}

export function prescribeThrowingLadder(
  rung: RoadmapRung,
  quarter: QuarterDescriptor,
  position: string | null,
): ThrowingLadderPrescription {
  const row = isPitcher(position) ? PITCHER_LADDER[rung] : POSITION_LADDER[rung];
  const throwsToday = Math.max(10, Math.round(row.baseThrows * quarter.volumeCeilingMultiplier));
  const maxIntent = Math.max(50, Math.min(100, Math.round(row.maxIntent * (0.9 + 0.1 * quarter.volumeCeilingMultiplier))));
  const longTossUnlocked = row.longTossUnlocked && quarter.volumeCeilingMultiplier >= 0.8;
  const headline =
    `Throw ${throwsToday} today · ${maxIntent}% intent` +
    (longTossUnlocked ? " · long-toss unlocked" : " · long-toss locked");
  const rationale =
    `Ladder tuned to your ${labelRung(rung)} rung and ${quarter.accent} quarter. ` +
    (longTossUnlocked
      ? `Long-toss is unlocked — earn it with a clean pre-throw checklist.`
      : `Long-toss is still locked — it unlocks at Bridge or higher during a full-volume quarter.`);
  return { throwsToday, maxIntentPercent: maxIntent, longTossUnlocked, headline, rationale };
}

function labelRung(r: RoadmapRung): string {
  return r.charAt(0).toUpperCase() + r.slice(1);
}
