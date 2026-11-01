import { describe, it, expect } from "vitest";
import { startReturn, advanceReturn, returnWeekGreen, applyReturnStep, weeksPerStep, FIRST_BULLPEN_MAX, type ReturnProgram } from "../../supabase/functions/_shared/wic/pitching/pitcherReturn";

const base = (o: Partial<ReturnProgram> = {}): ReturnProgram => ({ sport: "baseball", started_on: "2026-10-05", days_off: 20, long_layoff: false, step: "flat", step_started_on: "2026-10-05", prescribed_dates: [], first_bullpen_on: null, completed_on: null, source: "history", ...o });
const pitch = (name: string, count: number, moundType?: string) => ({ name, dosage: "", armEvent: { kind: "pitch", count, intent: "moderate" }, ...(moundType ? { pitchTags: { moundType } } : {}) });

describe("pitcher return start (owner round 6)", () => {
  it("starts after 14+ days off from real history; 30+ days = 2 weeks per step", () => {
    expect(startReturn({ today: "2026-11-02", sport: "baseball", lastPitchDate: "2026-10-22", answer: null, latest: null })).toBeNull(); // 11 days
    const a = startReturn({ today: "2026-11-02", sport: "baseball", lastPitchDate: "2026-10-19", answer: null, latest: null })!;
    expect([a.step, a.days_off, weeksPerStep(a)]).toEqual(["flat", 14, 1]);
    const b = startReturn({ today: "2026-11-02", sport: "softball", lastPitchDate: "2026-10-01", answer: null, latest: null })!;
    expect([b.days_off, weeksPerStep(b)]).toEqual([32, 2]);
  });
  it("uses the starting answer only with no history; never twice for one layoff", () => {
    expect(startReturn({ today: "2026-11-02", sport: "baseball", lastPitchDate: null, answer: "14+", latest: null })?.source).toBe("answer");
    expect(startReturn({ today: "2026-11-02", sport: "baseball", lastPitchDate: null, answer: "4–7", latest: null })).toBeNull();
    expect(startReturn({ today: "2026-11-02", sport: "baseball", lastPitchDate: "2026-10-01", answer: null, latest: { started_on: "2026-10-20", completed_on: "2026-11-01" } })).toBeNull();
    expect(startReturn({ today: "2026-11-02", sport: "baseball", lastPitchDate: "2026-10-01", answer: null, latest: { started_on: "2026-10-20", completed_on: null } })).toBeNull();
  });
});

describe("moving on by green weeks", () => {
  const always = () => true, never = () => false, noPen = () => null;
  it("needs at least one full week in the step, then a green week", () => {
    // started Wed Oct 7 → first full week Oct 12–18
    const p = base({ step_started_on: "2026-10-07" });
    expect(advanceReturn(p, "2026-10-16", always, noPen).step).toBe("flat");
    expect(advanceReturn(p, "2026-10-19", always, noPen).step).toBe("shortbox");
    expect(advanceReturn(p, "2026-10-19", never, noPen).step).toBe("flat");
  });
  it("30+ days off needs two full weeks per step", () => {
    const p = base({ long_layoff: true, step_started_on: "2026-10-05" });
    expect(advanceReturn(p, "2026-10-12", always, noPen).step).toBe("flat");
    expect(advanceReturn(p, "2026-10-19", always, noPen).step).toBe("shortbox");
  });
  it("one step at a time, and the program ends after the first bullpen is logged", () => {
    expect(advanceReturn(base({ step: "shortbox", step_started_on: "2026-10-05" }), "2026-10-26", always, noPen).step).toBe("bullpen");
    const pen = base({ step: "bullpen", step_started_on: "2026-10-26" });
    expect(advanceReturn(pen, "2026-10-28", always, noPen).step).toBe("bullpen");
    const done = advanceReturn(pen, "2026-10-29", always, () => "2026-10-28");
    expect([done.step, done.first_bullpen_on, done.completed_on]).toEqual(["done", "2026-10-28", "2026-10-29"]);
  });
  it("green week = 85% of prescribed pitching days done + 5 GOOD days, no LOW, no pain", () => {
    const due = ["2026-10-12", "2026-10-14", "2026-10-16"];
    const good = (n: number, extra: any[] = []) => [...Array.from({ length: n }, (_, i) => ({ date: `2026-10-${12 + i}`, readiness: 0.75, pain: false })), ...extra];
    expect(returnWeekGreen("2026-10-12", due, new Set(due), good(5), 0.6)).toBe(true);
    expect(returnWeekGreen("2026-10-12", due, new Set(due.slice(0, 2)), good(5), 0.6)).toBe(false); // 67%
    expect(returnWeekGreen("2026-10-12", due, new Set(due), good(4), 0.6)).toBe(false);
    expect(returnWeekGreen("2026-10-12", due, new Set(due), good(5, [{ date: "2026-10-18", readiness: 0.25, pain: false }]), 0.6)).toBe(false);
    expect(returnWeekGreen("2026-10-12", due, new Set(due), good(5, [{ date: "2026-10-18", readiness: 0.75, pain: true }]), 0.6)).toBe(false);
    expect(returnWeekGreen("2026-10-12", due, new Set(due), good(5), null)).toBe(false); // check off → hold
  });
});

describe("reshaping the pitching card", () => {
  const day = [pitch("Bullpen", 40, "full_bullpen"), pitch("Light mound catch", 15, "light_mound"), { name: "Long toss", dosage: "", armEvent: { kind: "throw", count: 30 } }];
  it("flat step: no mound work, same or fewer pitches", () => {
    const r = applyReturnStep(day as any[], base(), "baseball");
    expect(r.drills.filter((d: any) => d.armEvent?.kind === "pitch").every((d: any) => d.pitchTags.moundType === "flat_ground")).toBe(true);
    expect(r.drills.map((d: any) => d.armEvent.count)).toEqual([40, 15, 30]);
    expect(r.because[0]).toContain("flat ground");
  });
  it("shortbox step: 2/3 distance (40 ft baseball, 29 ft softball), light", () => {
    expect(applyReturnStep(day as any[], base({ step: "shortbox" }), "baseball").drills[0].name).toBe("Shortbox (40 ft)");
    const sb = applyReturnStep([pitch("Circle session", 30)] as any[], base({ step: "shortbox", sport: "softball" }), "softball");
    expect(sb.drills[0].name).toBe("Shortbox (29 ft)");
    expect(sb.because[0]).not.toMatch(/mound/);
  });
  it("first bullpen is short (≤25) and only one mound session that day", () => {
    const r = applyReturnStep(day as any[], base({ step: "bullpen" }), "baseball");
    const mound = r.drills.filter((d: any) => d.armEvent?.kind === "pitch");
    expect(mound).toHaveLength(1);
    expect(mound[0].armEvent.count).toBe(FIRST_BULLPEN_MAX);
    expect(applyReturnStep([pitch("Bullpen", 18, "full_bullpen")] as any[], base({ step: "bullpen" }), "baseball").drills[0].armEvent!.count).toBe(18); // never raised
  });
  it("no program / finished program changes nothing", () => {
    expect(applyReturnStep(day as any[], null, "baseball").drills).toBe(day);
    expect(applyReturnStep(day as any[], base({ step: "done" }), "baseball").drills).toBe(day);
  });
});
