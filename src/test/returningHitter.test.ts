import { describe, it, expect } from "vitest";
import { startHitterReturn, advanceHitter, hittingWeek, needsBridge, applyHitterReturn, pitchSourceOf, type HitterProgram } from "../../supabase/functions/_shared/wic/hitting/returningHitter";

const start = (o: any = {}) => startHitterReturn({ today: "2026-11-02", sport: "baseball", age: 16, injuryActive: false, liveRecently: "No", lastTrained: "Right now", lastHitDate: null, hadHittingBefore: false, latest: null, ...o });
const prog = (o: Partial<HitterProgram> = {}): HitterProgram => ({ sport: "baseball", started_on: "2026-10-05", reason: "no_live", environment: "normal", effort: "low", bridge: false, last_change_on: "2026-10-05", prescribed: {}, completed_on: null, ...o });
const rows = [{ name: "Live BP or machine", dosage: "3 x 10 swings" }, { name: "Tee work — inside pitch", dosage: "2 x 10 swings" }, { name: "Band series", dosage: "2 x 10" }];

describe("who is a returning hitter", () => {
  it("no recent live/machine or a layoff → normal environment, low effort", () => {
    const a = start()!;
    expect([a.environment, a.effort, a.reason]).toEqual(["normal", "low", "no_live"]);
    expect(start({ liveRecently: "Yes", lastTrained: "3–6 weeks ago" })?.reason).toBe("layoff");
    expect(start({ liveRecently: "Yes" })).toBeNull();
  });
  it("injury or under 13 → tee / front toss first", () => {
    expect(start({ injuryActive: true })?.environment).toBe("low_impact");
    expect(start({ age: 12 })?.environment).toBe("low_impact");
    expect(start({ age: 13 })?.environment).toBe("normal");
  });
  it("logged hitting gap of 14+ days starts it; under 14 does not", () => {
    expect(start({ liveRecently: "Yes", hadHittingBefore: true, lastHitDate: "2026-10-19" })?.reason).toBe("layoff");
    expect(start({ liveRecently: "Yes", hadHittingBefore: true, lastHitDate: "2026-10-25" })).toBeNull();
  });
});

describe("plan rows", () => {
  it("normal environment keeps live/machine, adds the prescribed effort, same dose", () => {
    const r = applyHitterReturn(rows as any[], prog(), new Set(["tee"]));
    expect(r.rows[0].name).toBe("Live BP or machine");
    expect(r.rows[0].dosage).toBe("3 x 10 swings · Low effort");
    expect((r.rows[0] as any).swingEffort).toBe("low");
    expect(r.rows[2]).toBe(rows[2]); // non-swing row untouched
  });
  it("low-impact start or bridge swaps live/machine for tee (front toss with no tee)", () => {
    expect(applyHitterReturn(rows as any[], prog({ environment: "low_impact" }), new Set(["tee"])).rows[0].name).toBe("Tee work (bridge)");
    expect(applyHitterReturn(rows as any[], prog({ bridge: true }), new Set()).rows[0].name).toBe("Front toss (bridge)");
  });
  it("pitch source: owner tag wins, built-ins by written name", () => {
    expect(pitchSourceOf({ name: "Whatever", pitch_source: "machine" })).toBe("machine");
    expect(pitchSourceOf({ name: "Front toss — away" })).toBe("front_toss");
    expect(pitchSourceOf({ name: "Full-go: machine at-bats with counts" })).toBe("machine");
    expect(pitchSourceOf({ name: "Dry swings" })).toBeNull();
  });
});

describe("effort steps by green weeks", () => {
  const g = () => "green" as const, r = () => "red" as const, h = () => "hold" as const;
  it("low → medium → full, then back to normal; red steps back; one step per week", () => {
    expect(advanceHitter(prog(), "2026-10-09", g, false).effort).toBe("low"); // no full week yet
    const m = advanceHitter(prog(), "2026-10-12", g, false); expect(m.effort).toBe("medium");
    expect(advanceHitter(m, "2026-10-14", g, false).effort).toBe("medium");
    const f = advanceHitter(m, "2026-10-19", g, false); expect(f.effort).toBe("full");
    expect(advanceHitter(f, "2026-10-26", g, false).completed_on).toBe("2026-10-26");
    expect(advanceHitter(prog({ effort: "medium" }), "2026-10-12", r, false).effort).toBe("low");
    expect(advanceHitter(prog(), "2026-10-12", h, false).effort).toBe("low");
  });
  it("low-impact / bridge go back to normal on a green week first", () => {
    const n = advanceHitter(prog({ environment: "low_impact" }), "2026-10-12", g, false);
    expect([n.environment, n.effort]).toEqual(["normal", "low"]);
    const b = advanceHitter(prog(), "2026-10-07", h, true); expect(b.bridge).toBe(true);
    expect(advanceHitter(b, "2026-10-19", g, false).bridge).toBe(false);
  });
  it("bridge triggers: effort above plan on 2+ sessions, or hitting soreness rising", () => {
    const e = (date: string, actual: any) => ({ date, prescribed: "low" as const, actual });
    expect(needsBridge([e("2026-10-20", "full")], [], "2026-10-25", "2026-10-01").on).toBe(false);
    expect(needsBridge([e("2026-10-20", "full"), e("2026-10-22", "medium")], [], "2026-10-25", "2026-10-01").on).toBe(true);
    const d = (date: string, hp: boolean) => ({ date, readiness: 0.7, pain: false, hittingPain: hp });
    expect(needsBridge([], [d("2026-10-20", true), d("2026-10-22", true)], "2026-10-25", "2026-10-01").on).toBe(true);
    expect(needsBridge([], [d("2026-10-12", true), d("2026-10-13", true), d("2026-10-20", true), d("2026-10-22", true)], "2026-10-25", "2026-10-01").on).toBe(false); // not rising
  });
  it("week colors use the owner thresholds", () => {
    const pres = { "2026-10-12": 4, "2026-10-14": 4 };
    const good = Array.from({ length: 5 }, (_, i) => ({ date: `2026-10-${12 + i}`, readiness: 0.75, pain: false, hittingPain: false }));
    expect(hittingWeek("2026-10-12", pres, { "2026-10-12": 4, "2026-10-14": 3 }, good, 0.6)).toBe("green");
    expect(hittingWeek("2026-10-12", pres, { "2026-10-12": 4 }, good, 0.6)).toBe("red"); // 50%
    expect(hittingWeek("2026-10-12", pres, { "2026-10-12": 4, "2026-10-14": 4 }, good.slice(0, 4), 0.6)).toBe("hold");
  });
});
