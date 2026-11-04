import { describe, it, expect } from "vitest";
import { sendChecklist, sendButtonHint } from "@/lib/coachRx/sendChecklist";
describe("coach send checklist (Nov 4 r2 #1)", () => {
  it("names every missing required input in plain words", () => {
    const m = sendChecklist({ title: "", category: "", players: 0, dateValid: false, exercises: [] });
    expect(m).toEqual(["Required: pick at least one player", "Required: pick a category for this workout", "Required: pick a date (today or later)", "Required: give the workout a name", "Required: add at least one exercise"]);
    expect(sendButtonHint(m)).toBe("5 things left before you can send");
  });
  it("is empty when a coach gave everything", () => {
    expect(sendChecklist({ title: "W", category: "mobility", players: 1, dateValid: true, exercises: [{ name: "x", dosage_unit: "reps" }] })).toEqual([]);
  });
  it("treats 'All categories' as no category", () => {
    expect(sendChecklist({ category: "all", players: 1, dateValid: true, exercises: [{ name: "x", dosage_unit: "reps" }] })).toEqual(["Required: pick a category for this workout"]);
  });
});
