import { describe, expect, it } from "vitest";
import { formatPrescriptionDose } from "./formatPrescriptionDose";

describe("formatPrescriptionDose", () => {
  it("keeps a one-set one-rep prescription explicit", () => {
    expect(formatPrescriptionDose({ sets: 1, reps: 1, distance_feet: null, duration_seconds: null, total_reps: null, dosage_unit: "reps" })).toBe("1 set × 1 rep");
  });

  it("uses the prescribed 90-foot distance with correct plural", () => {
    expect(formatPrescriptionDose({ sets: 2, reps: 1, distance_feet: 90, duration_seconds: null, total_reps: null, dosage_unit: "feet" })).toBe("2 reps × 90 feet per rep");
  });

  it("uses singular foot only for one foot", () => {
    expect(formatPrescriptionDose({ sets: null, reps: null, distance_feet: 1, duration_seconds: null, total_reps: null, dosage_unit: "feet" })).toBe("1 foot per rep");
  });
});