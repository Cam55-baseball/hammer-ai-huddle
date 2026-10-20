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
    const s = categorySignalEvidence([{ module: "hitting", created_at: daysAgo(3), violations: {} }], null, NOW);
    expect(s[0]).toMatchObject({ category: "hitting", source: "video", direction: "looks-good" });
  });

  it("stale or wrong-module clips emit nothing", () => {
    expect(categorySignalEvidence([{ module: "hitting", created_at: daysAgo(30), violations: { x: 1 } }], null, NOW)).toEqual([]);
    expect(categorySignalEvidence([{ module: "pitching", created_at: daysAgo(2), violations: { x: 1 } }], null, NOW)).toEqual([]);
    expect(categorySignalEvidence([{ module: null, created_at: daysAgo(2), violations: { x: 1 } }], null, NOW)).toEqual([]);
  });

  it("games reuse the existing whiff/chase thresholds", () => {
    const bad = categorySignalEvidence([], { whiffPct: 31, chasePct: 10, miscueClusters: [] }, NOW);
    expect(bad[0]).toMatchObject({ category: "hitting", source: "games", direction: "needs-work" });
    const clean = categorySignalEvidence([], { whiffPct: 12, chasePct: 20, miscueClusters: [] }, NOW);
    expect(clean[0]).toMatchObject({ category: "hitting", source: "games", direction: "looks-good" });
    expect(GAME_WHIFF_NEEDS_WORK).toBe(30);
    expect(GAME_CHASE_NEEDS_WORK).toBe(35);
  });

  it("no game sample means no game signal", () => {
    expect(categorySignalEvidence([], { whiffPct: null, chasePct: null, miscueClusters: [] }, NOW)).toEqual([]);
    expect(categorySignalEvidence([], null, NOW)).toEqual([]);
  });

  it("miscue clusters are a fielding needs-work game signal", () => {
    const s = categorySignalEvidence([], { whiffPct: null, chasePct: null, miscueClusters: [{ position: "SS", errors: 3 }] }, NOW);
    expect(s[0]).toMatchObject({ category: "fielding", source: "games", direction: "needs-work" });
  });

  it("video findings plus clean games produce a mixed cross-reference", () => {
    const s = categorySignalEvidence(
      [{ module: "hitting", created_at: daysAgo(2), violations: { late: true } }],
      { whiffPct: 10, chasePct: 15, miscueClusters: [] },
      NOW,
    );
    const xr = crossReference("hitting", s);
    expect(xr.kind).toBe("mixed");
    if (xr.kind === "mixed") expect(xr.because).toContain("Mixed signals");
  });

  it("agreeing sources never produce a mixed line", () => {
    const s = categorySignalEvidence(
      [{ module: "hitting", created_at: daysAgo(2), violations: { late: true } }],
      { whiffPct: 40, chasePct: 10, miscueClusters: [] },
      NOW,
    );
    expect(crossReference("hitting", s).kind).toBe("agree");
  });

  it("one category's signals never leak into another", () => {
    const s = categorySignalEvidence(
      [{ module: "fielding", created_at: daysAgo(2), violations: { x: 1 } }],
      { whiffPct: 10, chasePct: 15, miscueClusters: [] },
      NOW,
    );
    expect(crossReference("hitting", s).kind).toBe("none");
  });
});
