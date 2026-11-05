import { describe, it, expect } from "vitest";
import { defensivePrepTriggers } from "./defensivePrepTrigger";
const now = Date.parse("2026-11-05T12:00:00Z");
const sig = (o: any) => ({ id: "x", user_id: "u", root_pattern_id: "r", confidence: 1, severity: 0.5, evidence: "", discipline: "fielding", sample_size: 1, source: "video_analysis", fault_key: "booted_ball", observed_at: "2026-11-01T00:00:00Z", ...o });
describe("locked by owner Nov 5: defensive prep video triggers", () => {
  it("no signals → never shows", () => expect(defensivePrepTriggers([], now)).toEqual([]));
  it("old findings (owner's Sep 8 booted ball) → never shows", () =>
    expect(defensivePrepTriggers([sig({ source: "game_hub", sample_size: 2, observed_at: "2026-09-08T00:00:00Z" })], now)).toEqual([]));
  it("one clip finding is not recurring", () => expect(defensivePrepTriggers([sig({})], now)).toEqual([]));
  it("recurring clip finding triggers with personal line", () => {
    const t = defensivePrepTriggers([sig({}), sig({ id: "y" })], now);
    expect(t[0].faultKey).toBe("booted_ball"); expect(t[0].because).toContain("2 times in your clips");
  });
  it("logged game issue triggers", () => expect(defensivePrepTriggers([sig({ source: "game_hub" })], now)[0].because).toContain("logged games"));
  it("practice log issue triggers", () => expect(defensivePrepTriggers([sig({ source: "log_trend" })], now)[0].because).toContain("practice logs"));
  it("non-fielding never triggers", () => expect(defensivePrepTriggers([sig({ discipline: "hitting", source: "game_hub" })], now)).toEqual([]));
});
