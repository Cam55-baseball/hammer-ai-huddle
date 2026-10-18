import { describe, expect, it } from "vitest";
import { hasReadableReport, hasStructuredAnalysis, reliableAnalysis, unavailableAnalysis } from "../../../supabase/functions/_shared/analysisReliability";
const valid = { choices: [{ message: { tool_calls: [{ function: { arguments: JSON.stringify({ feedback: "Visible movement", summary: ["Clip checked"], efficiency_score: 0, drills: [] }) } }] } }] };
describe("analysis completion", () => {
  it("refuses empty or unreadable stored reports for replay", () => {
    for (const report of [null, {}, [], { summary: [], feedback: "Checked", drills: [] },
      { summary: ["Checked"], feedback: "  ", drills: [] }, { summary: ["  "], feedback: "Checked", drills: [] },
      { summary: ["Checked"], feedback: "Checked" }]) {
      expect(hasReadableReport(report)).toBe(false);
    }
  });
  it("accepts readable stored coaching without inventing a score", () => {
    expect(hasReadableReport({ summary: ["Clip checked"], feedback: "Visible movement", drills: [] })).toBe(true);
  });
  it("preserves honest missing-measurement reports as readable results", () => {
    expect(hasReadableReport(unavailableAnalysis("throwing", "pose"))).toBe(true);
  });
  it("never invents measurements or grades when a stage fails", () => {
    for (const sport of ["baseball", "softball"]) for (const type of ["hitting", "pitching", "throwing"]) {
      const report = unavailableAnalysis(type, `${sport}:pose`);
      expect(report.efficiency_score).toBeNull(); expect(report.metrics).toBeNull();
      expect(report.feedback.length).toBeGreaterThan(0); expect(report.report_status).toBe("not_measured"); expect(report.improvements).toEqual([]);
    }
  });
  it("accepts a real zero rather than replacing it with a default", () => expect(hasStructuredAnalysis(valid)).toBe(true));
  it("retries empty output then uses a backup model and records all attempts", async () => {
    const models: string[] = []; const logs: unknown[] = [];
    const result = await reliableAnalysis(async (model) => { models.push(model); return { ok: true, status: 200, data: models.length === 3 ? valid : {} }; }, async (r) => { logs.push(r); });
    expect(models).toEqual(["google/gemini-2.5-flash", "google/gemini-2.5-flash", "openai/gpt-4o-mini"]);
    expect(logs).toHaveLength(3); expect(hasStructuredAnalysis(result.data)).toBe(true);
  });
  it("does not retry authorization or billing failures", async () => {
    for (const status of [401, 402, 403]) {
      let calls = 0; await reliableAnalysis(async () => { calls++; return { ok: false, status, data: {} }; }, async () => {});
      expect(calls).toBe(1);
    }
  });
  it("does not accept malformed report JSON as a successful report", () => {
    expect(hasStructuredAnalysis({ choices: [{ message: { tool_calls: [{ function: { arguments: "not json" } }] } }] })).toBe(false);
  });
  it("still retries and returns the backup report when diagnostic storage fails", async () => {
    const models: string[] = [];
    const result = await reliableAnalysis(async (model) => {
      models.push(model);
      return { ok: true, status: 200, data: models.length === 3 ? valid : {} };
    }, async () => { throw new Error("diagnostic storage unavailable"); });
    expect(models).toEqual(["google/gemini-2.5-flash", "google/gemini-2.5-flash", "openai/gpt-4o-mini"]);
    expect(hasStructuredAnalysis(result.data)).toBe(true);
  });
});