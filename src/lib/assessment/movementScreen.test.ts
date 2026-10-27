import { expect, it } from "vitest";
import { measuredTotalArc, movementHasPain, movementScore, movementScreenComplete, setMovementObservation } from "./movementScreen";
it("bilateral pain is preserved for legacy safety and cannot become painless from the other side", () => {
  const first = setMovementObservation({}, "shoulder_ir", { leftStatus: "pain", rightStatus: "controlled" });
  const next = setMovementObservation(first, "shoulder_er", { leftStatus: "controlled", rightStatus: "controlled" });
  expect(next.shoulder).toBe("pain");
  expect(movementHasPain(next)).toBe(true);
});
it("missing observations never mean a completed or painless screen", () => {
  expect(movementScreenComplete({ hip: "easy", shoulder: "easy", ankle: "easy", balance: "easy" })).toBe(false);
  expect(movementScore(undefined)).toBe(null);
  expect(setMovementObservation({}, "hip_ir", { left: "30" }).hip).toBeUndefined();
  expect(setMovementObservation({}, "hip_ir", { leftStatus: "controlled" }).hip).toBeUndefined();
  expect(setMovementObservation({ shoulder: "pain" }, "shoulder_ir", { leftStatus: "controlled", rightStatus: "controlled" }).shoulder).toBe("pain");
});
it("total shoulder arc adds actual measurements only", () => {
  expect(measuredTotalArc("40", "90")).toBe(130);
  expect(measuredTotalArc("", "90")).toBe(null);
  expect(measuredTotalArc("unmeasured", "90")).toBe(null);
});
it("observational scoring is 0 pain, 1 limited, 2 controlled without diagnosis", () => {
  expect(movementScore("pain")).toBe(0);
  expect(movementScore("limited")).toBe(1);
  expect(movementScore("controlled")).toBe(2);
  expect(movementHasPain({ history: { current_pain: "yes" } })).toBe(true);
});