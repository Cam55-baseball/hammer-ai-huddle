import { describe, it, expect } from "vitest";
import {
  armLedgerView,
  enterableTypes,
  prescribedThrows,
  throwRoleFrom,
  type ArmEntry,
  type PitchLog,
} from "../armLedgerEntry";
import { armBudget } from "../../../../supabase/functions/_shared/wic/phases/armLedger";

const D = "2026-09-25";
const view = (role: ReturnType<typeof throwRoleFrom>, p: unknown, s: unknown, entries: ArmEntry[], pitches: PitchLog[] = [], sport: "baseball" | "softball" = "baseball") =>
  armLedgerView({ sport, role, age: 16 }, D, prescribedThrows(role, p, s), entries, pitches);

describe("Step 30 E — every thrower logs into ONE arm ledger", () => {
  it("roles resolve like the nightly job", () => {
    expect(throwRoleFrom("SS", null)).toBe("position");
    expect(throwRoleFrom("C", null)).toBe("catcher");
    expect(throwRoleFrom("P", null)).toBe("pitcher");
    expect(throwRoleFrom("P", "CF")).toBe("two_way");
    expect(throwRoleFrom("P", "C")).toBe("pitcher_catcher");
  });

  it("position player: every position throw type is enterable; logging moves the budget", () => {
    const types = enterableTypes("position", "position");
    for (const t of ["catch_play", "position_throws", "infield_quick_release", "infield_short_hops", "outfield_crow_hop", "long_toss"]) expect(types).toContain(t);
    expect(enterableTypes("position", "pitching")).toEqual([]);
    const before = view("position", "SS", null, []);
    // Missing entries count as done at the prescribed number.
    expect(before.usedToday).toBeGreaterThan(0);
    const after = view("position", "SS", null, [{ entry_date: D, throw_type: "infield_quick_release", count: 30, status: "done" }]);
    expect(after.usedToday).toBe(before.usedToday + 15); // 15 more high-intent throws
    const skipped = view("position", "SS", null, [{ entry_date: D, throw_type: "infield_quick_release", count: 0, status: "skipped" }]);
    expect(skipped.usedToday).toBe(before.usedToday - 15);
    expect(after.line).toMatch(/arm units/);
  });

  it("pitcher: warm-up and catch play are ADDED to pitch counts, never instead of them", () => {
    expect(enterableTypes("pitcher", "pitching")).toEqual(["pitcher_warmup", "pitcher_catch_play"]);
    expect(enterableTypes("pitcher", "position")).toEqual([]);
    const pitches = [{ plan_date: D, pitches: 60 }];
    const noWarm = view("pitcher", "P", null, [], pitches);
    const warm = view("pitcher", "P", null, [{ entry_date: D, throw_type: "pitcher_warmup", count: 40, status: "done" }], pitches);
    expect(noWarm.usedToday).toBe(60);   // budget counted in pitches
    expect(warm.usedToday).toBe(60);     // pitch count untouched by warm-ups
    expect(warm.throwsToday).toBe(noWarm.throwsToday + 15); // but the ledger holds the extra warm-up throws
    expect(warm.today.pitches).toBe(60);
  });

  it("catcher: throw-downs enterable, count as high intent, catcher budget", () => {
    expect(enterableTypes("catcher", "position")).toContain("catcher_throwdowns");
    expect(enterableTypes("position", "position")).not.toContain("catcher_throwdowns");
    const base = view("catcher", "C", null, []);
    const more = view("catcher", "C", null, [{ entry_date: D, throw_type: "catcher_throwdowns", count: 18, status: "done" }]);
    expect(more.usedToday).toBe(base.usedToday + 10);
    expect(base.budget.daily).toBe(armBudget({ sport: "baseball", role: "position", age: 16 }).daily + 15);
  });

  it("two-way: both cards feed one ledger; the stricter budget wins", () => {
    expect(enterableTypes("two_way", "position").length).toBeGreaterThan(0);
    expect(enterableTypes("two_way", "pitching").length).toBe(2);
    const b = armBudget({ sport: "baseball", role: "two_way", age: 16 });
    const pos = armBudget({ sport: "baseball", role: "position", age: 16 });
    const pit = armBudget({ sport: "baseball", role: "pitcher", age: 16 });
    expect(b.daily).toBe(Math.min(pos.daily, pit.daily));
    const entries: ArmEntry[] = [
      { entry_date: D, throw_type: "outfield_crow_hop", count: 12, status: "done" },
      { entry_date: D, throw_type: "pitcher_warmup", count: 25, status: "done" },
    ];
    const v0 = view("two_way", "P", "CF", entries);
    const v1 = view("two_way", "P", "CF", entries, [{ plan_date: D, pitches: 40 }]);
    expect(v1.usedToday).toBe(v0.usedToday + 40); // pitches add into the same tank
    expect(v1.budget.daily).toBe(b.daily);
  });

  it("weekly budget accumulates logged past days", () => {
    const past: ArmEntry[] = [{ entry_date: "2026-09-23", throw_type: "long_toss", count: 40, status: "done" }];
    const v = view("position", "CF", null, past);
    expect(v.usedWeek).toBe(v.usedToday + 20);
  });

  it("softball position player and windmill pitcher use the same entry and ledger", () => {
    const v = view("pitcher", "P", null, [{ entry_date: D, throw_type: "pitcher_catch_play", count: 20, status: "done" }], [{ plan_date: D, pitches: 90 }], "softball");
    expect(v.usedToday).toBe(90);
    expect(v.budget.daily).toBe(140);
  });
});
