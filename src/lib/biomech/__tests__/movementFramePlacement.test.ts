import { describe, it, expect } from "vitest";
import { selectFrameIndices, selectMovementFrameIndices } from "../frameExtractionDeterministic";

describe("movement-centred AI frame placement", () => {
  it("keeps the same budget and lands most frames on the movement", () => {
    const fps = 30, dur = 12, centre = 6.4;
    const even = selectFrameIndices(fps, dur, null);
    const moved = selectMovementFrameIndices(fps, dur, centre);
    expect(moved.length).toBe(even.length);
    const inSwing = (ix: number[]) => ix.filter((i) => Math.abs(i / fps - centre) <= 0.2).length;
    expect(inSwing(moved)).toBeGreaterThanOrEqual(1);
    expect(moved.filter((i) => Math.abs(i / fps - centre) <= 0.61).length).toBe(5);
  });
  it("is deterministic and clamps at clip edges", () => {
    expect(selectMovementFrameIndices(30, 12, 0.2)).toEqual(selectMovementFrameIndices(30, 12, 0.2));
    expect(Math.min(...selectMovementFrameIndices(30, 12, 0.2))).toBe(0);
  });
  it("refuses an out-of-clip centre", () => {
    expect(selectMovementFrameIndices(30, 12, 20)).toEqual([]);
  });
});
