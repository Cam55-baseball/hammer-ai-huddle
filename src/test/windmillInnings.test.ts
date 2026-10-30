import { describe, it, expect } from "vitest";
import { enteredInningsByDate, windmillHistory } from "../../supabase/functions/_shared/wic/pitching/windmillInnings";
import { planWindmillSession } from "../../supabase/functions/_shared/wic/pitching/windmillProgram";

const base = { planDate: "2026-11-17", phase: "in_season", age: 16, growthMode: false, readiness: 80, armPain: false, todayPitchesSoFar: 0, gameToday: false, gameTomorrow: false, priorFullSessionsThisWeek: 0, fullSessionYesterday: false } as any;

describe("windmill entered innings", () => {
  it("entered 3.0 innings with 40 pitches -> innings 3 (estimate also 3)", () => {
    const h = windmillHistory(new Map([["2026-11-16", 40]]), enteredInningsByDate([{ game_date: "2026-11-16", pitcher_innings: 3, status: "final" }]), "2026-11-17");
    expect(h[0].innings).toBe(3);
  });
  it("entered 4 innings with 40 pitches triggers next-day recovery (4+ innings rule)", () => {
    const h = windmillHistory(new Map([["2026-11-16", 40]]), enteredInningsByDate([{ game_date: "2026-11-16", pitcher_innings: 4, status: "final" }]), "2026-11-17");
    expect(h[0].innings).toBe(4);
    expect(planWindmillSession({ ...base, history: h }).type).toBe("none");
  });
  it("entered innings never lower the pitch-count estimate", () => {
    const h = windmillHistory(new Map([["2026-11-16", 60]]), enteredInningsByDate([{ game_date: "2026-11-16", pitcher_innings: 1, status: "final" }]), "2026-11-17");
    expect(h[0].innings).toBe(4);
  });
  it("draft or deleted games do not count", () => {
    expect(enteredInningsByDate([{ game_date: "2026-11-16", pitcher_innings: 5, status: "draft" }, { game_date: "2026-11-16", pitcher_innings: 5, status: "final", deleted_at: "x" }]).size).toBe(0);
  });
});
