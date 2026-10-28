import { describe, expect, it } from "vitest";
import { displayableReport, hasCoachingContent, settleAnalysisReport } from "./analysisResponse";

const coaching = { summary: ["Your hands pass your back elbow early."], feedback: "In Phase 1 …", drills: [{ title: "Elbow first" }] };
const db = (row: any) => ({ from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: row }) }) }) }) }) });

describe("report screen shows coaching whenever it exists", () => {
  it("a 'Not measured' stand-in is not coaching", () => {
    expect(hasCoachingContent({ summary: ["Hitting report: Not measured."], feedback: "Not measured: this clip could not be fully checked." })).toBe(false);
  });
  it("coaching with a not_measured flag drops the flag", () => {
    expect(displayableReport({ ...coaching, report_status: "not_measured" }).report_status).toBeUndefined();
  });
  it("an unconfirmed reply is replaced by the saved coaching, marked saved", async () => {
    const out = await settleAnalysisReport(db({ status: "completed", ai_analysis: coaching }), "v", "u", { ...coaching, saved: false });
    expect(out.saved).toBe(true);
    expect(out.summary[0]).toBe(coaching.summary[0]);
  });
  it("a lost or 'Not measured' reply shows the saved coaching", async () => {
    const out = await settleAnalysisReport(db({ status: "completed", ai_analysis: coaching }), "v", "u", null);
    expect(out.drills).toHaveLength(1);
  });
  it("keeps the honest stand-in only when nothing was saved", async () => {
    const out = await settleAnalysisReport(db(null), "v", "u", { summary: ["Hitting report: Not measured."], saved: false });
    expect(out.saved).toBe(false);
  });
});
