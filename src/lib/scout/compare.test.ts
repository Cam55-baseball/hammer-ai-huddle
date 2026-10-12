import { describe, it, expect } from "vitest";
import { toColumn, scoutFairnessWarnings } from "./compare";

const prof = (o: any = {}, tests: any[] = [], shared = { profile: true, metrics: true, video: false, academics: false }) =>
  ({ shared, overview: o, academics: null, tests, recap: null, grades: [], reports: null, players_club: null }) as any;

describe("scout compare", () => {
  it("hides tests when stats are not shared", () => {
    const c = toColumn("a", prof({ full_name: "A" }, [{ test_date: "2026-10-01", test_type: "x", results: { s: 1 } }], { profile: true, metrics: false, video: false, academics: false }));
    expect(c.latestTest).toBeNull();
    expect(c.reportCount).toBeNull();
  });
  it("picks the newest test and reads verification", () => {
    const c = toColumn("a", prof({ full_name: "A" }, [
      { test_date: "2026-09-01", test_type: "old", results: {} },
      { test_date: "2026-10-01", test_type: "sixty_yard", results: { time: 7.1, _verified: "in_person" } },
    ]));
    expect(c.latestTest).toMatchObject({ type: "sixty yard", date: "2026-10-01", verified: true, values: "time: 7.1" });
  });
  it("warns on position, level, grad-year gap of 2+, mixed verification and thin data", () => {
    const a = toColumn("a", prof({ full_name: "A", primary_position: "SS", level: "College", grad_year: 2026 }, [{ test_date: "2026-10-01", test_type: "t", results: { _verified: "in_person" } }]));
    const b = toColumn("b", prof({ full_name: "B", primary_position: "P", level: "High School", grad_year: 2028 }, [{ test_date: "2026-10-01", test_type: "t", results: {} }, { test_date: "2026-09-01", test_type: "t", results: {} }]));
    const w = scoutFairnessWarnings([a, b]);
    expect(w).toHaveLength(5);
    expect(w[2]).toContain("2 years apart");
    expect(w[4]).toContain("A has fewer than 2");
  });
  it("no warnings for a matched pair", () => {
    const t = [{ test_date: "2026-10-01", test_type: "t", results: {} }, { test_date: "2026-09-01", test_type: "t", results: {} }];
    const a = toColumn("a", prof({ full_name: "A", primary_position: "SS", level: "College", grad_year: 2026 }, t));
    const b = toColumn("b", prof({ full_name: "B", primary_position: "ss", level: "college", grad_year: 2027 }, t));
    expect(scoutFairnessWarnings([a, b])).toEqual([]);
  });
});
