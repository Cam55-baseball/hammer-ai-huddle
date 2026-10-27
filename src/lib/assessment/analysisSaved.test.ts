import { expect, it } from "vitest";
import { assessmentAnalysisSaved } from "./analysisSaved";
const report = { saved: true, summary: ["Visible movement"], feedback: "Real clip coaching", drills: [] };
it("refreshes assessment evidence only after a confirmed saved readable report", () => {
  expect(assessmentAnalysisSaved(report)).toBe(true);
  for (const invalid of [null, { ...report, saved: false }, { ...report, saved: undefined }, { ...report, report_status: "not_measured" }, { ...report, feedback: " " }, { ...report, summary: [] }]) {
    expect(assessmentAnalysisSaved(invalid)).toBe(false);
  }
});