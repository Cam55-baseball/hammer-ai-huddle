import { describe, it, expect } from "vitest";
import { cleanDetails, emptyDetails, hasDetails } from "./coachGameDetails";

describe("coach Add more details (owner Nov 5 round 2)", () => {
  it("is optional: nothing entered saves nothing", () => {
    const r = cleanDetails(emptyDetails());
    expect(r.error).toBeNull();
    expect(hasDetails(r.details)).toBe(false);
  });
  it("keeps the pitching line, lineup spot, innings, positions and notes", () => {
    const r = cleanDetails({ values: { lineup_slot: "3", innings_played: "6.5", pitcher_strikeouts: "7", pitcher_runs: "2", pitcher_earned_runs: "1" }, positions: ["SS", "P", "bogus"], home_away: "away", game_type: "tournament", venue: " Field 4 ", notes: "Great hustle" });
    expect(r.error).toBeNull();
    expect(r.details).toEqual({ lineup_slot: 3, innings_played: 6.5, pitcher_strikeouts: 7, pitcher_runs: 2, pitcher_earned_runs: 1, my_positions: ["SS", "P"], home_away: "away", game_type: "tournament", venue: "Field 4", general_notes: "Great hustle" });
  });
  it("blank boxes are never saved as zero", () => {
    expect(cleanDetails({ values: { pitcher_walks: "", lineup_slot: " " } }).details).toEqual({});
  });
  it("rejects a lineup spot outside 1–12", () => {
    expect(cleanDetails({ values: { lineup_slot: "13" } }).error).toMatch(/Lineup spot/);
    expect(cleanDetails({ values: { lineup_slot: "0" } }).error).toMatch(/Lineup spot/);
  });
  it("rejects earned runs above runs allowed", () => {
    expect(cleanDetails({ values: { pitcher_runs: "1", pitcher_earned_runs: "2" } }).error).toMatch(/Earned runs/);
  });
  it("rejects unknown home/away and game type values silently (not saved)", () => {
    expect(cleanDetails({ values: {}, home_away: "space", game_type: "x" }).details).toEqual({});
  });
});
