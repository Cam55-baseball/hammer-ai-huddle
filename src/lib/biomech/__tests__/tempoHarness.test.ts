import { describe, expect, it } from "vitest";
import {
  runTempoValidationHarness,
  MIN_LABELED_PAIRS_FOR_VALIDATION,
} from "../validation/tempoHarness";

describe("Phase 26 — tempo validation harness", () => {
  it("emits no_corpus when no pairs supplied", async () => {
    const r = await runTempoValidationHarness([]);
    expect(r.status).toBe("no_corpus");
    expect(r.pair_count).toBe(0);
    expect(r.summary.mean_residual_sec).toBeNull();
  });

  it("emits insufficient_corpus below the labeled-pair floor", async () => {
    const r = await runTempoValidationHarness([
      { clip_id: "c1", predicted_sec: 1.0, ground_truth_sec: 1.05 },
    ]);
    expect(r.status).toBe("insufficient_corpus");
    expect(r.pair_count).toBe(1);
    expect(r.residuals[0].residual_sec).toBeCloseTo(-0.05, 6);
  });

  it("emits executed only when pair count meets the floor", async () => {
    const pairs = Array.from(
      { length: MIN_LABELED_PAIRS_FOR_VALIDATION },
      (_, i) => ({
        clip_id: `c${String(i).padStart(4, "0")}`,
        predicted_sec: 1.0,
        ground_truth_sec: 1.0,
      }),
    );
    const r = await runTempoValidationHarness(pairs);
    expect(r.status).toBe("executed");
    expect(r.summary.mean_residual_sec).toBe(0);
    expect(r.summary.mean_absolute_residual_sec).toBe(0);
  });

  it("is deterministic over input order (canonical sort)", async () => {
    const a = await runTempoValidationHarness([
      { clip_id: "b", predicted_sec: 1.0, ground_truth_sec: 1.0 },
      { clip_id: "a", predicted_sec: 1.1, ground_truth_sec: 1.0 },
    ]);
    const b = await runTempoValidationHarness([
      { clip_id: "a", predicted_sec: 1.1, ground_truth_sec: 1.0 },
      { clip_id: "b", predicted_sec: 1.0, ground_truth_sec: 1.0 },
    ]);
    expect(a.corpus_fingerprint_hex).toBe(b.corpus_fingerprint_hex);
  });

  it("counts missing predictions without fabricating residuals", async () => {
    const r = await runTempoValidationHarness([
      { clip_id: "c1", predicted_sec: null, ground_truth_sec: 1.0 },
      { clip_id: "c2", predicted_sec: 1.0, ground_truth_sec: 1.0 },
    ]);
    expect(r.summary.missing_prediction_count).toBe(1);
    expect(r.residuals[0].residual_sec).toBeNull();
  });
});
