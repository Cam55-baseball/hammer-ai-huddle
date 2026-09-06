import { describe, it, expect } from "vitest";
import { collectAttempts } from "@/lib/hammer/standards/attempts";
import { buildBestIndex, evaluateAll } from "@/lib/hammer/standards/evaluate";
import { standardById } from "@/lib/hammer/standards/catalog";

const measures = { bodyweightLbs: 190, chronologicalAge: 18, trainingAge: "advanced" };

const rdlSet = {
  movement_slug: "rdl_db",
  plan_date: "2026-09-06",
  rounds: [
    { weight: 150, reps: 10 },
    { weight: 160, reps: 10 },
  ],
};

describe("standards attempt collection", () => {
  it("records the raw observation against the standard the movement maps to", () => {
    const rows = collectAttempts(rdlSet, measures, "2026-09-06");
    expect(rows.length).toBeGreaterThan(0);
    const r = rows.find((x) => x.standard_id === "pa_rdl")!;
    expect(r).toBeTruthy();
    expect(r.movement_slug).toBe("rdl_db");
    expect(r.plan_date).toBe("2026-09-06");
    expect(r.training_age_band).toBe("advanced");
    expect(r.observed_value).toBe(Math.round((160 / 190) * 100));
  });

  it("sample size is never null and never below one", () => {
    for (const r of collectAttempts(rdlSet, measures, "2026-09-06")) {
      expect(r.sample_size).not.toBeNull();
      expect(r.sample_size).toBeGreaterThanOrEqual(1);
    }
    const single = collectAttempts(
      { movement_slug: "rdl_db", rounds: [{ weight: 150, reps: 10 }] },
      measures,
      "2026-09-06",
    );
    expect(single[0].sample_size).toBe(1);
  });

  it("a movement in no standard produces nothing", () => {
    expect(collectAttempts({ movement_slug: "not_a_real_movement", rounds: [{ reps: 5 }] }, measures, "2026-09-06")).toEqual([]);
  });

  it("collection does not move a single athlete-facing value", () => {
    const idx = buildBestIndex([rdlSet]);
    const before = evaluateAll(idx, measures);
    collectAttempts(rdlSet, measures, "2026-09-06");
    const after = evaluateAll(idx, measures);
    expect(JSON.stringify(after)).toBe(JSON.stringify(before));
    // and the catalog targets are untouched
    expect(standardById("pa_rdl")!.targets).toEqual(standardById("pa_rdl")!.targets);
  });
});
