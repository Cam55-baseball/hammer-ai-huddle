import { describe, it, expect } from "vitest";
import { buildAreaRows } from "./areaRows";

describe("performance area rows", () => {
  it("only shows areas the player has, counting analyses", () => {
    expect(buildAreaRows([
      { module: "hitting", created_at: "2026-10-01" },
      { module: "hitting", created_at: "2026-10-10" },
    ])).toEqual([{ area: "Hitting", count: 2, lastAt: "2026-10-10" }]);
  });
  it("shows nothing when there are no analyses", () => {
    expect(buildAreaRows([])).toEqual([]);
  });
});
