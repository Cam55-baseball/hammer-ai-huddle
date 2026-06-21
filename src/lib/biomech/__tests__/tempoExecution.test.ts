/**
 * Phase 34 — End-to-end execution evidence for the authorized `tempo_sec`
 * implementation path. Asserts the real, honest gate state under the
 * current acquisition-class input set (D-POSE stub + no labeled corpus).
 */

import { describe, it, expect } from "vitest";
import {
  EMPTY_TEMPO_CORPUS,
  parseTempoValidationCorpus,
  TempoCorpusParseError,
} from "../validation/tempoCorpusIngestion";
import { runTempoValidationHarness } from "../validation/tempoHarness";
import { generateTempoCalibrationCertificate } from "../calibration/tempoCalibration";
import { evaluateTempoGateMatrix } from "../gates/tempoGateMatrix";
import { tempoEvidenceToTileState } from "../reportCard/tempoTileAdapter";
import { runTempoPipeline } from "../pipeline/tempoPipeline";

const basePipelineInputs = {
  video_sha256_hex: "a".repeat(64),
  fps_true: 60,
  landing_time_sec: null,
  direction_sign: 1 as const,
  calibration_h_px: 1080,
  pose_frames: [],
};

describe("Phase 34 — tempo_sec implementation execution", () => {
  describe("corpus ingestion", () => {
    it("rejects a non-array root", () => {
      expect(() => parseTempoValidationCorpus({} as unknown)).toThrow(
        TempoCorpusParseError,
      );
    });

    it("rejects a record missing clip_id", () => {
      expect(() =>
        parseTempoValidationCorpus([
          { predicted_sec: 1.0, ground_truth_sec: 1.0 },
        ]),
      ).toThrow(TempoCorpusParseError);
    });

    it("rejects a record with non-finite ground_truth_sec", () => {
      expect(() =>
        parseTempoValidationCorpus([
          { clip_id: "c1", predicted_sec: 1.0, ground_truth_sec: Number.NaN },
        ]),
      ).toThrow(TempoCorpusParseError);
    });

    it("returns [] for an empty array", () => {
      expect(parseTempoValidationCorpus([])).toEqual([]);
    });

    it("accepts a well-formed corpus including null predictions", () => {
      const out = parseTempoValidationCorpus([
        { clip_id: "c1", predicted_sec: 0.95, ground_truth_sec: 1.0 },
        { clip_id: "c2", predicted_sec: null, ground_truth_sec: 1.1 },
      ]);
      expect(out).toHaveLength(2);
      expect(out[1].predicted_sec).toBeNull();
    });
  });

  describe("validation + calibration with EMPTY_TEMPO_CORPUS", () => {
    it("validation harness returns no_corpus", async () => {
      const report = await runTempoValidationHarness(EMPTY_TEMPO_CORPUS);
      expect(report.status).toBe("no_corpus");
      expect(report.pair_count).toBe(0);
    });

    it("calibration certificate returns uncalibrated / no_corpus", async () => {
      const report = await runTempoValidationHarness(EMPTY_TEMPO_CORPUS);
      const cal = await generateTempoCalibrationCertificate(report);
      expect(cal.status).toBe("uncalibrated");
      if (cal.status === "uncalibrated") {
        expect(cal.reason).toBe("no_corpus");
      }
    });
  });

  describe("gate matrix under stub pose model + empty corpus", () => {
    it("emits all_pass=false with validation/calibration/confidence blocked", async () => {
      const matrix = await evaluateTempoGateMatrix({
        pipeline_inputs: basePipelineInputs,
        validation_pairs: EMPTY_TEMPO_CORPUS,
      });
      expect(matrix.all_pass).toBe(false);
      expect(matrix.blocking_gates).toEqual(
        expect.arrayContaining([
          "validation",
          "calibration",
          "confidence_calibration",
        ]),
      );
      expect(matrix.gates.validation.outcome).toBe("block");
      expect(matrix.gates.calibration.outcome).toBe("block");
      expect(matrix.gates.confidence_calibration.outcome).toBe("block");
    });
  });

  describe("tile adapter under stub pose model + empty corpus", () => {
    it("emits status=missing with a canonical missing_reason", async () => {
      const pipeline = await runTempoPipeline(basePipelineInputs);
      const matrix = await evaluateTempoGateMatrix({
        pipeline_inputs: basePipelineInputs,
        validation_pairs: EMPTY_TEMPO_CORPUS,
      });
      const tile = tempoEvidenceToTileState({
        evidence: pipeline.evidence,
        gate_matrix: matrix,
      });
      expect(tile.status).toBe("missing");
      expect(typeof tile.missing_reason).toBe("string");
      expect(tile.missing_reason!.length).toBeGreaterThan(0);
    });
  });
});
