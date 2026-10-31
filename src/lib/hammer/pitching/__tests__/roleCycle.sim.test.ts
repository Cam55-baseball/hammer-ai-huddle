import { describe, it, expect } from "vitest";
import { cycleDay, moundWork, weekViolations, liftRule, reliefSets, sprintDose, minorityCap, shortboxFeet, dayLabel, type PitchRole, type Sport, type CycleDay } from "../../../../../supabase/functions/_shared/wic/pitching/roleCycle";
import { finalArmGuard } from "../../prescription/finalArmGuard";

const iso = (base: string, n: number) => new Date(Date.parse(`${base}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
const START = "2026-11-02"; // Monday

function simulate(sport: Sport, role: PitchRole) {
  const outings: string[] = [], starts: string[] = [], games: string[] = [];
  for (let d = 0; d < 56; d++) {
    const dow = (d + 1) % 7;
    if (role === "starter" && d % 7 === 4) starts.push(iso(START, d)); // Fri starts
    if (dow === 2 || dow === 5 || dow === 6) games.push(iso(START, d));
  }
  // Relievers: pitch Fri + Sat (back-to-back) each week.
  if (role !== "starter") for (let w = 0; w < 8; w++) outings.push(iso(START, w * 7 + 4), iso(START, w * 7 + 5));
  const days: { date: string; day: CycleDay }[] = [];
  for (let d = 0; d < 56; d++) {
    const date = iso(START, d);
    if (role === "starter" && starts.includes(date) && date < iso(START, 56)) outings.push(date);
    days.push({ date, day: cycleDay({ sport, role, date, outingDates: outings, plannedStarts: starts, gameDates: games }) });
  }
  return days;
}

const cases: [Sport, PitchRole][] = [["baseball", "starter"], ["baseball", "bullpen"], ["baseball", "closer"], ["softball", "starter"], ["softball", "bullpen"], ["softball", "closer"]];

describe("owner Oct 31 role cycle — 8-week simulations", () => {
  for (const [sport, role] of cases) it(`${sport} ${role}: cycle, mound minimum, zero violations`, () => {
    const days = simulate(sport, role);
    for (let w = 0; w < 8; w++) {
      const week = days.slice(w * 7, w * 7 + 7);
      expect(weekViolations(sport, role, week)).toEqual([]);
      expect(week.filter(d => moundWork(sport, d.day)).length).toBeGreaterThanOrEqual(3);
      expect(week.some(d => d.day === "shortbox")).toBe(true);
    }
    const sample = days.slice(7, 14).map(d => `${d.date}: ${dayLabel(sport, d.day)}`);
    if (sport === "softball") expect(sample.join(" ")).not.toMatch(/mound|bullpen/i);
    console.log(`${sport} ${role}\n` + sample.join("\n"));
  });

  it("starter: day after = light catch + med-ball, second day after = rest, then long toss", () => {
    const days = simulate("baseball", "starter");
    const i = days.findIndex(d => d.day === "start");
    expect(days.slice(i, i + 4).map(d => d.day)).toEqual(["start", "day_after", "rest", "long_toss"]);
    expect(days[i - 1].day).toBe("pre_start");
    expect(liftRule("starter", "long_toss", "rest").heavy).toBe(true);
    expect(liftRule("starter", "pre_start", "shortbox").noLowerBody).toBe(true);
  });

  it("reliever: 2nd recovery day after back-to-back outings", () => {
    const days = simulate("baseball", "bullpen");
    const i = days.findIndex(d => d.day === "outing");
    expect(days.slice(i, i + 4).map(d => d.day)).toEqual(["outing", "outing", "day_after", "day_after"]);
  });

  it("shortbox is 2/3 distance in both sports", () => {
    expect(shortboxFeet("baseball")).toBe(40);
    expect(shortboxFeet("softball")).toBe(29);
  });

  it("relievers keep weight and lose sets; starters unchanged", () => {
    expect(reliefSets(4, "starter")).toBe(4);
    expect(reliefSets(4, "bullpen")).toBe(3);
    expect(reliefSets(3, "closer")).toBe(2);
    expect(liftRule("closer", "light_mound", null).loadChange).toBe(false);
  });

  it("conditioning stays sprint-based; starters build max sprints over 8 weeks", () => {
    const reps = Array.from({ length: 8 }, (_, w) => sprintDose("starter", w).reps);
    expect(reps[7]).toBeGreaterThan(reps[0]);
    expect(sprintDose("closer", 5).kind).toBe("repeat_sprint");
  });

  it("two-way split ≈70/30 inside one budget, warm-ups first", () => {
    expect(minorityCap(100, "pitcher")).toEqual({ pitching: 100, position: 30 });
    const row = (name: string, count: number, armCard: string, stage = "full_go") => ({ name, stage, armCard, armEvent: { kind: "practice" as const, count, intent: "moderate" as const, estimated: false } });
    const blocks = [
      { status: "ready", modality: "warmup", drills: [row("Warm-up throws", 10, "throwing", "prep")] },
      { status: "ready", modality: "pitching", drills: [row("Bullpen", 20, "pitching")] },
      { status: "ready", modality: "defense", drills: [row("Position throws A", 10, "throwing"), row("Position throws B", 10, "throwing")] },
    ];
    const out = finalArmGuard(blocks as any, { sport: "baseball", role: "two_way", age: 17, date: "2026-11-05", history: { rows: [] }, primaryFocus: "pitcher" });
    expect(out[0].drills).toHaveLength(1);
    expect(out[1].drills).toHaveLength(1);
    const posKept = out[2].drills.length;
    const total = 20 + posKept * 10;
    expect(posKept * 10 / total).toBeLessThanOrEqual(0.34);
  });
});
