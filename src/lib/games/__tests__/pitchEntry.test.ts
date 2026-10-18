import { describe, expect, it } from "vitest";
import { pitchEntryPayload, quickAtBatPayload } from "../pitchEntry";

describe("game pitch facts", () => {
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