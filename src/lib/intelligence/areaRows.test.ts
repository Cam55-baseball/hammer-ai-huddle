import { describe, it, expect } from "vitest";
import { buildAreaRows } from "./areaRows";

describe("performance area rows", () => {
  it("only shows areas the player has, with trend from the last two scores", () => {
    const rows = buildAreaRows([
      { module: "hitting", efficiency_score: 60, created_at: "2026-10-01" },
      { module: "hitting", efficiency_score: 70, created_at: "2026-10-10" },
    ]);
    expect(rows).toEqual([{ area: "Hitting", latest: 70, previous: 60, trend: "up", count: 2 }]);
  });
  it("gives no trend with one score", () => {
    expect(buildAreaRows([{ module: "pitching", efficiency_score: 55, created_at: "2026-10-01" }])[0].trend).toBeNull();
  });
});
