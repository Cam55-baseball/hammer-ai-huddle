/**
 * Step 21A + 21D — card clarity.
 *
 * A. "Do this after your skill work" belongs to the lift card only.
 * D2. No block numbers reach the athlete.
 * D3. No heading is rendered with no content.
 * D4. "Why reduced today" is for real trims only.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { athleteSessionTitle } from "@/components/hammer/WkProgressionNote";
import { isDayStatementNotAReduction } from "@/components/hammer/WkPrescriptionCard";

const read = (p: string) => readFileSync(p, "utf8");

describe("A — the timing note belongs to the lift only", () => {
  it("is rendered by the lift card", () => {
    expect(read("src/components/hammer/WkLiftsCard.tsx")).toContain("liftTimingNote");
  });

  it("is not rendered by the day header, training-load banner, skill, speed, arm-care or recovery cards", () => {
    const others = [
      "src/components/hammer/WkRestDayBanner.tsx",
      "src/components/hammer/WkSpeedCard.tsx",
      "src/components/hammer/WkBatSpeedCard.tsx",
      "src/components/hammer/WkConditioningCard.tsx",
      "src/components/hammer/HammerDailyPlan.tsx",
    ];
    for (const f of others) {
      expect(read(f)).not.toMatch(/\btiming_note\b/);
    }
  });
});

describe("D2 — no block numbers on athlete cards", () => {
  it("strips the block number and keeps athlete words", () => {
    expect(athleteSessionTitle("Block 36 · Week 2 · add work — Maximum Bat Speed")).toBe(
      "Add work · Week 2 — Maximum Bat Speed",
    );
    expect(athleteSessionTitle("Block 1 · Week 1 · build the base — Full Body")).toBe(
      "Build the base · Week 1 — Full Body",
    );
  });

  it("returns nothing for an empty title rather than an empty heading", () => {
    expect(athleteSessionTitle("")).toBeNull();
    expect(athleteSessionTitle(null)).toBeNull();
    expect(athleteSessionTitle("   ")).toBeNull();
  });

  it("never renders a Block N badge on a movement card", () => {
    expect(read("src/components/hammer/WkProgressionNote.tsx")).not.toContain("Block {");
  });
});

describe("D4 — why reduced today is for real trims only", () => {
  it("treats day-level scheduling statements as not a reduction", () => {
    expect(isDayStatementNotAReduction("You're rested — heavy day is on.")).toBe(true);
    expect(isDayStatementNotAReduction("Next heavy day: Monday.")).toBe(true);
    expect(isDayStatementNotAReduction("Standard spacing today.")).toBe(true);
    expect(isDayStatementNotAReduction("")).toBe(true);
    expect(isDayStatementNotAReduction(null)).toBe(true);
  });

  it("keeps genuine trims", () => {
    expect(isDayStatementNotAReduction("Only 5h sleep — high-CNS work reduced.")).toBe(false);
    expect(isDayStatementNotAReduction("2 lifts already this week — today stays lighter.")).toBe(false);
    expect(
      isDayStatementNotAReduction("Load has been piling up — we dropped the level instead of skipping the day."),
    ).toBe(false);
  });

  it("only files tissue-cost reasons as reductions when the day was actually reduced", () => {
    const gen = read("supabase/functions/wk-generate-daily/index.ts");
    expect(gen).toContain("const tcsActuallyReduced = tcsAdjust.removeLift === true || tcsAdjust.allowedClass !== \"H\"");
  });
});
