import { describe, it, expect } from "vitest";
import { categorySignalEvidence, GAME_WHIFF_NEEDS_WORK, GAME_CHASE_NEEDS_WORK } from "./categorySignalEvidence";
import { crossReference } from "./mixedSignals";

const NOW = new Date("2026-10-20T12:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86400 * 1000).toISOString();

describe("category signal evidence", () => {
  it("a fresh clip with findings is a needs-work video signal", () => {
    const s = categorySignalEvidence([{ module: "hitting", created_at: daysAgo(3), violations: { late: true } }], null, NOW);
    expect(s).toEqual([{ category: "hitting", source: "video", direction: "needs-work", says: "issues on your latest hitting video" }]);
  });

  it("a fresh clean clip is a looks-good video signal", () => {
    const s = categorySignalEvidence([{ module: "hitting", created_at: daysAgo(3), violations: { early_shoulder_rotation: false } }], null, NOW);
    expect(s[0]).toMatchObject({ category: "hitting", source: "video", direction: "looks-good" });
  });

  it("stale or wrong-module clips emit nothing", () => {
    expect(categorySignalEvidence([{ module: "hitting", created_at: daysAgo(30), violations: { x: 1 } }], null, NOW)).toEqual([]);
    expect(categorySignalEvidence([{ module: "pitching", created_at: daysAgo(2), violations: { x: 1 } }], null, NOW)).toEqual([]);
    expect(categorySignalEvidence([{ module: null, created_at: daysAgo(2), violations: { x: 1 } }], null, NOW)).toEqual([]);
  });

  it("games reuse the existing whiff/chase thresholds", () => {
    const bad = categorySignalEvidence([], { atBats: 6, pitchesSeen: 20, whiffPct: 31, chasePct: 10, miscueClusters: [] }, NOW);
    expect(bad[0]).toMatchObject({ category: "hitting", source: "games", direction: "needs-work" });
    const clean = categorySignalEvidence([], { atBats: 6, pitchesSeen: 20, whiffPct: 12, chasePct: 20, miscueClusters: [] }, NOW);
    expect(clean[0]).toMatchObject({ category: "hitting", source: "games", direction: "looks-good" });
    expect(GAME_WHIFF_NEEDS_WORK).toBe(30);
    expect(GAME_CHASE_NEEDS_WORK).toBe(35);
  });

  it("no game sample means no game signal", () => {
    expect(categorySignalEvidence([], { atBats: 6, pitchesSeen: 20, whiffPct: null, chasePct: null, miscueClusters: [] }, NOW)).toEqual([]);
    expect(categorySignalEvidence([], null, NOW)).toEqual([]);
  });

  it("miscue clusters are a fielding needs-work game signal", () => {
    const s = categorySignalEvidence([], { atBats: 6, pitchesSeen: 20, whiffPct: null, chasePct: null, miscueClusters: [{ position: "SS", errors: 3 }] }, NOW);
    expect(s[0]).toMatchObject({ category: "fielding", source: "games", direction: "needs-work" });
  });

  it("video findings plus clean games produce a mixed cross-reference", () => {
    const s = categorySignalEvidence(
      [{ module: "hitting", created_at: daysAgo(2), violations: { late: true } }],
      { atBats: 6, pitchesSeen: 20, whiffPct: 10, chasePct: 15, miscueClusters: [] },
      NOW,
    );
    const xr = crossReference("hitting", s);
    expect(xr.kind).toBe("mixed");
    if (xr.kind === "mixed") expect(xr.because).toContain("Mixed signals");
  });

  it("agreeing sources never produce a mixed line", () => {
    const s = categorySignalEvidence(
      [{ module: "hitting", created_at: daysAgo(2), violations: { late: true } }],
      { atBats: 6, pitchesSeen: 20, whiffPct: 40, chasePct: 10, miscueClusters: [] },
      NOW,
    );
    expect(crossReference("hitting", s).kind).toBe("agree");
  });

  it("one category's signals never leak into another", () => {
    const s = categorySignalEvidence(
      [{ module: "fielding", created_at: daysAgo(2), violations: { x: true } }],
      { atBats: 6, pitchesSeen: 20, whiffPct: 10, chasePct: 15, miscueClusters: [] },
      NOW,
    );
    expect(crossReference("hitting", s).kind).toBe("none");
  });
  it("missing, empty or unmeasured video evidence never claims the video looked clean", () => {
    for (const violations of [null, {}, { late: null }, { late: "not measured" }]) {
      expect(categorySignalEvidence([{ module: "hitting", created_at: daysAgo(2), violations }], null, NOW)).toEqual([]);
    }
  });
  it("explicit false findings cannot be counted as problems", () => {
    const signals = categorySignalEvidence([{ module: "hitting", created_at: daysAgo(2), violations: { early_shoulder_rotation: false, hands_pass_elbow_early: false } }],
      { atBats: 6, pitchesSeen: 20, whiffPct: 40, chasePct: null, miscueClusters: [] }, NOW);
    expect(signals[0].direction).toBe('looks-good');
    expect(crossReference('hitting', signals).kind).toBe('mixed');
  });
  it("mandatory unassessed false placeholders never claim a clean hitting video", () => {
    expect(categorySignalEvidence([{ module: 'hitting', created_at: daysAgo(2), violations: {
      shoulders_not_aligned: false, back_leg_not_facing_target: false,
    } }], null, NOW)).toEqual([]);
  });
  it("future recording dates and invalid game percentages cannot fabricate a disagreement", () => {
    expect(categorySignalEvidence([{ module: "hitting", created_at: daysAgo(-1), violations: { late: true } }],
      { atBats: 6, pitchesSeen: 20, whiffPct: NaN, chasePct: 101, miscueClusters: [{ position: 'SS', errors: -1 }] }, NOW)).toEqual([]);
  });
  it("zero or missing samples never manufacture mixed signals from stored 0%", () => {
    const clip = [{ module: "hitting", created_at: daysAgo(2), violations: { late: true } }];
    for (const sample of [{}, { atBats: 0, pitchesSeen: 0 }, { atBats: 5, pitchesSeen: 19 },
      { atBats: NaN, pitchesSeen: -1 }]) {
      const signals = categorySignalEvidence(clip, { whiffPct: 0, chasePct: 0, miscueClusters: [], ...sample }, NOW);
      expect(signals.filter(signal => signal.source === "games")).toEqual([]);
      expect(crossReference("hitting", signals).kind).toBe("none");
    }
  });
  it("the existing 6-AB or 20-pitch floor admits real sampled 0% without inventing a new threshold", () => {
    for (const sample of [{ atBats: 6, pitchesSeen: 0 }, { atBats: 0, pitchesSeen: 20 }]) {
      const signals = categorySignalEvidence([{ module: "hitting", created_at: daysAgo(2), violations: { late: true } }],
        { ...sample, whiffPct: 0, chasePct: 0, miscueClusters: [] }, NOW);
      expect(signals.find(signal => signal.source === "games")?.direction).toBe("looks-good");
      expect(crossReference("hitting", signals).kind).toBe("mixed");
    }
  });

});
