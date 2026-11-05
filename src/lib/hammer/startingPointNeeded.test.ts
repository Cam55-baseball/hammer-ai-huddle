import { describe, it, expect } from "vitest";
import { startingPointNeed, type StartingNeedFacts } from "./startingPointNeeded";

const base: StartingNeedFacts = {
  today: "2026-11-05", program: "5tool",
  saved: { complete: true, program: "5tool", updatedAt: "2026-10-20T12:00:00Z" },
  lastLogDate: "2026-11-03", healedAts: [],
};

describe("Where are you starting from? cue (owner Nov 5)", () => {
  it("hidden when nothing is needed", () => expect(startingPointNeed(base)).toBeNull());
  it("shows when never answered (incl. a new sport)", () => expect(startingPointNeed({ ...base, saved: null })).toBe("unanswered"));
  it("shows when a starting area is unanswered", () => expect(startingPointNeed({ ...base, saved: { ...base.saved!, complete: false } })).toBe("unanswered"));
  it("shows after 28+ days without logged training", () => expect(startingPointNeed({ ...base, today: "2026-12-01", lastLogDate: "2026-11-03" })).toBe("no_training_28"));
  it("27 days is not enough", () => expect(startingPointNeed({ ...base, today: "2026-11-30", lastLogDate: "2026-11-03" })).toBeNull());
  it("shows when an injury is marked healed after the answers", () => expect(startingPointNeed({ ...base, healedAts: ["2026-11-01T09:00:00Z"] })).toBe("healed"));
  it("an older heal does not re-cue", () => expect(startingPointNeed({ ...base, healedAts: ["2026-10-01T09:00:00Z"] })).toBeNull());
  it("shows when the program changed", () => expect(startingPointNeed({ ...base, program: "golden2way" })).toBe("program_changed"));
  it("re-answering clears the cue until it's needed again", () => expect(startingPointNeed({ ...base, today: "2026-12-01", lastLogDate: null, saved: { ...base.saved!, updatedAt: "2026-11-30T12:00:00Z" }, healedAts: ["2026-11-01T09:00:00Z"] })).toBeNull());
  it("no program → no cue", () => expect(startingPointNeed({ ...base, program: null, saved: null })).toBeNull());
});
