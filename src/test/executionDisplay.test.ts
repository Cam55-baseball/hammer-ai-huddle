import { describe, it, expect } from "vitest";
import {
  deriveExecutionDisplay,
  EMPTY_EXECUTION_DISPLAY,
  IN_SEASON_RIR_FLOOR,
  type ExecutionSource,
} from "@/lib/wic/execution/executionDisplay";

const base: ExecutionSource = {
  slot: "supplemental",
  sequence_role: "supplemental",
  phase: "os_q2",
  sets: 3,
  reps: 10,
};

describe("execution layer — nulls and unknowns render nothing", () => {
  it("a fully null row renders nothing and does not throw", () => {
    expect(deriveExecutionDisplay(null)).toEqual(EMPTY_EXECUTION_DISPLAY);
    expect(deriveExecutionDisplay(undefined)).toEqual(EMPTY_EXECUTION_DISPLAY);
    const bare = deriveExecutionDisplay({});
    expect(bare.repsSuffix).toBe("");
    expect(bare.setsLabel).toBeNull();
    expect(bare.rirLabel).toBeNull();
    expect(bare.intentLabel).toBeNull();
  });

  it("unknown enum values render nothing rather than the raw string", () => {
    const d = deriveExecutionDisplay({
      ...base,
      intent_tag: "totally_made_up",
      asymmetry_rule: "sideways",
      intensity_mode: "sideways",
    });
    expect(d.intentLabel).toBeNull();
    expect(d.asymmetryLabel).toBeNull();
    expect(d.intensityModeLabel).toBeNull();
  });

  it("hostile shapes are swallowed, never thrown", () => {
    const hostile = {
      ...base,
      cue_ids: "not-an-array",
      set_range_max: Number.NaN,
      rir_low: "three",
      get phase(): string {
        throw new Error("boom");
      },
    } as unknown as ExecutionSource;
    expect(() => deriveExecutionDisplay(hostile)).not.toThrow();
    expect(deriveExecutionDisplay(hostile)).toEqual(EMPTY_EXECUTION_DISPLAY);
  });
});

describe("execution layer — display never becomes a dose", () => {
  it("open_ended renders a suffix, not a number", () => {
    const d = deriveExecutionDisplay({ ...base, open_ended: true });
    expect(d.repsSuffix).toBe("+");
    // nothing in the payload is a rep count
    expect(Object.values(d).some((v) => v === 10 || v === 11)).toBe(false);
  });

  it("set_range_max uses the doctrine count as the minimum and can never lower it", () => {
    expect(deriveExecutionDisplay({ ...base, set_range_max: 5 }).setsLabel).toBe("3–5 sets");
    // a max at or below the doctrine count is a no-op, not a reduction
    expect(deriveExecutionDisplay({ ...base, set_range_max: 3 }).setsLabel).toBeNull();
    expect(deriveExecutionDisplay({ ...base, set_range_max: 2 }).setsLabel).toBeNull();
  });

  it("a lift compound row may never show a set range or a density target", () => {
    const lift: ExecutionSource = { ...base, slot: "lift", sequence_role: "compound_lower" };
    const d = deriveExecutionDisplay({ ...lift, set_range_max: 5, density_target_seconds: 480 });
    expect(d.setsLabel).toBeNull();
    expect(d.densityLabel).toBeNull();
    expect(d.suppressed).toContain("set_range_max:slot_not_eligible");
    expect(d.suppressed).toContain("density_target_seconds:slot_not_eligible");
  });

  it("warm-up and recovery roles are range eligible", () => {
    for (const role of ["warmup_integration", "primer", "recovery_flush", "mobility"]) {
      const d = deriveExecutionDisplay({ ...base, slot: "lift", sequence_role: role, set_range_max: 5 });
      expect(d.setsLabel).toBe("3–5 sets");
    }
  });
});

describe("execution layer — in-season bans", () => {
  const inSeason: ExecutionSource = { ...base, phase: "in_season" };

  it("no open-ended sets in-season", () => {
    const d = deriveExecutionDisplay({ ...inSeason, open_ended: true });
    expect(d.repsSuffix).toBe("");
    expect(d.suppressed).toContain("open_ended:in_season");
  });

  it("no density target in-season", () => {
    const d = deriveExecutionDisplay({ ...inSeason, density_target_seconds: 480 });
    expect(d.densityLabel).toBeNull();
    expect(d.suppressed).toContain("density_target_seconds:in_season");
  });

  it("RIR floor of 3 in-season — never to failure during the season", () => {
    const d = deriveExecutionDisplay({ ...inSeason, rir_low: 0, rir_high: 2 });
    expect(d.rirLabel).toBe(`${IN_SEASON_RIR_FLOOR} reps in reserve`);
    expect(d.suppressed).toContain("rir_low:in_season_floor_3");
    // an already-conservative range is left alone
    expect(deriveExecutionDisplay({ ...inSeason, rir_low: 3, rir_high: 5 }).rirLabel)
      .toBe("3–5 reps in reserve");
  });

  it("offseason keeps a low RIR — the floor is seasonal, not universal", () => {
    expect(deriveExecutionDisplay({ ...base, rir_low: 0, rir_high: 1 }).rirLabel)
      .toBe("0–1 reps in reserve");
  });
});

describe("execution layer — copy", () => {
  it("weak_side_twice renders the asymmetry line", () => {
    expect(deriveExecutionDisplay({ ...base, asymmetry_rule: "weak_side_twice" }).asymmetryLabel)
      .toBe("Tighter side first and last.");
  });

  it("per_side and intent render", () => {
    const d = deriveExecutionDisplay({ ...base, per_side: true, intent_tag: "max_strength" });
    expect(d.perSideLabel).toBe("Each side.");
    expect(d.intentLabel).toBe("Max strength");
  });
});
