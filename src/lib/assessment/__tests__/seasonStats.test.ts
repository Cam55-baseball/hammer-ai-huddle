import { describe, expect, it } from "vitest";
import { parseSeasonStats } from "../seasonStats";
describe("optional last-season answers", () => {
  it("keeps blanks missing instead of inventing zero", () => {
    expect(parseSeasonStats({ games: "", hits: "  ", at_bats: "0" })).toEqual({ at_bats: 0 });
  });
  it("keeps entered values without estimating", () => {
    expect(parseSeasonStats({ games: "24", hits: "15", innings_pitched: "12.1" })).toEqual({ games: 24, hits: 15, innings_pitched: 12.1 });
  });
  it("does not save invalid or negative answers", () => {
    expect(parseSeasonStats({ hits: "-1" })).toBeNull();
    expect(parseSeasonStats({ hits: "NaN" })).toBeNull();
    expect(parseSeasonStats({ hits: "Infinity" })).toBeNull();
  });
});