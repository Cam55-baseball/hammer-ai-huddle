import { describe, expect, it } from "vitest";
import { athleteNoticeCopy } from "@/lib/hammer/notices/athleteNoticeCopy";

describe("athlete notice translation", () => {
  it("replaces known system wording without numbers or system terms", () => {
    const copy = athleteNoticeCopy({ reason: "sleep", detail: "Only 5h sleep — high-CNS work reduced." });
    expect(copy).toBe("You slept less than usual. Today's hard work is lighter; follow the plan shown.");
  });
  it("does not infer a cause for an unfamiliar notice", () => {
    expect(athleteNoticeCopy({ reason: "game_proximity", detail: "Unexpected schedule reason" })).toBe("Unexpected schedule reason");
  });
});