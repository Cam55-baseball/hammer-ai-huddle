import { describe, expect, it } from "vitest";
import { pitchEntryPayload, quickAtBatPayload } from "../pitchEntry";

describe("game pitch facts", () => {
  it("stores pitcher observations and intent separately from actual location", () => {
    expect(pitchEntryPayload({ result: "in_play", contact: "hard", spray: "pull_ground", hard_hit: true, notes: "My observation" }, "pitcher", { zone: 7 }, { zone: 3 })).toMatchObject({ contact_quality: "hard", spray_bucket: "pull_ground", hard_hit: true, intent_location: { zone: 3 }, location: { zone: 7 }, notes: "My observation" });
  });
  it("keeps unentered hard contact unknown and preserves an explicit no", () => {
    expect(pitchEntryPayload({ result: "in_play", hard_hit: "" }, "pitcher", { zone: null }).hard_hit).toBeNull();
    expect(pitchEntryPayload({ result: "in_play", hard_hit: false }, "pitcher", { zone: null }).hard_hit).toBe(false);
  });
  it("does not save hidden contact or intent selections for another result or perspective", () => {
    expect(pitchEntryPayload({ result: "ball", contact: "hard", spray: "pull_ground", hard_hit: true }, "pitcher", { zone: null })).toMatchObject({ contact_quality: null, spray_bucket: null, hard_hit: null, intent_location: null });
    expect(pitchEntryPayload({ result: "in_play", contact: "hard", hard_hit: true }, "hitter", { zone: null }, { zone: 3 })).toMatchObject({ contact_quality: null, hard_hit: null, intent_location: null });
  });
  it("does not turn blank or invalid numeric input into a measurement", () => {
    expect(pitchEntryPayload({ pitch_velo: "  ", inning: "unknown" }, "pitcher", { zone: null })).toMatchObject({ pitch_velo: null, inning: null });
  });
  it("records only an explicitly tapped ball-in-play direction", () => {
    expect(quickAtBatPayload(2, "1B", "LF")).toEqual({ inning: 2, result: "1B", exit_direction: "LF" });
    expect(quickAtBatPayload(2, "GO", null).exit_direction).toBeNull();
  });
  it("never attaches a ball-in-play direction to a walk or strikeout", () => {
    expect(quickAtBatPayload(2, "BB", "LF").exit_direction).toBeNull();
    expect(quickAtBatPayload(2, "K_swinging", "CF").exit_direction).toBeNull();
  });
  it("never invents a zone, count, inning, pitch number, speed or handedness", () => {
    const saved = pitchEntryPayload({ inning: "", pitch_no: "", count_balls: "", count_strikes: "", pitch_velo: "", pitcher_throws: "", batter_handedness: "" }, "pitcher", { zone: null });
    expect(saved).toMatchObject({ location: null, inning: null, pitch_no: null, count_balls: null, count_strikes: null, pitch_velo: null, pitcher_throws: null, batter_handedness: null });
  });
  it("preserves explicitly entered zero counts and a tapped location", () => {
    expect(pitchEntryPayload({ count_balls: 0, count_strikes: 2, pitch_velo: "82", inning: 3 }, "pitcher", { zone: 7 })).toMatchObject({ count_balls: 0, count_strikes: 2, pitch_velo: 82, inning: 3, location: { zone: 7 } });
  });
});