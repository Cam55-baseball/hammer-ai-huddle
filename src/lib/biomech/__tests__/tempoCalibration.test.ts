import { describe, expect, it } from "vitest";
import { generateTempoCalibrationCertificate } from "../calibration/tempoCalibration";
import { runTempoValidationHarness } from "../validation/tempoHarness";

describe("Phase 26 — tempo calibration certificate", () => {
  it("refuses certificate over empty corpus (no_corpus)", async () => {
    const report = await runTempoValidationHarness([]);
    const cert = await generateTempoCalibrationCertificate(report);
    expect(cert.status).toBe("uncalibrated");
    if (cert.status === "uncalibrated") {
      expect(cert.reason).toBe("no_corpus");
      expect(cert.observed_pair_count).toBe(0);
    }
  });

  it("refuses certificate below labeled-pair floor", async () => {
    const report = await runTempoValidationHarness([
      { clip_id: "c1", predicted_sec: 1.0, ground_truth_sec: 1.0 },
    ]);
    const cert = await generateTempoCalibrationCertificate(report);
    expect(cert.status).toBe("uncalibrated");
    if (cert.status === "uncalibrated") {
      expect(cert.reason).toBe("insufficient_corpus");
    }
  });

  it("emits a calibrated certificate with deterministic hash when corpus meets floor", async () => {
    const pairs = Array.from({ length: 30 }, (_, i) => ({
      clip_id: `c${String(i).padStart(4, "0")}`,
      predicted_sec: 1.0,
      ground_truth_sec: 1.0,
    }));
    const report = await runTempoValidationHarness(pairs);
    const cert = await generateTempoCalibrationCertificate(report);
    expect(cert.status).toBe("calibrated");
    if (cert.status === "calibrated") {
      expect(cert.certificate_sha256_hex).toMatch(/^[0-9a-f]{64}$/);
      expect(cert.residual_envelope.pair_count).toBe(30);
    }
  });
});
