import { describe, expect, it } from "vitest";
import { isTrainingIntelV1Enabled } from "@/lib/flags/trainingIntelV1";

describe("training_intel_v1 flag", () => {
  it("is off unless it is explicitly switched on", () => {
    for (const v of [undefined, null, false, 0, "true", {}, { enabled: false }, []]) {
      expect(isTrainingIntelV1Enabled(v)).toBe(false);
    }
  });

  it("is on for true and { enabled: true }", () => {
    expect(isTrainingIntelV1Enabled(true)).toBe(true);
    expect(isTrainingIntelV1Enabled({ enabled: true })).toBe(true);
  });
});
