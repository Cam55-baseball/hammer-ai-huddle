import { describe, expect, it } from "vitest";
import { assessmentStartAllowed } from "../startGate";
describe("initial assessment Start rule", () => {
  it("locks a new player until Completed is saved", () => expect(assessmentStartAllowed(null, null)).toBe(false));
  it("unlocks on the completion tap without requiring any answers", () => expect(assessmentStartAllowed(null, "2026-10-18T04:00:00Z")).toBe(true));
  it("never relocks players who already started", () => expect(assessmentStartAllowed("2026-10-04T04:00:00Z", null)).toBe(true));
});