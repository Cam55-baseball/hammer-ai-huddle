/**
 * Fault Ledger — proof, not description.
 *
 * The cross-discipline rule says the same underlying pattern seen in two
 * different parts of the game is ONE problem, told once and ranked higher —
 * not two small problems competing for attention. These tests make that real.
 */
import { describe, expect, it } from "vitest";
import { rankFaults, type FaultSignal } from "@/lib/wic/faultLedger/ranking";
import { FAULT_FAMILIES } from "@/lib/wic/faultLedger/families";

const NOW = Date.parse("2026-09-06T00:00:00.000Z");

function signal(over: Partial<FaultSignal>): FaultSignal {
  return {
    id: over.id ?? "s1",
    user_id: "u1",
    source: "video_analysis",
    fault_key: "poor_hip_shoulder_separation",
    root_pattern_id: "poor_hip_shoulder_separation",
    discipline: "hitting",
    confidence: 0.8,
    sample_size: 4,
    severity: 0.6,
    evidence: "Your hips and chest turn together.",
    observed_at: "2026-09-05T00:00:00.000Z",
    ...over,
  };
}

describe("root-pattern collapse", () => {
  const hitting = signal({ id: "a", discipline: "hitting", source: "video_analysis" });
  const throwing = signal({ id: "b", discipline: "throwing", source: "report_card" });

  it("collapses two disciplines into one ranked entry", () => {
    const ranked = rankFaults([hitting, throwing], NOW);
    expect(ranked).toHaveLength(1);
    expect(ranked[0].rootPatternId).toBe("poor_hip_shoulder_separation");
    expect(ranked[0].disciplines.sort()).toEqual(["hitting", "throwing"]);
    expect(ranked[0].sources.sort()).toEqual(["report_card", "video_analysis"]);
    expect(ranked[0].signals).toHaveLength(2);
  });

  it("scores the collapsed pair above either signal alone", () => {
    const both = rankFaults([hitting, throwing], NOW)[0].score;
    const onlyHitting = rankFaults([hitting], NOW)[0].score;
    const onlyThrowing = rankFaults([throwing], NOW)[0].score;
    expect(both).toBeGreaterThan(onlyHitting);
    expect(both).toBeGreaterThan(onlyThrowing);
    // Agreement across sources and disciplines, not just addition.
    expect(both).toBeGreaterThan(onlyHitting + onlyThrowing);
  });

  it("says it once, and says where", () => {
    const [top] = rankFaults([hitting, throwing], NOW);
    expect(top.says).toContain("hitting");
    expect(top.says).toContain("throwing");
    expect(top.totalSampleSize).toBe(8);
  });

  it("routes the collapsed pattern to its fault family", () => {
    expect(rankFaults([hitting, throwing], NOW)[0].family?.id).toBe("rotational_output");
  });

  it("keeps genuinely different patterns apart", () => {
    const other = signal({ id: "c", root_pattern_id: "weak_grip", discipline: "lifting" });
    expect(rankFaults([hitting, other], NOW)).toHaveLength(2);
  });

  it("never treats one observation as a trend", () => {
    const once = signal({ id: "d", sample_size: 1 });
    const many = signal({ id: "e", sample_size: 10, root_pattern_id: "weak_grip" });
    const ranked = rankFaults([once, many], NOW);
    expect(ranked[0].rootPatternId).toBe("weak_grip");
  });
});

describe("cold start", () => {
  it("an empty ledger ranks nothing and invents nothing", () => {
    expect(rankFaults([], NOW)).toEqual([]);
  });
});

describe("family ladders", () => {
  it("every family has a rung that needs no equipment at all", () => {
    for (const f of FAULT_FAMILIES) {
      expect(f.ladder.some((r) => r.tier === 0)).toBe(true);
    }
  });
});
