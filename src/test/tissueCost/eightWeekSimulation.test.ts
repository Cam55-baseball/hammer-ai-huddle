// Eight-week rule simulation (owner ruling 2026-10-06: every rule holds, every
// day, for every player — whether or not anything is checked off).
//
// Each simulated day the "planner" asks for the hardest lift and four lift
// movements drawn from the real movement library (including ones the athlete
// is too young for or that are illegal in season). The real rest-day decision
// and the real final rule check run on it; what survives is the saved plan.
// Every rule is then re-checked on the saved plans and violations counted.
import { describe, expect, it } from "vitest";
import { decide, TCS_CONFIG } from "./harness.ts";
import { finalRuleCheck, type CatalogFacts } from "../../../supabase/functions/_shared/wic/schedule/finalCheck.ts";
import type { DaySchedule, Phase, Profile, SessionClass } from "../../../supabase/functions/_shared/wic/schedule/tissueCost/types.ts";
import catalogRows from "../fixtures/wkCatalogRules.json";

const CATALOG = new Map<string, CatalogFacts>((catalogRows as any[]).map((c) => [c.slug, c]));
const SLUGS = [...CATALOG.keys()].sort();

const START = "2026-01-05"; // Monday
const DAYS = 56;
const add = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const dayNum = (iso: string) => Math.floor(Date.parse(`${iso}T00:00:00Z`) / 86_400_000);
const monday = (iso: string) => dayNum(iso) - ((new Date(`${iso}T12:00:00Z`).getUTCDay() + 6) % 7);

function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

type Role = "pitcher" | "position" | "two_way";
type Behaviour = "all" | "none" | "mix";

interface Scenario {
  phase: Phase; games: boolean; age: number; role: Role; sport: "baseball" | "softball"; behaviour: Behaviour;
}

const scenarios: Scenario[] = [];
for (const phase of ["in_season", "offseason", "post_season"] as Phase[])
  for (const games of [true, false])
    for (const age of [15, 19])
      for (const role of ["pitcher", "position", "two_way"] as Role[])
        for (const sport of ["baseball", "softball"] as const)
          for (const behaviour of ["all", "none", "mix"] as Behaviour[])
            scenarios.push({ phase, games, age, role, sport, behaviour });

const violations: Record<string, number> = {
  lift_spacing: 0, offseason_heavy_spacing: 0, weekly_lift_max: 0, doubleheader_no_lift: 0,
  pitcher_start_day_no_lift: 0, pitcher_day_before_start_primer_only: 0, min_age: 0,
  eccentric_in_season: 0, season_legality: 0, recovery_day_counted_as_lift: 0,
};
const swapsByRule: Record<string, number> = {};
let liftDays = 0;
let planDays = 0;

function simulate(sc: Scenario, seed: number) {
  const r = rng(seed);
  const pitcher = sc.role !== "position";
  const profile: Profile = {
    age: sc.age, growthMode: sc.age <= 15, trainingAgeBand: "advanced",
    sport: sc.sport, position: pitcher ? "starting_pitcher" : "position",
    phase: sc.phase, isStartingPitcher: pitcher,
  };
  // Season calendar (known in advance, like the real calendar).
  const cal = new Map<string, DaySchedule>();
  for (let i = 0; i < DAYS + 2; i++) {
    const date = add(START, i);
    const d: DaySchedule = { date };
    if (sc.games && sc.phase !== "offseason") {
      if (i % 7 === 5) d.games = { role: pitcher ? "starting_pitcher" : "position", count: 2, doubleheader: true };
      else if (i % 3 === 0) d.games = { role: "position", count: 1 };
      if (pitcher && i % 5 === 2) { d.pitcherStartDay = true; d.games = d.games ?? { role: "starting_pitcher", count: 1 }; }
    }
    cal.set(date, d);
  }
  const history: DaySchedule[] = [];
  const saved: { date: string; liftClass: SessionClass | null; slugs: string[] }[] = [];

  for (let i = 0; i < DAYS; i++) {
    const today = add(START, i);
    const calendar = [...cal.values()].filter((d) => d.date >= today && d.date <= add(today, 10));
    const dec = decide(profile, history, calendar, [], TCS_CONFIG, today, "UTC");
    const allowed = dec.allowedClass;
    planDays++;
    // Planner offers a full lift plus recovery rows every day.
    const offered = [
      { slot: "lift", sequence_role: "arm_care", movement_slug: null as string | null },
      { slot: "lift", sequence_role: "mobility", movement_slug: null as string | null },
      ...Array.from({ length: 4 }, () => ({
        slot: "lift", sequence_role: "compound_lower", movement_slug: SLUGS[Math.floor(r() * SLUGS.length)],
      })),
    ];
    const priorLiftDates = saved.filter((s) => s.liftClass).map((s) => s.date);
    const checked = finalRuleCheck(offered, {
      planDate: today, phase: sc.phase, age: sc.age, priorLiftDates,
      restDaysBetweenLifts: 2, weeklyLiftMax: sc.phase === "in_season" ? 2 : null,
      liftRemoved: allowed === "none", catalog: CATALOG,
    });
    for (const s of checked.swaps) swapsByRule[s.rule] = (swapsByRule[s.rule] ?? 0) + 1;
    const loaded = checked.rows.filter((x) => x.sequence_role === "compound_lower");
    const liftClass: SessionClass | null = loaded.length > 0 && allowed !== "none" ? allowed : null;
    if (loaded.length > 0 && allowed === "none") violations.recovery_day_counted_as_lift++;
    saved.push({ date: today, liftClass, slugs: loaded.map((x) => x.movement_slug!) });
    if (liftClass) liftDays++;

    // What the athlete does with it.
    const done = sc.behaviour === "all" || (sc.behaviour === "mix" && r() < 0.5);
    const day: DaySchedule = { ...(cal.get(today) ?? { date: today }) };
    if (liftClass) day.lift = { class: liftClass, method: "standard", skipped: !done, confirmed: done };
    history.push(day);
  }

  // ---- re-check every rule on the saved plans
  const lifts = saved.filter((s) => s.liftClass);
  for (let k = 1; k < lifts.length; k++) {
    const rest = dayNum(lifts[k].date) - dayNum(lifts[k - 1].date) - 1;
    if (rest < 2) violations.lift_spacing++;
    if (sc.phase === "offseason") {
      const a = lifts[k - 1].liftClass!, b = lifts[k].liftClass!;
      const need = a === "H" ? (b === "L" ? 2 : 3) : a === "M" && b === "H" ? 3 : 2;
      if (rest < need) violations.offseason_heavy_spacing++;
    }
  }
  if (sc.phase === "in_season") {
    const perWeek = new Map<number, number>();
    for (const l of lifts) perWeek.set(monday(l.date), (perWeek.get(monday(l.date)) ?? 0) + 1);
    for (const n of perWeek.values()) if (n > 2) violations.weekly_lift_max++;
  }
  for (const l of lifts) {
    const d = cal.get(l.date);
    if (d?.games?.doubleheader) violations.doubleheader_no_lift++;
    if (pitcher && d?.pitcherStartDay) violations.pitcher_start_day_no_lift++;
    if (pitcher && cal.get(add(l.date, 1))?.pitcherStartDay) violations.pitcher_day_before_start_primer_only++;
    for (const slug of l.slugs) {
      const f = CATALOG.get(slug)!;
      if (f.min_age_years != null && sc.age < f.min_age_years) violations.min_age++;
      if (f.eccentric_overload && (sc.phase === "in_season" || sc.phase === "post_season")) violations.eccentric_in_season++;
      if ((f.season_legality as any)?.[sc.phase] === false) violations.season_legality++;
    }
  }
}

describe("eight-week rule simulation", () => {
  it(`runs ${scenarios.length} players x ${DAYS} days with zero rule violations`, () => {
    scenarios.forEach((sc, i) => simulate(sc, 1000 + i));
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ scenarios: scenarios.length, planDays, liftDays, violations, swapsByRule }, null, 2));
    for (const [rule, n] of Object.entries(violations)) expect(n, rule).toBe(0);
    expect(liftDays).toBeGreaterThan(0);
  }, 120_000);
});
