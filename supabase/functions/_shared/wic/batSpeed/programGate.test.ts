import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { batSpeedProgramGate, batSpeedProgramOf } from "./programGate.ts";

const base = { season: "off_season", isStartDay: false, startedYesterday: false, startsTomorrow: false, batSpeedDaysThisWeek: 0 };

Deno.test("program mapping", () => {
  assertEquals(batSpeedProgramOf(["baseball_pitching"]), "velocity");
  assertEquals(batSpeedProgramOf(["baseball_golden2way"]), "hitter");
  assertEquals(batSpeedProgramOf(["baseball_pitching", "baseball_hitting"]), "hitter");
  assertEquals(batSpeedProgramOf(["baseball_5tool"]), "hitter");
  assertEquals(batSpeedProgramOf(["baseball_throwing"]), "unchanged");
});
Deno.test("golden 2way never limited", () => {
  const r = batSpeedProgramGate({ ...base, modules: ["baseball_golden2way"], isStartDay: true, batSpeedDaysThisWeek: 5 });
  assertEquals([r.allow, r.lightOnly], [true, false]);
});
Deno.test("complete pitcher weekly caps", () => {
  const m = ["baseball_pitching"];
  assertEquals(batSpeedProgramGate({ ...base, modules: m, batSpeedDaysThisWeek: 1 }).allow, true);
  assertEquals(batSpeedProgramGate({ ...base, modules: m, batSpeedDaysThisWeek: 2 }).allow, false);
  assertEquals(batSpeedProgramGate({ ...base, modules: m, season: "preseason", batSpeedDaysThisWeek: 1 }).allow, false);
  const ins = batSpeedProgramGate({ ...base, modules: m, season: "in_season" });
  assertEquals([ins.allow, ins.lightOnly], [true, true]);
});
Deno.test("complete pitcher start-day spacing", () => {
  const m = ["baseball_pitching"];
  for (const k of ["isStartDay", "startedYesterday", "startsTomorrow"]) {
    assertEquals(batSpeedProgramGate({ ...base, modules: m, [k]: true } as any).allow, false);
  }
});
Deno.test("planner phase names", () => {
  const m = ["baseball_pitching"];
  assertEquals(batSpeedProgramGate({ ...base, modules: m, season: "regular_season" }).lightOnly, true);
  assertEquals(batSpeedProgramGate({ ...base, modules: m, season: "tournament" }).lightOnly, true);
  assertEquals(batSpeedProgramGate({ ...base, modules: m, season: "offseason_q2", batSpeedDaysThisWeek: 1 }).allow, true);
  assertEquals(batSpeedProgramGate({ ...base, modules: m, season: "preseason" }).lightOnly, false);
});
