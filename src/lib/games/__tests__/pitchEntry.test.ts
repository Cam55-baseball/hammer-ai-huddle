import { describe, expect, it } from "vitest";
import { pitchEntryPayload } from "../pitchEntry";

describe("game pitch facts", () => {
  it("never invents a zone, count, inning, pitch number, speed or handedness", () => {
    const saved = pitchEntryPayload({ inning: "", pitch_no: "", count_balls: "", count_strikes: "", pitch_velo: "", pitcher_throws: "", batter_handedness: "" }, "pitcher", { zone: null });
    expect(saved).toMatchObject({ location: null, inning: null, pitch_no: null, count_balls: null, count_strikes: null, pitch_velo: null, pitcher_throws: null, batter_handedness: null });
  });
  it("preserves explicitly entered zero counts and a tapped location", () => {
    expect(pitchEntryPayload({ count_balls: 0, count_strikes: 2, pitch_velo: "82", inning: 3 }, "pitcher", { zone: 7 })).toMatchObject({ count_balls: 0, count_strikes: 2, pitch_velo: 82, inning: 3, location: { zone: 7 } });
  });
});