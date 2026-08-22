import { describe, it, expect } from "vitest";
import { buildAnthroProfile, hasAnyAnthroSignal } from "../profile";

describe("anthro foot length", () => {
  it("reports foot_length_in as missing when absent", () => {
    const p = buildAnthroProfile({ height_in: 70 });
    expect(p.footFlag).toBeNull();
    expect(p.missing).toContain("foot_length_in");
  });

  it("flags a long foot relative to height", () => {
    const p = buildAnthroProfile({ height_in: 70, foot_length_in: 11.5 });
    expect(p.footFlag).toBe("long_foot");
    expect(p.flags).toContain("long_foot");
    expect(hasAnyAnthroSignal(p)).toBe(true);
  });

  it("flags a short foot relative to height", () => {
    const p = buildAnthroProfile({ height_in: 74, foot_length_in: 9 });
    expect(p.footFlag).toBe("short_foot");
  });

  it("stays balanced in the middle band and is deterministic", () => {
    const a = buildAnthroProfile({ height_in: 70, foot_length_in: 10 });
    const b = buildAnthroProfile({ height_in: 70, foot_length_in: 10 });
    expect(a.footFlag).toBe("balanced");
    expect(a.flags).not.toContain("long_foot");
    expect(a).toEqual(b);
  });
});
