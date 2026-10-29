import { describe, it, expect } from "vitest";
import { isPlanGameDay } from "../../../supabase/functions/_shared/schedule/isGameDay";
const base = { gpGames: [], calendarGames: [], timelineGamesToday: 0, cancelled: new Set<string>() };
describe("isPlanGameDay", () => {
  it("a calendar game on the date makes it a game day", () =>
    expect(isPlanGameDay("2026-11-13", { ...base, calendarGames: [{ event_date: "2026-11-13" }] })).toBe(true));
  it("a calendar game on another date does not", () =>
    expect(isPlanGameDay("2026-11-14", { ...base, calendarGames: [{ event_date: "2026-11-13" }] })).toBe(false));
  it("ignored or cancelled games never count", () => {
    expect(isPlanGameDay("2026-11-13", { ...base, calendarGames: [{ event_date: "2026-11-13", ignored_for_training: true }] })).toBe(false);
    expect(isPlanGameDay("2026-11-13", { ...base, calendarGames: [{ event_date: "2026-11-13" }], cancelled: new Set(["2026-11-13"]) })).toBe(false);
  });
  it("Game Plan and timeline games still count", () => {
    expect(isPlanGameDay("2026-11-13", { ...base, gpGames: [{ game_date: "2026-11-13" }] })).toBe(true);
    expect(isPlanGameDay("2026-11-13", { ...base, timelineGamesToday: 1 })).toBe(true);
  });
});
