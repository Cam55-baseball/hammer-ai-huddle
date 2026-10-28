import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { canSeeReportCard, REPORT_CARD_SWITCH, videoGradesShown, VIDEO_GRADE_PLACEHOLDER } from "../visibility";

describe("report_card switch (owner turned OFF Oct 18)", () => {
  it("is off", () => {
    expect(REPORT_CARD_SWITCH).toBe("off");
    expect(videoGradesShown()).toBe(false);
  });
  it("hides the report card from players, coaches and scouts; owner/admin keep it (Oct 19)", () => {
    expect(canSeeReportCard({ isOwner: false, isAdmin: false })).toBe(false);
    expect(canSeeReportCard({ isOwner: true, isAdmin: false })).toBe(true);
    expect(canSeeReportCard({ isOwner: false, isAdmin: true })).toBe(true);
  });
  it("uses the owner's placeholder wording", () => {
    expect(VIDEO_GRADE_PLACEHOLDER).toBe("Grade coming with camera measurement");
  });
  it("analysis page renders the toggle and card only behind the gate", () => {
    const src = readFileSync("src/pages/AnalyzeVideo.tsx", "utf8");
    expect(src).toMatch(/showReportCard\s*\?\s*\(\s*<div[^>]*>\{!videoGradesShown\(\) && <InternalLabel \/>\}<AnalysisToggle/);
    // Owner P0 (Oct 28): the written analysis shows no grade line or camera wording.
    expect(src).not.toContain('Grade: {VIDEO_GRADE_PLACEHOLDER}');
    expect(src).toMatch(/showReportCard\s*&&\s*analysisView === "report_card"/);
    expect(src).toMatch(/<ReportCardAccessGate>\s*<HammerReportCard/);
  });
});
