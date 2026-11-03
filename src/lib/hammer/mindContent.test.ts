import { describe, it, expect } from "vitest";
import { pickAdvice, pickSituation, builtinAdvice, BUILTIN_SITUATION, type MindContentRow } from "./mindContent";
import { pickTodaysTip, SEASONAL_TIPS } from "@/lib/hpi/seasonalTips";

const row = (o: Partial<MindContentRow>): MindContentRow => ({ kind: "advice", builtin_key: null, title: "T", body: "B", category: "mind",
  season_phases: ["in_season"], situation_type: null, sports: [], positions: [], levels: [], programs: [], active: true, created_at: "2026-11-03", ...o });
const days = Array.from({ length: 30 }, (_, i) => new Date(Date.UTC(2026, 10, 1 + i, 12)));
const ss = { sport: "softball", position: "Shortstop", level: "High School", modules: ["softball_5tool"] };
const bb = { sport: "baseball", position: "C", level: "college", modules: ["baseball_pitcher"] };

describe("Coach's advice", () => {
  it("with no owner rows matches the old pick-by-season rule on every day and season", () => {
    for (const phase of Object.keys(SEASONAL_TIPS) as (keyof typeof SEASONAL_TIPS)[])
      for (const d of days) { const t = pickAdvice([], phase, bb, d); const old = pickTodaysTip(phase, d); expect([t.title, t.category]).toEqual([old.title, old.category]); }
  });
  it("tagged created advice appears for a matching player and never for a non-matching one", () => {
    const tagged = row({ title: "SS softball tip", sports: ["softball"], positions: ["SS"], levels: ["high school"], programs: ["5tool"] });
    expect(days.some((d) => pickAdvice([tagged], "in_season", ss, d).title === "SS softball tip")).toBe(true);
    expect(days.some((d) => pickAdvice([tagged], "in_season", bb, d).title === "SS softball tip")).toBe(false);
    expect(days.some((d) => pickAdvice([tagged], "off_season", ss, d).title === "SS softball tip")).toBe(false);
  });
  it("untagged created advice shows to everyone in its season", () => {
    const open = row({ title: "Everyone tip" });
    expect(days.some((d) => pickAdvice([open], "in_season", bb, d).title === "Everyone tip")).toBe(true);
  });
  it("editing a built-in changes it; other built-ins stay intact", () => {
    const edit = row({ builtin_key: "in_season:0", title: "Guard the Shen (edited)", category: "mind" });
    const seen = new Set(days.map((d) => pickAdvice([edit], "in_season", bb, d).title));
    expect(seen.has("Guard the Shen (edited)")).toBe(true);
    expect(seen.has("Guard the Shen")).toBe(false);
    expect(seen.has("Hydrate ahead of thirst")).toBe(true);
    expect(builtinAdvice()).toHaveLength(Object.values(SEASONAL_TIPS).flat().length);
  });
});

describe("Game situations (Mind)", () => {
  it("with no owner rows stays the built-in situation", () => {
    expect(pickSituation([], bb).title).toBe(BUILTIN_SITUATION.title);
  });
  it("created tagged situation appears for a matching player and not for a non-matching one", () => {
    const s = row({ kind: "situation", title: "Bunt defense, runner on 1st", season_phases: [], sports: ["softball"], positions: ["IF"] });
    expect(days.some((d) => pickSituation([s], ss, d).title === s.title)).toBe(true);
    expect(days.every((d) => pickSituation([s], bb, d).title === BUILTIN_SITUATION.title)).toBe(true);
  });
  it("editing the built-in changes what players see", () => {
    const e = row({ kind: "situation", builtin_key: "situations:default", title: "Edited situations", season_phases: [] });
    expect(pickSituation([e], bb).title).toBe("Edited situations");
  });
});
