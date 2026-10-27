import { describe, expect, it } from "vitest";
import { hasFullCoachingReport, reliableAnalysis, unavailableAnalysis } from "../../../supabase/functions/_shared/analysisReliability";
import { VISIBLE_COACHING_CONTRACT } from "../../../supabase/functions/analyze-video/visibleCoaching";

const call = (r: object) => ({ ok: true, status: 200, data: { choices: [{ message: { tool_calls: [{ function: { arguments: JSON.stringify(r) } }] } }] } });
const thin = { feedback: "I couldn't judge your swing from these frames.", summary: ["I couldn't judge your swing."], drills: [], improvements: [], positives: [] };
const full = { feedback: "Your setup is balanced; your hands drift early.", summary: ["Balanced setup"], positives: ["Balanced setup"], improvements: [{ fault: "hands drift" }], drills: [{ title: "Pause at plant" }] };

describe("owner rule: every analysable upload gets a full coaching report", () => {
  it("a refusal-style or 'Not measured' report is never a full report", () => {
    expect(hasFullCoachingReport(thin)).toBe(false);
    expect(hasFullCoachingReport(unavailableAnalysis("hitting", "analysis"))).toBe(false);
    expect(hasFullCoachingReport(full)).toBe(true);
  });
  it("a thin first answer is retried until a full report arrives", async () => {
    let n = 0;
    const r = await reliableAnalysis(async () => (++n === 1 ? call(thin) : call(full)), async () => {}, async () => {});
    expect(n).toBe(2);
    expect(hasFullCoachingReport(JSON.parse((r.data as any).choices[0].message.tool_calls[0].function.arguments))).toBe(true);
  });
  it("if every attempt is thin, the readable coaching is kept rather than thrown away", async () => {
    const r = await reliableAnalysis(async () => call(thin), async () => {}, async () => {});
    expect(r.ok).toBe(true);
  });
  it("the coaching instructions forbid numbers and refusals", () => {
    expect(VISIBLE_COACHING_CONTRACT).toMatch(/Never state or hint at angles/);
    expect(VISIBLE_COACHING_CONTRACT).toMatch(/Never refuse/);
  });
});
