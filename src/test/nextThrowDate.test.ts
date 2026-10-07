import { describe, it, expect } from "vitest";
import { nextThrowDate, nextPickoffDate, equivalentsByDay } from "../../supabase/functions/_shared/wic/phases/nextThrowDate";

const T = "2026-10-07";
describe("Round 9 — next throwing / pick-off dates from the owner's throw table", () => {
  it("warm-ups count 0.25, pitches 1.0", () => {
    const m = equivalentsByDay([
      { entry_date: T, source: "pitching", throw_type: "pitcher_warmup", count: 40, status: "done" },
      { entry_date: T, source: "pitching", throw_type: "bullpen", count: 30, status: "done" },
    ]);
    expect(m.get(T)).toBe(40);
  });
  it("16-year-old: 40 equivalents today → 1 rest day (Pitch Smart 15–16)", () => {
    const rows = [{ entry_date: T, source: "pitching", throw_type: "bullpen", count: 30 }, { entry_date: T, source: "pitching", throw_type: "pitcher_warmup", count: 40 }];
    expect(nextThrowDate(16, null, rows, T)).toBe("2026-10-09");
  });
  it("catch play alone stays light: 60 catch play = 15 → throw tomorrow", () => {
    expect(nextThrowDate(16, null, [{ entry_date: T, source: "position", throw_type: "catch_play", count: 60 }], T)).toBe("2026-10-08");
  });
  it("no-throw pick-off work counts 0; skipped rows ignored", () => {
    expect(nextThrowDate(16, null, [
      { entry_date: T, throw_type: "pickoff_no_throw", count: 200 },
      { entry_date: T, source: "pitching", throw_type: "bullpen", count: 90, status: "skipped" },
    ], T)).toBe("2026-10-08");
  });
  it("pro / over 22 → no date; pick-off only baseball pitchers", () => {
    expect(nextThrowDate(25, null, [], T)).toBeNull();
    expect(nextPickoffDate("softball", true, "2026-10-08")).toBeNull();
    expect(nextPickoffDate("baseball", false, "2026-10-08")).toBeNull();
    expect(nextPickoffDate("baseball", true, "2026-10-08")).toBe("2026-10-08");
  });
});
