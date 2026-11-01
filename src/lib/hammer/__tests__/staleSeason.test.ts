import { describe, expect, it } from "vitest";
import { staleSeasonDates } from "../../../../supabase/functions/_shared/wic/schedule/staleSeason";

describe("wrong-season future days", () => {
  const expected = (d: string) => (d >= "2026-11-21" ? "os_q1" : "in_season");
  it("rebuilds an in-season day inside an off-season week, never a logged or marked day", () => {
    const rows = [
      { plan_date: "2026-11-25", phase: "in_season", status: "planned" },
      { plan_date: "2026-11-26", phase: "in_season", status: "planned" },
      { plan_date: "2026-11-27", phase: "in_season", status: "completed" },
      { plan_date: "2026-11-28", phase: "os_q1", status: "planned" },
      { plan_date: "2026-11-01", phase: "os_q1", status: "planned" },
    ];
    expect(staleSeasonDates(rows, new Set(["2026-11-26"]), "2026-11-01", expected)).toEqual(["2026-11-25"]);
  });
});
