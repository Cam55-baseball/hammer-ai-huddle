import { expect, it } from "vitest";
import { analysisErrorDetails, normalizeAnalysisResponse } from "./analysisResponse";
it("replay preserves saved status without inventing persistence", () => {
  expect(normalizeAnalysisResponse({ replay_cache: true, saved: true, ai_analysis: { feedback: "Real coaching" } })).toMatchObject({ saved: true, feedback: "Real coaching" });
  expect(normalizeAnalysisResponse({ replay_cache: true, ai_analysis: { feedback: "Real coaching" } }).saved).toBe(false);
});
it("preserves terminal status and safe server reason", async () => {
  expect(await analysisErrorDetails({ context: new Response(JSON.stringify({ message: "Provider access denied" }), { status: 403 }) })).toEqual({ status: 403, message: "Provider access denied" });
});