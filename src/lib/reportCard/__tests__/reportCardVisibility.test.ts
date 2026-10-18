import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { canSeeReportCard, REPORT_CARD_RELEASED_TO_ALL_USERS } from "../visibility";

describe("report card visibility (released Oct 18)", () => {
  it("is released to everyone by the owner", () => {
    expect(REPORT_CARD_RELEASED_TO_ALL_USERS).toBe(true);
  });
  it("shows to players who are neither owner nor admin", () => {
    expect(canSeeReportCard({ isOwner: false, isAdmin: false })).toBe(true);
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
