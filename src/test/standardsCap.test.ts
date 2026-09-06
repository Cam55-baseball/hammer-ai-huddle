import { describe, it, expect } from "vitest";
import {
  STANDARDS_BW_CAP_LBS,
  effectiveBodyweight,
  standardById,
} from "@/lib/hammer/standards/catalog";
import { buildBestIndex, evaluateStandard, targetLoadLbs } from "@/lib/hammer/standards/evaluate";

const measures = { bodyweightLbs: 400, chronologicalAge: 18, trainingAge: "advanced" };

describe("standards — bodyweight cap", () => {
  it("caps at 265 lb", () => {
    expect(STANDARDS_BW_CAP_LBS).toBe(265);
    expect(effectiveBodyweight(400)).toBe(265);
    expect(effectiveBodyweight(180)).toBe(180);
    expect(effectiveBodyweight(0)).toBeNull();
    expect(effectiveBodyweight(null)).toBeNull();
  });

  it("a 400 lb athlete is scored at 265 lb, not 400", () => {
    const def = standardById("pa_rdl")!;
    const idx = buildBestIndex([
      { movement_slug: "rdl_db", rounds: [{ weight: 265, reps: 10 }] },
    ]);
    const p = evaluateStandard(def, idx, measures);
    expect(p.value).toBe(100); // 265/265, not 265/400 = 66
  });

  it("target pounds are rendered from the capped bodyweight", () => {
    const def = standardById("pa_rdl")!;
    expect(targetLoadLbs(def, "standard", 400)).toBe(Math.round(0.6 * 265));
  });
});

describe("standards — med ball per implement", () => {
  const idx = buildBestIndex([
    { movement_slug: "med_ball_shot_put", rounds: [{ weight: 6, distance: 45 }, { weight: 10, distance: 30 }] },
  ]);
  const m = { bodyweightLbs: 190, chronologicalAge: 18, trainingAge: "advanced" };

  it("reads only throws logged with that ball", () => {
    expect(evaluateStandard(standardById("rp_shot_put_6lb")!, idx, m).value).toBe(45);
    expect(evaluateStandard(standardById("rp_shot_put_10lb")!, idx, m).value).toBe(30);
  });

  it("an implement never thrown stays visible with no value and no award", () => {
    const p = evaluateStandard(standardById("rp_shot_put_4lb")!, idx, m);
    expect(p.value).toBeNull();
    expect(p.achieved).toBeNull();
    expect(p.eligible).toBe(true);
  });
});
