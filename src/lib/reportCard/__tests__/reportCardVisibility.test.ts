import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { canSeeReportCard, REPORT_CARD_SWITCH, videoGradesShown, VIDEO_GRADE_PLACEHOLDER } from "../visibility";

describe("report_card switch (owner turned OFF Oct 18)", () => {
  it("is off", () => {
    expect(REPORT_CARD_SWITCH).toBe("off");
    expect(videoGradesShown()).toBe(false);
  });
  it("hides the report card from players, coaches, scouts and staff alike", () => {
    expect(canSeeReportCard({ isOwner: false, isAdmin: false })).toBe(false);
    expect(canSeeReportCard({ isOwner: true, isAdmin: false })).toBe(false);
    expect(canSeeReportCard({ isOwner: false, isAdmin: true })).toBe(false);
  });
  it("uses the owner's placeholder wording", () => {
    expect(VIDEO_GRADE_PLACEHOLDER).toBe("Grade coming with camera measurement");
  });
  it("analysis page renders the toggle and card only behind the gate", () => {
    const src = readFileSync("src/pages/AnalyzeVideo.tsx", "utf8");
    expect(src).toMatch(/showReportCard\s*&&\s*\(\s*<AnalysisToggle/);
    expect(src).toMatch(/showReportCard\s*&&\s*analysisView === "report_card"/);
    expect(src).toMatch(/<ReportCardAccessGate>\s*<HammerReportCard/);
  });
});
