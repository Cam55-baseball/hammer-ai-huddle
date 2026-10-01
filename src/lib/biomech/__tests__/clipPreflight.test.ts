import { describe, it, expect, vi } from "vitest";
vi.mock("../pose/poseRunner", () => ({ getPoseLandmarkerForDenseCapture: vi.fn(), detectDensePoseCandidates: vi.fn() }));
import { judgeClipPreflight, type PreflightSample } from "../pose/clipPreflight";

const s = (fill: number | null, wx = 0.5, people = 1, whole = true): PreflightSample =>
  ({ people: fill == null ? 0 : people, bodyFill: fill, wrist: fill == null ? null : [wx, 0.5], wholeBody: whole });

describe("clip pre-check", () => {
  it("passes a close, single, moving, full-body clip", () => {
    const v = judgeClipPreflight([0.7, 0.7, 0.7, 0.7, 0.7].map((f, i) => s(f, 0.3 + i * 0.1)), 30);
    expect(v.willRead).toBe(true);
    expect(v.issues).toHaveLength(0);
  });
  it("names a small, rarely found athlete (the owner's broadcast clip)", () => {
    const samples = [s(0.15), s(null), s(null), s(0.15, 0.6), s(null), s(null), s(0.16, 0.4), s(null), s(null), s(null)];
    const v = judgeClipPreflight(samples, 30);
    expect(v.willRead).toBe(false);
    expect(v.issues.map((i) => i.kind)).toEqual(expect.arrayContaining(["not_found", "too_far"]));
  });
  it("flags a still clip as no movement", () => {
    const v = judgeClipPreflight(Array.from({ length: 10 }, () => s(0.7)), 30);
    expect(v.issues.map((i) => i.kind)).toContain("no_movement");
  });
  it("copy has no numbers", () => {
    const v = judgeClipPreflight([s(null), s(0.1, 0.5, 3, false)], 12);
    for (const i of v.issues) expect(`${i.title} ${i.fix}`).not.toMatch(/\d/);
  });
});
