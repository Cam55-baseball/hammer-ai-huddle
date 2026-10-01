import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { canSeeReportCard, REPORT_CARD_RELEASED_TO_ALL_USERS } from "../visibility";

describe("report card visibility (pre-release lock)", () => {
  it("stays locked until the owner releases it", () => {
    expect(REPORT_CARD_RELEASED_TO_ALL_USERS).toBe(false);
  });
  it("blocks every non-admin, non-owner user", () => {
    expect(canSeeReportCard({ isOwner: false, isAdmin: false })).toBe(false);
  });
  it("allows owner and admin", () => {
    expect(canSeeReportCard({ isOwner: true, isAdmin: false })).toBe(true);
    expect(canSeeReportCard({ isOwner: false, isAdmin: true })).toBe(true);
  });
  it("analysis page renders the toggle and card only behind the gate", () => {
    const src = readFileSync("src/pages/AnalyzeVideo.tsx", "utf8");
    expect(src).toMatch(/showReportCard\s*&&\s*\(\s*<AnalysisToggle/);
    expect(src).toMatch(/showReportCard\s*&&\s*analysisView === "report_card"/);
    expect(src).toMatch(/<ReportCardAccessGate>\s*<HammerReportCard/);
  });
});
