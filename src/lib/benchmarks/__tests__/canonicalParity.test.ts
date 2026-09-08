/**
 * Proof that the two grading systems no longer disagree: the same input must
 * produce the same grade on the combine/Vault surface (`rawToGrade`) and on
 * the rep-logging surface (`compute*Grade`).
 */
import { describe, expect, it } from "vitest";
import { rawToGrade } from "@/lib/gradeEngine";
import { computePopTimeGrade, CATCHER_POP_TIME_METRIC } from "@/lib/catching/popTimeGrade";
import { computeExchangeTimeGrade } from "@/lib/catching/exchangeTimeGrade";
import { computeThrowVeloGrade } from "@/lib/throwing/throwVeloGrade";
import { SCALE_ANCHOR_SNAPSHOT } from "@/lib/benchmarks/canonical";
import type { ScaleReferenceRow } from "@/lib/defense/beatenRunnerGrade";

const scaleRows = SCALE_ANCHOR_SNAPSHOT as unknown as ScaleReferenceRow[];
const popRows: ScaleReferenceRow[] = [
  {
    metric: CATCHER_POP_TIME_METRIC,
    direction: "lower_better",
    floor_value: 2.15,
    avg_value: 2.02,
    record_value: 1.9,
  },
];

describe("one source of truth per metric", () => {
  it("pop time grades identically on both surfaces", () => {
    for (const t of [1.85, 1.96, 2.02, 2.1, 2.3]) {
      const repSurface = computePopTimeGrade(t, popRows).grade;
      const combineSurface = rawToGrade("pop_time", t, "baseball", 25);
      expect(repSurface).toBe(combineSurface);
    }
  });

  it("exchange time grades identically on both surfaces", () => {
    for (const t of [0.5, 0.6, 0.7, 0.8, 0.9]) {
      const repSurface = computeExchangeTimeGrade(t, scaleRows).grade;
      const combineSurface = rawToGrade("fielding_exchange_time", t, "baseball", 25);
      expect(repSurface).toBe(combineSurface);
    }
  });

  it("throwing velocity grades identically on both surfaces", () => {
    for (const v of [70, 80, 88, 92, 99]) {
      const repSurface = computeThrowVeloGrade(
        "throw_velo_mph",
        "infield",
        v,
        scaleRows,
      );
      const combineSurface = rawToGrade("position_throw_velo", v, "baseball", 25);
      expect(repSurface && !repSurface.missing ? repSurface.grade : null).toBe(
        combineSurface,
      );
    }
  });

  it("never leaks baseball anchors into softball — the grade is withheld instead", () => {
    expect(rawToGrade("position_throw_velo", 70, "softball", 20)).toBeNull();
    expect(rawToGrade("position_throw_velo", 70, "baseball", 20)).not.toBeNull();
  });

});
