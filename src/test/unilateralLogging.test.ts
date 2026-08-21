import { describe, it, expect } from "vitest";
import {
  matchesUnilateralSlug,
  withSideField,
  templateHasSide,
  isUnilateralRx,
  type LogTemplate,
} from "@/components/hammer/logging/logTemplates";
import { deriveSideMetrics } from "@/lib/hammer/logging/metricNormalizer";

const base: LogTemplate = {
  id: "accessory_lift",
  label: "Accessory",
  fields: [
    { key: "weight", label: "Weight", unit: "lb", kind: "number" },
    { key: "reps", label: "Reps", kind: "number" },
  ],
  defaultRounds: 3,
  meta: { rpe: true },
} as unknown as LogTemplate;

const rx = (slug: string, why: Record<string, unknown> | null = null) =>
  ({ movement_slug: slug, movement_name: slug, why_payload: why }) as any;

describe("unilateral detection", () => {
  it("catches single-limb slugs across every slot", () => {
    for (const slug of [
      "lift_sl_rdl",
      "lift_suitcase_carry",
      "sp_singleleg_bound_alt",
      "wu_hip_cars",
      "kot_atg_split_squat",
      "cressey_1arm_db_row",
      "lift_side_plank_leg_lift",
    ]) {
      expect(matchesUnilateralSlug(slug), slug).toBe(true);
    }
  });

  it("does not flag bilateral movements", () => {
    for (const slug of ["lift_back_squat", "lift_trap_bar_dl", "sp_broad_jump", "lift_bench_press"]) {
      expect(matchesUnilateralSlug(slug), slug).toBe(false);
    }
  });

  it("prefers the generator laterality stamp over the slug", () => {
    expect(isUnilateralRx(rx("mystery_move", { laterality: "unilateral" }), new Set())).toBe(true);
    expect(isUnilateralRx(rx("lift_sl_rdl", { laterality: "bilateral" }), new Set(["lift_sl_rdl"]))).toBe(true);
  });

  it("ignores a stale stamp after an athlete swap", () => {
    const swapped = rx("lift_sl_rdl", {
      laterality: "bilateral",
      athlete_substitution: { to_slug: "lift_sl_rdl" },
    });
    expect(isUnilateralRx(swapped, new Set())).toBe(true);
  });
});

describe("side decoration", () => {
  it("prepends a side field and doubles the rounds", () => {
    const t = withSideField(base);
    expect(templateHasSide(t)).toBe(true);
    expect(t.fields[0].kind).toBe("side");
    expect(t.defaultRounds).toBe(6);
  });

  it("is idempotent", () => {
    const once = withSideField(base);
    expect(withSideField(once)).toBe(once);
  });
});

describe("per-side metrics", () => {
  it("returns null when nothing carries a side", () => {
    expect(deriveSideMetrics("accessory_lift", [{ weight: 100, reps: 8 }])).toBeNull();
  });

  it("splits bests per side and reports the weaker limb", () => {
    const s = deriveSideMetrics("accessory_lift", [
      { side: "L", weight: 40, reps: 8 },
      { side: "R", weight: 50, reps: 8 },
      { side: "L", weight: 45, reps: 8 },
      { side: "R", weight: 50, reps: 8 },
    ]);
    expect(s?.L?.rounds).toBe(2);
    expect(s?.R?.rounds).toBe(2);
    const load = s?.deltas.find((d) => d.key === "load_lb");
    expect(load?.left).toBe(45);
    expect(load?.right).toBe(50);
    expect(load?.weaker).toBe("L");
    expect(load?.diffPct).toBe(10);
  });

  it("withholds a delta below the per-side minimum — never imputes", () => {
    const s = deriveSideMetrics("accessory_lift", [
      { side: "L", weight: 40, reps: 8 },
      { side: "R", weight: 50, reps: 8 },
    ]);
    expect(s?.deltas).toEqual([]);
    expect(s?.L?.metrics.load_lb).toBe(40);
  });

  it("takes the fastest round for lower-is-better metrics", () => {
    const s = deriveSideMetrics("sprint_timed", [
      { side: "L", time: 3.2 },
      { side: "L", time: 3.4 },
      { side: "R", time: 3.0 },
      { side: "R", time: 3.1 },
    ]);
    const t = s?.deltas.find((d) => d.key === "sprint_time_s");
    expect(t?.left).toBe(3.2);
    expect(t?.right).toBe(3.0);
    expect(t?.weaker).toBe("L");
  });
});
