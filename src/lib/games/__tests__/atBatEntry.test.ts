import { describe, expect, it } from "vitest";
import { atBatEntryPayload, validAtBatInning } from "../atBatEntry";

describe("explicit at-bat facts", () => {
  it("keeps all untouched optional details null", () => {
    expect(atBatEntryPayload({ inning: 3, result: "1B" })).toMatchObject({
      inning: 3, result: "1B", batting_side: null, count_balls: null, count_strikes: null,
      outs: null, rbi: null, lob: null, runners_on: null, is_pinch_hit: null,
      opponent_pitcher_id: null, contact_quality: null, h1_time_sec: null,
    });
  });
  it("preserves an explicitly entered zero and No rather than treating them as missing", () => {
    expect(atBatEntryPayload({ inning: "2", result: "BB", count_balls: 0, count_strikes: 0, outs: 0, rbi: 0, lob: 0, is_pinch_hit: false, batting_side: "L", notes: "My notes" })).toMatchObject({ inning: 2, count_balls: 0, count_strikes: 0, outs: 0, rbi: 0, lob: 0, is_pinch_hit: false, batting_side: "L", notes: "My notes" });
  });
  it("requires an explicit valid inning without guessing the previous inning", () => {
    for (const inning of [undefined, null, "", 0, 31, 1.5]) {
      expect(validAtBatInning(inning)).toBe(false);
      expect(() => atBatEntryPayload({ inning, result: "1B" })).toThrow("Enter the inning");
    }
    expect(validAtBatInning(1)).toBe(true);
    expect(validAtBatInning(30)).toBe(true);
  });
  it("requires a selected outcome", () => {
    expect(() => atBatEntryPayload({ inning: 1, result: "" })).toThrow("Choose how");
  });
  it('preserves explicit complete pitch totals and rejects invalid totals',()=>{
    expect(atBatEntryPayload({inning:1,result:'GO',pitch_count:5}).pitch_count).toBe(5);
    expect(atBatEntryPayload({inning:1,result:'GO'}).pitch_count).toBeNull();
    for(const pitch_count of [0,1.5,-1])expect(()=>atBatEntryPayload({inning:1,result:'GO',pitch_count})).toThrow();
  });
});