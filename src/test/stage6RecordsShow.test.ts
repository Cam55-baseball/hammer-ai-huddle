import { describe, it, expect } from "vitest";
import { buildRecordsShow, EXCLUDED_KEY } from "@/lib/progress/recordsShow";

const day = (i: number) => new Date(Date.UTC(2026, 6, 1 + i)).toISOString().slice(0, 10);
const pairs = (n: number, a = "workload.volume_load", b = "readiness.readiness_score", f = (i: number) => i) =>
  Array.from({ length: n }, (_, i) => ({ key_a: a, key_b: b, value_a: i, value_b: f(i), day: day(i) }));
const kinds = [{ key: "games", label: "Games logged", first: null, last: null, unlocks: "Log your games." }];

describe("Stage 6 — what your records show", () => {
  it("nothing logged → says so, no inference", () => {
    const r = buildRecordsShow({ kinds, pairs: [] });
    expect(r.together).toEqual([]);
    expect(r.waiting).toMatch(/Nothing to compare yet/);
    expect(r.progressToBar).toBe(0);
  });
  it("below the evidence bar nothing surfaces, even a perfect pattern", () => {
    const r = buildRecordsShow({ kinds, pairs: pairs(12) });
    expect(r.together).toEqual([]);
    expect(r.progressToBar).toBeGreaterThan(0);
    expect(r.progressToBar).toBeLessThan(1);
  });
  it("a strong, replicated pattern over enough days surfaces, dated, never causal", () => {
    const r = buildRecordsShow({ kinds, pairs: pairs(30) });
    expect(r.together).toHaveLength(1);
    expect(r.together[0].sentence).toMatch(/tends to be higher/);
    expect(r.together[0].sentence).not.toMatch(/cause|because|\d/);
    expect(r.together[0].from).toBe(day(0));
  });
  it("noise over many days does not surface", () => {
    const noise = (i: number) => ((i * 7919) % 13) - 6;
    expect(buildRecordsShow({ kinds, pairs: pairs(30, undefined, undefined, noise) }).together).toEqual([]);
  });
  it("mental or mood measures are never tested", () => {
    expect(EXCLUDED_KEY.test("mental.mood_score")).toBe(true);
    expect(buildRecordsShow({ kinds, pairs: pairs(30, "workload.volume_load", "mental.mood_score") }).together).toEqual([]);
  });
});
