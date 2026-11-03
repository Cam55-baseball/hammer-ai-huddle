import { describe, expect, it } from "vitest";
import { placeThrowsByRole, throwKind } from "./throwPlacement";

const toSteps = (d: readonly { name: string }[]) => d.map((x) => x.name);
const day = () => [
  { modality: "warmup", status: "ready", title: "Warm-up", steps: [], drills: [{ name: "Tissue prep 1" }, { name: "Warm-up throws — easy to building", cue: "Log these on your Throwing card." }] },
  { modality: "throwing", status: "ready", title: "Throwing — position work within your shared arm budget", steps: [], drills: [
    { name: "Long-toss extension (5oz)", dosage: "build to max, ~15 throws" },
    { name: "Regulation extension toss", dosage: "to 90ft x 12 throws at 75%" },
    { name: "Routine ground-ball throw", dosage: "20 throws" },
    { name: "Band series — ER / IR", dosage: "ER 1x12" },
  ] },
  { modality: "defense", status: "ready", title: "Defense — SS", steps: [], drills: [{ name: "Deep-hole throw", dosage: "5 reps" }] },
];

describe("throwing structure (owner Nov 3 round 2)", () => {
  it("position player: no Throwing card", () => {
    expect(placeThrowsByRole(day(), { pitcher: false, toSteps }).some((b) => b.modality === "throwing")).toBe(false);
  });
  it("position player: warm-up ends with throwing warm-up → catch play → long toss", () => {
    const w = placeThrowsByRole(day(), { pitcher: false, toSteps }).find((b) => b.modality === "warmup")!;
    expect(w.drills.map((d) => d.name)).toEqual(["Tissue prep 1", "Band series — ER / IR", "Warm-up throws — easy to building", "Regulation extension toss", "Long toss (inside catch play) — Long-toss extension (5oz)"]);
    expect((w.drills[2] as any).cue).toBe("Log them right here.");
  });
  it("position player: position throws only on the Defense card, with counts", () => {
    const d = placeThrowsByRole(day(), { pitcher: false, toSteps }).find((b) => b.modality === "defense")!;
    expect(d.drills.map((x) => x.name)).toEqual(["Deep-hole throw", "Routine ground-ball throw"]);
    expect((d.drills[0] as any).dosage).toBe("5 reps · 5 throws");
  });
  it("pitcher: Throwing card kept in order arm care → warm-up → catch play → long toss, no budget title", () => {
    const b = day(); b[1].drills = b[1].drills.filter((d) => !/ground-ball/.test(d.name));
    const t = placeThrowsByRole(b, { pitcher: true, toSteps }).find((x) => x.modality === "throwing")!;
    expect(t.drills.map((d) => d.name)).toEqual(["Band series — ER / IR", "Regulation extension toss", "Long-toss extension (5oz)"]);
    expect(t.title).not.toMatch(/budget|arm units/i);
  });
});

import { buildHammerDailyPlan } from "./dailyPlan";
import { NORMAL_SIGNAL } from "./scheduleContext";
import type { ContextVariable, HammerAthleteContext } from "@/lib/hammer/context/athleteContext";

function ctx(values: Record<string, unknown>): HammerAthleteContext {
  const variables = Object.entries(values).map(([key, value]): ContextVariable => ({ key, value, label: key, domain: "identity", source: "test", confidence: "high", missing: false, lastUpdated: null, lineage: { owner: "test", source: "test", rawConfidence: "high" } }));
  return { variables, missing: [], missingCount: 0, isLoading: false, envelope: null, get<T>(key: string) { return variables.find((r) => r.key === key) as ContextVariable<T> | undefined; } };
}
const gear = ["field", "glove", "ball", "bands", "partner", "mound", "circle", "catcher", "plate", "net", "bucket"];

describe("pitcher split", () => {
  it("arm care, warm-up throws, catch play and long toss move to a Throwing card before Pitching", () => {
    const blocks = [
      { modality: "warmup", status: "ready", title: "Warm-up", steps: [], drills: [{ name: "Tissue prep" }] },
      { modality: "pitching", status: "ready", title: "Pitching — side", steps: [], drills: [
        { name: "Arm-care cooldown", dosage: "2 min" }, { name: "Long-toss extension", dosage: "~15 throws" },
        { name: "Band series — ER / IR", dosage: "ER 1x12" }, { name: "Flat-ground pitching", dosage: "20 pitches", stage: "full_go" },
      ] },
    ];
    const out = placeThrowsByRole(blocks, { pitcher: true, toSteps });
    expect(out.map((b) => b.modality)).toEqual(["warmup", "throwing", "pitching"]);
    expect(out[1].drills.map((d) => d.name)).toEqual(["Arm-care cooldown", "Band series — ER / IR", "Long-toss extension"]);
    expect(out[2].drills.map((d) => d.name)).toEqual(["Flat-ground pitching"]);
  });
});

describe("actual builder, two weeks per program and sport", () => {
  for (const sport of ["baseball", "softball"] as const) {
    for (const [tier, pos, focus, expectCard] of [["5tool", "SS", null, false], ["golden2way", "SS", "position", false], ["pitcher", "P", null, true]] as const) {
      it(`${sport} ${tier}: throwing card ${expectCard ? "kept" : "never shown"}; no budget text anywhere`, () => {
        let throwDays = 0;
        for (let d = 0; d < 14; d++) {
          const plan = buildHammerDailyPlan(ctx({ sport_primary: sport, position_primary: pos, season_phase: "off", age_years: 20, lifecycle_band: "college", lifting_age_years: 2, development_priorities: ["throwing"], weekly_availability_days: 6, injury_history: [], equipment_effective: gear }), NORMAL_SIGNAL, null, null, undefined, new Date(2026, 5, 1 + d),
            { subscriptionModules: [`${sport}_${tier}`], ...(focus ? { pitcherOutings: { primaryFocus: focus } as never } : {}) });
          const text = JSON.stringify(plan.blocks.map((b) => [b.title, b.steps, b.drills.map((x) => [x.name, x.dosage])]));
          expect(text).not.toMatch(/arm units|arm budget/i);
          const t = plan.blocks.find((b) => b.modality === "throwing" && b.status === "ready");
          if (!expectCard) {
            expect(t).toBeUndefined();
            const w = plan.blocks.find((b) => b.modality === "warmup" && b.status === "ready");
            const sec = (w?.drills ?? []).map((x, i) => [x, i] as const).filter(([x]) => (x as { throwSection?: boolean }).throwSection);
            if (sec.length) expect(sec[sec.length - 1][1]).toBe(w!.drills.length - 1);
            const def = plan.blocks.find((b) => b.modality === "defense" && b.status === "ready");
            if (sec.length || def?.drills.some((x) => /throws/.test(x.dosage ?? ""))) throwDays++;
          } else if (t) {
            throwDays++;
            const order = t.drills.map((x) => ({ arm_care: 0, warmup: 1, catch_play: 2, long_toss: 3, position: 4 })[throwKind(x as any)]);
            expect(order).toEqual([...order].sort((a, b) => a - b));
          }
        }
        if (!expectCard) expect(throwDays).toBeGreaterThan(0);
      });
    }
  }
});
