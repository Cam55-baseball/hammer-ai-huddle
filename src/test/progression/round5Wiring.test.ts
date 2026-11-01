import { describe, expect, it } from "vitest";
import { easeBackStartPct, sprintStartYards, capYardsTo, normReadiness } from "../../../supabase/functions/_shared/wic/progression/serverStarts";
import { startingLevels } from "../../../supabase/functions/_shared/wic/progression/startingPoint";
import { applyBuntStart } from "@/lib/hammer/prescription/greenlightPlan";

describe("owner Nov 1 round 5 — server-built lifts and sprints", () => {
  it("easing back in: ~68% weight, +5% per green week, normal at the top", () => {
    expect(easeBackStartPct(0)).toBe(68);
    expect(easeBackStartPct(1)).toBe(71);
    expect(easeBackStartPct(8)).toBe(100);
  });
  it("no sprint experience → 40 yd start; steps +5%", () => {
    expect(startingLevels("baseball", "5tool", { last_trained: "Never" }, null).sprintYards).toBe(40);
    expect(sprintStartYards(40, 0)).toBe(40);
    expect(sprintStartYards(200, 2)).toBe(221);
  });
  it("sprint yards trim whole sets, never to zero", () => {
    const rows = [{ sets: 6, reps: 1, distance_feet: 60 }, { sets: 4, reps: 1, distance_feet: 90 }];
    const out = capYardsTo(rows, 40); // 20 yd + 30 yd per set
    expect(out.map((r) => r.sets)).toEqual([2, 1]);
  });
  it("readiness normalizes 1–5 and 1–10", () => {
    expect(normReadiness(5)).toBe(1);
    expect(normReadiness(3)).toBe(0.5);
    expect(normReadiness(8)).toBe(0.8);
    expect(normReadiness(null)).toBeNull();
  });
});

describe("owner Nov 1 round 5 — starting bunts per side", () => {
  const block = (attempts: number) => ({ modality: "hitting", status: "ready", because: [], drills: [
    { name: "Sacrifice bunt", dosage: `${attempts} attempts`, stage: "drills", bunt: { side: "R", type: "sacrifice", attempts, sourceAttempts: 0, sourceSuccesses: 0 } },
    { name: "Tee work", dosage: "30 swings", stage: "drills" },
  ] }) as any;
  it("caps at 5 per side and gives the rest back to swings (no volume change)", () => {
    const out = applyBuntStart([block(12)], 5)[0];
    expect(out.drills[0].dosage).toBe("5 attempts");
    expect(out.drills[0].bunt!.attempts).toBe(5);
    expect(out.drills[1].dosage).toBe("37 swings");
  });
  it("never raises bunts and leaves cards alone without a start", () => {
    expect(applyBuntStart([block(4)], 7)[0].drills[0].dosage).toBe("4 attempts");
    expect(applyBuntStart([block(12)], null)[0].drills[0].dosage).toBe("12 attempts");
  });
});
