import { expect, it } from "vitest";
import { analysisErrorDetails, normalizeAnalysisResponse } from "./analysisResponse";
it("replay preserves saved status without inventing persistence", () => {
  expect(normalizeAnalysisResponse({ replay_cache: true, saved: true, ai_analysis: { feedback: "Real coaching" } })).toMatchObject({ saved: true, feedback: "Real coaching" });
  expect(normalizeAnalysisResponse({ replay_cache: true, ai_analysis: { feedback: "Real coaching" } }).saved).toBe(false);
});
it("preserves terminal status and safe server reason", async () => {
  expect(await analysisErrorDetails({ context: new Response(JSON.stringify({ message: "Provider access denied" }), { status: 403 }) })).toEqual({ status: 403, message: "Provider access denied" });
});
it("retains the saved Not measured report on a terminal provider failure", async () => {
  const result = await analysisErrorDetails({ context: new Response(JSON.stringify({ message: "Provider access denied", saved: true, report: { feedback: "Not measured", report_status: "not_measured", summary: ["Not measured"], drills: [] } }), { status: 403 }) });
  expect(result.status).toBe(403);
  expect(result.report).toMatchObject({ saved: true, feedback: "Not measured" });
});
it("displays a saved refusal report without offering another provider attempt", async () => {
  const result = await analysisErrorDetails({ context: new Response(JSON.stringify({ saved: true, message: "No findings were generated", report: { feedback: "No findings were generated", report_status: "not_measured", retry_allowed: false } }), { status: 422 }) });
  expect(result.status).toBe(422);
  expect(result.report).toMatchObject({ saved: true, report_status: "not_measured", retry_allowed: false });
});