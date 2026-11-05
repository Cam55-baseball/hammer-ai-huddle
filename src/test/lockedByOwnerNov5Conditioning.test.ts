// Locked by owner Nov 5 (round 2, Group 3): position-player conditioning = game-day readiness.
import { describe, expect, it } from "vitest";
import {
  DEFAULT_POSITION_SPRINT_STANDARDS as STD, BASE_SPRINT_OPTIONS, startingBases, sprintCapacity, sprintDay,
  sessionBases, fitRowsToBases, positionSprintStandards, type SprintRow,
} from "../../supabase/functions/_shared/wic/conditioning/positionSprints";
import { conditioningRestAfterRep } from "../../supabase/functions/_shared/wic/runRest";
import { questionsFor, answersComplete } from "../../supabase/functions/_shared/wic/progression/startingPoint";

type Sport = "baseball" | "softball";
const iso = (start: string, n: number) => new Date(Date.parse(`${start}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const dow = (d: string) => new Date(`${d}T12:00:00Z`).getUTCDay();

/** A heavy chosen session: base routes on conditioning + base-length speed sprints. */
function heavyDay(sport: Sport): SprintRow[] {
  const base = sport === "softball" ? 60 : 90;
  return [
    { slot: "conditioning", movement_slug: sport === "softball" ? "bases_double_sb" : "bases_home_2nd", sets: 8, reps: 2, distance_feet: base * 2,
      base_route: { sport, bases_per_rep: 2, base_distance_feet: base } },
    { slot: "speed", movement_slug: "max_velocity_fly", sets: 6, reps: 2, distance_feet: base },
    { slot: "warmup", movement_slug: "warmup_buildups", sets: 3, reps: 4, distance_feet: base },
  ];
}

function simulate(sport: Sport, opts: { startAnswer: string; inSeason: boolean; weeks?: number }) {
  const start = startingBases(opts.startAnswer, null, sport);
  const games = new Set<number>(opts.inSeason ? [2, 5, 6] : []); // Tue, Fri, Sat
  const days: { date: string; kind: string; target: number; bases: number; capacity: number; runRows: number }[] = [];
  let yesterday = 0;
  const first = "2026-11-09"; // Monday
  for (let n = 0; n < (opts.weeks ?? 8) * 7; n++) {
    const date = iso(first, n);
    if (dow(date) === 0) { yesterday = 0; continue; } // Sunday rest
    const capacity = sprintCapacity(start, Math.floor(n / 7), STD); // one green week each week
    const g = (d: string) => games.has(dow(d));
    const day = sprintDay(capacity, { gameToday: g(date), gameYesterday: g(iso(date, -1)) && dow(iso(date, -1)) !== 0, gameTomorrow: g(iso(date, 1)), yesterdayBases: yesterday, lowReadiness: false });
    const rows = g(date) ? [] : fitRowsToBases(heavyDay(sport), day.bases, sport);
    const bases = sessionBases(rows, sport);
    days.push({ date, kind: day.kind, target: day.bases, bases, capacity, runRows: rows.filter((r) => r.slot === "conditioning").length });
    yesterday = bases;
  }
  return days;
}

describe("locked by owner Nov 5: position-player base sprints", () => {
  it("counts bases, not yards: baseball 90 ft, softball 60 ft", () => {
    const bb: SprintRow = { slot: "speed", movement_slug: "fly", sets: 1, reps: 1, distance_feet: 90 };
    const sb: SprintRow = { slot: "speed", movement_slug: "fly", sets: 1, reps: 1, distance_feet: 60 };
    expect(sessionBases([bb], "baseball")).toBe(1);
    expect(sessionBases([sb], "softball")).toBe(1);
    expect(sessionBases([{ ...bb, distance_feet: 180, reps: 2 }], "baseball")).toBe(4);
  });

  it("warm-up sprints and easy jogs never count", () => {
    expect(sessionBases([{ slot: "warmup", movement_slug: "w", sets: 3, reps: 4, distance_feet: 90 }], "baseball")).toBe(0);
    expect(sessionBases([{ slot: "conditioning", movement_slug: "easy_base_jog_bb", sets: 2, reps: 2, distance_feet: 360 }], "baseball")).toBe(0);
  });

  it("never more than 20 base-length sprints a day", () => {
    expect(sprintCapacity(16, 40)).toBe(20);
    const fitted = fitRowsToBases(heavyDay("baseball"), sprintCapacity(16, 40), "baseball");
    expect(sessionBases(fitted, "baseball")).toBeLessThanOrEqual(20);
  });

  it("builds up 1 base sprint per green week from the starting answer", () => {
    expect(startingBases("6–10", null, "baseball")).toBe(6);
    expect(sprintCapacity(6, 0)).toBe(6);
    expect(sprintCapacity(6, 3)).toBe(9);
    expect(sprintCapacity(6, 3, { ...STD, stepPerGreenWeek: 2 })).toBe(12);
  });

  it("game day adds no conditioning; day after is recovery; day before is lighter", () => {
    const f = { gameToday: false, gameYesterday: false, gameTomorrow: false, yesterdayBases: 0, lowReadiness: false };
    expect(sprintDay(20, { ...f, gameToday: true }).bases).toBe(0);
    expect(sprintDay(20, { ...f, gameYesterday: true }).kind).toBe("post_game");
    expect(sprintDay(20, { ...f, gameTomorrow: true }).bases).toBe(10);
    expect(sprintDay(20, f).bases).toBe(20);
  });

  it("no back-to-back high-sprint days", () => {
    const d = sprintDay(20, { gameToday: false, gameYesterday: false, gameTomorrow: false, yesterdayBases: 20, lowReadiness: false });
    expect(d.kind).toBe("after_high");
    expect(d.bases).toBeLessThan(15);
  });

  it("trimming keeps every chosen row (running floor stays) and never adds work", () => {
    const rows = heavyDay("softball");
    const fitted = fitRowsToBases(rows, 0, "softball");
    expect(fitted).toHaveLength(rows.length);
    fitted.forEach((r, i) => { expect(r.sets).toBeGreaterThanOrEqual(1); expect(r.sets!).toBeLessThanOrEqual(rows[i].sets!); });
  });

  it("base-count rest rule unchanged: 30 s until 4 bases, then 5 minutes", () => {
    expect(conditioningRestAfterRep(0, 2).seconds).toBe(30);
    expect(conditioningRestAfterRep(2, 2)).toEqual({ bases: 0, reachedHome: true, seconds: 300 });
  });

  it("starting question: position players get bases, pitchers keep yards, Golden 2Way follows primary", () => {
    const ids = (p: Parameters<typeof questionsFor>[1], f?: string) => questionsFor("baseball", p, f).map((q) => q.id);
    expect(ids("5tool")).toContain("base_sprints");
    expect(ids("5tool")).not.toContain("sprint_volume");
    expect(ids("pitcher")).toContain("sprint_volume");
    expect(ids("pitcher")).not.toContain("base_sprints");
    expect(ids("golden2way", "pitcher")).toContain("sprint_volume");
    expect(ids("golden2way", "position")).toContain("base_sprints");
    expect(questionsFor("baseball", "5tool").find((q) => q.id === "base_sprints")!.options).toEqual([...BASE_SPRINT_OPTIONS]);
    expect(questionsFor("softball", "5tool").find((q) => q.id === "base_sprints")!.label).toContain("60 ft");
  });

  it("an earlier yard answer still completes the start and maps to bases", () => {
    const full = Object.fromEntries(questionsFor("baseball", "5tool").map((q) => [q.id, q.options[0]]));
    delete full.base_sprints;
    expect(answersComplete("baseball", "5tool", { ...full, sprint_volume: "200–500 yd" })).toBe(true);
    expect(startingBases(null, "200–500 yd", "baseball")).toBe(11); // 350 yd = 1050 ft ÷ 90
    expect(startingBases(null, "200–500 yd", "softball")).toBe(17); // ÷ 60
  });

  it("owner standards are editable and bounded", () => {
    expect(positionSprintStandards({ maxBasesPerDay: 18, stepPerGreenWeek: 2 }).maxBasesPerDay).toBe(18);
    expect(positionSprintStandards({ stepPerGreenWeek: 5 }).stepPerGreenWeek).toBe(1);
  });

  for (const sport of ["baseball", "softball"] as Sport[]) {
    it(`8-week ${sport} simulation, new player building up (off-season)`, () => {
      const days = simulate(sport, { startAnswer: "None", inSeason: false });
      expect(days.length).toBe(48);
      expect(days[0].capacity).toBe(2);
      expect(days[days.length - 1].capacity).toBe(9);
      for (const d of days) expect(d.bases).toBeLessThanOrEqual(Math.max(d.target, 0) + 2 * 2 + 2); // floor: ≥1 set per row
      for (let i = 1; i < days.length; i++) expect(days[i].kind === "full" && days[i - 1].kind === "full" && days[i - 1].bases >= Math.ceil(days[i - 1].capacity * 0.75) && days[i].bases >= Math.ceil(days[i].capacity * 0.75) && days[i].capacity > 4).toBe(false);
      for (const d of days) expect(d.runRows).toBe(1); // running row never removed
    });

    it(`8-week ${sport} simulation, in-season with games (no drift)`, () => {
      const days = simulate(sport, { startAnswer: "16–20+", inSeason: true });
      for (const d of days) {
        expect(d.bases).toBeLessThanOrEqual(20);
        if (dow(d.date) === 2 || dow(d.date) === 5 || dow(d.date) === 6) expect(d.kind).toBe("game");
        if (dow(d.date) === 3) expect(d.kind).toBe("post_game");
        if (dow(d.date) === 1 || dow(d.date) === 4) expect(d.kind).toBe("pre_game");
      }
      expect(Math.max(...days.map((d) => d.capacity))).toBe(20);
    });
  }
});
