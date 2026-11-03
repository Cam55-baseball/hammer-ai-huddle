import { describe, expect, it } from "vitest";
import { questionsFor, categoriesFor, programOf, startingLevels, answersComplete, historyWins, recencyFactor } from "../../../supabase/functions/_shared/wic/progression/startingPoint";
import { planStartsFrom } from "@/hooks/useStartingPoint";

const sports = ["baseball", "softball"] as const;

describe("questions: subscription-specific, no bleed-over", () => {
  for (const s of sports) {
    it(`${s}: Complete Pitcher has no hitting, defense or bunting`, () => {
      const cats = new Set(questionsFor(s, "pitcher").map((q) => q.category));
      for (const c of ["hitting", "defense", "bunting"]) expect(cats.has(c as any)).toBe(false);
      expect(cats.has("pitching")).toBe(true);
    });
    it(`${s}: 5Tool has no pitching`, () => {
      expect(questionsFor(s, "5tool").some((q) => q.category === "pitching")).toBe(false);
    });
    it(`${s}: Golden 2Way has every category`, () => {
      expect(new Set(questionsFor(s, "golden2way").map((q) => q.category)).size).toBe(9);
    });
    it(`${s}: program comes only from this sport's modules`, () => {
      const other = s === "baseball" ? "softball" : "baseball";
      expect(programOf(s, [`${other}_golden2way`])).toBeNull();
      expect(programOf(s, [`${s}_5tool`])).toBe("5tool");
    });
  }
  it("softball wording never says mound", () => {
    for (const p of ["pitcher", "golden2way"] as const)
      expect(questionsFor("softball", p).every((q) => !/mound|overhand/i.test(q.label + q.options.join(" ")))).toBe(true);
  });
  it("softball distances are softball distances", () => {
    expect(questionsFor("softball", "5tool").find((q) => q.id === "throw_distance")!.options[0]).toBe("Under 40 ft");
  });
});

const full = { last_trained: "Right now", throw_days: "3–4", throws_per_day: "50–75", throw_distance: "90–120 ft", pitch_outings: "1", pitch_last_count: "50–75", pitch_days_since: "4–7", hit_days: "3–4", swings_per_session: "50–100", live_pitching: "Yes", defense_days: "3–4", defense_reps: "25–50", defense_throw_share: "0–25%", run_days: "1–2", sprint_volume: "200–500 yd", max_sprints: "Yes", lift_days: "2", lift_history: "2+ years", jumps: "Weekly", bunt_days: "1–2" };

describe("approved starting points (owner Nov 1 round 4)", () => {
  it("recency: now / 10% / 25% / 50% / beginner", () => {
    expect(["Right now", "1–2 weeks ago", "3–6 weeks ago", "2–6 months ago", "6+ months ago", "Never"].map(recencyFactor)).toEqual([1, 0.9, 0.75, 0.5, null, null]);
  });
  it("throwing = middle of the answer × throwing days", () => {
    expect(startingLevels("baseball", "5tool", full, 300).throwsPerWeek).toBe(Math.round(62.5 * 3.5) + 16); // + 3.5 days × 37.5 reps × 12.5% defense throws
  });
  it("0 throwing days = half the low end of the position's week", () => {
    expect(startingLevels("baseball", "5tool", { ...full, throw_days: "0" }, 300).throwsPerWeek).toBe(150 + 16);
  });
  it("hitting/defense = middle of the answer, scaled by time off", () => {
    const l = startingLevels("baseball", "5tool", { ...full, last_trained: "3–6 weeks ago" }, 300);
    expect(l.swingsPerSession).toBe(Math.round(75 * 0.75));
    expect(l.defenseRepsPerSession).toBe(Math.round(37.5 * 0.75));
  });
  it("no live/machine pitching lately → tee/front toss first", () => {
    expect(startingLevels("baseball", "5tool", { ...full, live_pitching: "No" }, 300).teeFirst).toBe(true);
  });
  it("sprints: none 40, <200 → 200, 200–500 → 350, 500–1,000 → 700; no max sprints → 2 weeks build-ups", () => {
    const y = (v: string) => startingLevels("baseball", "pitcher", { ...full, sprint_volume: v }, null).sprintYards;
    expect([y("None"), y("Under 200 yd"), y("200–500 yd"), y("500–1,000 yd")]).toEqual([40, 200, 350, 700]);
    expect(startingLevels("baseball", "pitcher", { ...full, max_sprints: "No" }, null).buildUpsFirstWeeks).toBe(2);
  });
  it("lifting: 2+ years now → written; break → easing back; never/<6 months → Foundation", () => {
    expect(startingLevels("baseball", "5tool", full, null).lifting).toBe("written");
    expect(startingLevels("baseball", "5tool", { ...full, lift_days: "0" }, null).lifting).toBe("easing_back");
    expect(startingLevels("baseball", "5tool", { ...full, lift_history: "Under 6 months" }, null).lifting).toBe("foundation");
  });
  it("jumps: never → easiest", () => {
    expect(startingLevels("baseball", "5tool", { ...full, jumps: "Never" }, null).jumps).toBe("easiest");
  });
  it("pitching: 14+ days → flat ground first; else last pitch count", () => {
    expect(startingLevels("softball", "pitcher", { ...full, pitch_days_since: "14+" }, null).pitching).toEqual({ flatGroundFirst: true, lastPitchCount: null });
    expect(startingLevels("softball", "pitcher", full, null).pitching).toEqual({ flatGroundFirst: false, lastPitchCount: 62.5 });
  });
  it("bunting: 0 → 5 per side, 1–2 → 7, 3+ → identity rules", () => {
    const b = (v: string) => startingLevels("baseball", "golden2way", { ...full, bunt_days: v }, null).buntRepsPerSide;
    expect([b("0"), b("1–2"), b("3+")]).toEqual([5, 7, null]);
  });
});

describe("history wins after 2 logged weeks in 28 days", () => {
  it("rule", () => { expect(historyWins(1)).toBe(false); expect(historyWins(2)).toBe(true); });
  it("plan starts drop the answered area once history wins", () => {
    const p = planStartsFrom("baseball", ["baseball_5tool"], full, { hitting: 2, defense: 1 }, 300);
    expect(p.targets.hitting).toBeNull();
    expect(p.targets.defense).toBe(38);
    expect(p.historyAreas).toEqual(["hitting"]);
  });
  it("incomplete answers use conservative starts", () => {
    expect(answersComplete("baseball", "5tool", { last_trained: "Right now" })).toBe(false);
    expect(planStartsFrom("baseball", ["baseball_5tool"], { last_trained: "Right now" }, {}, 300).levels?.sprintYards).toBe(40);
  });
  it("every program in both sports accepts a full answer set", () => {
    for (const s of sports) for (const p of ["pitcher", "5tool", "golden2way"] as const) {
      const a = Object.fromEntries(questionsFor(s, p).map((q) => [q.id, q.options[0]]));
      expect(answersComplete(s, p, a)).toBe(true);
      expect(categoriesFor(p).length).toBeGreaterThan(0);
    }
  });
});
