import { describe, expect, it } from "vitest";
import { placeThrowsByRole } from "./throwPlacement";

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
    expect(w.drills[2].cue).toBe("Log them right here.");
  });
  it("position player: position throws only on the Defense card, with counts", () => {
    const d = placeThrowsByRole(day(), { pitcher: false, toSteps }).find((b) => b.modality === "defense")!;
    expect(d.drills.map((x) => x.name)).toEqual(["Deep-hole throw", "Routine ground-ball throw"]);
    expect(d.drills[0].dosage).toBe("5 reps · 5 throws");
  });
  it("pitcher: Throwing card kept in order arm care → warm-up → catch play → long toss, no budget title", () => {
    const b = day(); b[1].drills = b[1].drills.filter((d) => !/ground-ball/.test(d.name));
    const t = placeThrowsByRole(b, { pitcher: true, toSteps }).find((x) => x.modality === "throwing")!;
    expect(t.drills.map((d) => d.name)).toEqual(["Band series — ER / IR", "Regulation extension toss", "Long-toss extension (5oz)"]);
    expect(t.title).not.toMatch(/budget|arm units/i);
  });
});
