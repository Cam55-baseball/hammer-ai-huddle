import { describe, it, expect } from "vitest";
import { recentLoadEffect } from "../../supabase/functions/_shared/wic/recovery/recentLoad";
import { selectConditioning } from "../../supabase/functions/_shared/wic/conditioning/selectConditioning";
import { athleteNoticeCopy } from "@/lib/hammer/notices/athleteNoticeCopy";

const MON = "2026-10-12";
const g = (d: string, extra: Record<string, unknown> = {}) => ({ game_date: d, status: "final", ...extra });
const none = { planDate: MON, games: [], practices: [], outingDates: [] };

describe("Stage 4 — recent game and practice load", () => {
  it("no records → no effect", () => {
    expect(recentLoadEffect(none).applied).toBe(false);
  });
  it("three-game weekend → lighter Monday, one step, dated evidence", () => {
    const e = recentLoadEffect({ ...none, games: [g("2026-10-09"), g("2026-10-10"), g("2026-10-11")] });
    expect(e.applied).toBe(true);
    expect(e.evidenceDates).toEqual(["2026-10-09", "2026-10-10", "2026-10-11"]);
    expect(e.reason).not.toMatch(/\d/);
  });
  it("one game alone is a normal week — no change", () => {
    expect(recentLoadEffect({ ...none, games: [g("2026-10-11")] }).applied).toBe(false);
  });
  it("duplicated logs on one date count at most two", () => {
    expect(recentLoadEffect({ ...none, games: [g("2026-10-11"), g("2026-10-11"), g("2026-10-11"), g("2026-10-11")] }).games).toBe(2);
  });
  it("doubleheader yesterday counts twice", () => {
    expect(recentLoadEffect({ ...none, games: [g("2026-10-11", { is_doubleheader: true })] }).applied).toBe(true);
  });
  it("unlogged, deleted, ignored or scheduled games never count", () => {
    const e = recentLoadEffect({ ...none, games: [
      g("2026-10-10", { status: "scheduled" }), g("2026-10-11", { status: null }),
      g("2026-10-09", { deleted_at: "x" }), g("2026-10-11", { ignored_for_training: true }),
    ] });
    expect(e.applied).toBe(false);
  });
  it("games outside the window or on/after plan date don't count", () => {
    expect(recentLoadEffect({ ...none, games: [g("2026-10-08"), g("2026-10-12"), g("2026-10-13")] }).applied).toBe(false);
  });
  it("game + team practice stack; cancelled and light practices don't", () => {
    expect(recentLoadEffect({ ...none, games: [g("2026-10-10")], practices: [{ scheduled_date: "2026-10-11", status: "scheduled", practice_kind: "team" }] }).applied).toBe(true);
    expect(recentLoadEffect({ ...none, games: [g("2026-10-10")], practices: [{ scheduled_date: "2026-10-11", status: "canceled", practice_kind: "team" }] }).applied).toBe(false);
    expect(recentLoadEffect({ ...none, games: [g("2026-10-10")], practices: [{ scheduled_date: "2026-10-11", status: "scheduled", intensity: "light", practice_kind: "team" }] }).applied).toBe(false);
  });
  it("two hard practices back to back count; two ordinary ones don't", () => {
    const hard = [{ scheduled_date: "2026-10-10", status: "scheduled", practice_kind: "team" }, { scheduled_date: "2026-10-11", status: "scheduled", practice_kind: "team" }];
    expect(recentLoadEffect({ ...none, practices: hard }).applied).toBe(true);
    expect(recentLoadEffect({ ...none, practices: hard.map((p) => ({ ...p, practice_kind: "solo", intensity: "standard" })) }).applied).toBe(false);
  });
  it("a confirmed outing counts as a game; same date as a logged game isn't double counted", () => {
    expect(recentLoadEffect({ ...none, games: [g("2026-10-10")], outingDates: ["2026-10-11"] }).applied).toBe(true);
    expect(recentLoadEffect({ ...none, games: [g("2026-10-11")], outingDates: ["2026-10-11"] }).applied).toBe(false);
  });
  it("conditioning says why in plain words when only recent load dialled it down", () => {
    const s = selectConditioning({ sport: "baseball", position: "SS", phase: "off_season", isTournamentDay: false, hoursToNearestGame: null,
      pitcherStartedYesterday: false, isPitcher: false, returningAfterGap: false, dialDownReasons: ["recent_load"] } as any);
    if (s.dialedDown) expect(s.why).toMatch(/busy few days/);
  });
  it("athlete notice shows the plain reason", () => {
    const e = recentLoadEffect({ ...none, games: [g("2026-10-10"), g("2026-10-11")] });
    expect(athleteNoticeCopy({ reason: "recent_load", detail: e.reason! })).toBe(e.reason);
  });
});
