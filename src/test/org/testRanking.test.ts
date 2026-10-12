import { describe, it, expect } from "vitest";
import { rankRows, rankingWarnings, type TestRankRow, type RankFilters } from "@/lib/org/testRanking";

const today = new Date("2026-10-12T12:00:00Z");
const base: RankFilters = { ageGroup: "all", position: "all", level: "all", verifiedOnly: false, lowerIsBetter: false };
const row = (o: Partial<TestRankRow>): TestRankRow => ({
  athlete_id: "a", name: "A", primary_position: "SS", league_tier: "hs", date_of_birth: "2010-01-01",
  value: 10, test_date: "2026-10-01", verified: false, ...o,
});

describe("test ranking", () => {
  it("lower-is-better puts the smallest time first", () => {
    const r = rankRows([row({ athlete_id: "a", value: 7.4 }), row({ athlete_id: "b", value: 7.1 })], { ...base, lowerIsBetter: true }, today);
    expect(r.map((x) => x.athlete_id)).toEqual(["b", "a"]);
  });
  it("higher-is-better puts the biggest number first", () => {
    const r = rankRows([row({ athlete_id: "a", value: 90 }), row({ athlete_id: "b", value: 95 })], base, today);
    expect(r[0].athlete_id).toBe("b");
  });
  it("verified only drops athlete-entered results", () => {
    const r = rankRows([row({ athlete_id: "a", verified: true }), row({ athlete_id: "b" })], { ...base, verifiedOnly: true }, today);
    expect(r.map((x) => x.athlete_id)).toEqual(["a"]);
  });
  it("age group 14-15 keeps only 14 and 15 year olds", () => {
    const r = rankRows([row({ athlete_id: "a", date_of_birth: "2012-01-01" }), row({ athlete_id: "b", date_of_birth: "2010-06-01" })], { ...base, ageGroup: "14-15" }, today);
    expect(r.map((x) => x.athlete_id)).toEqual(["a"]);
  });
  it("one player = not enough data", () => {
    expect(rankingWarnings([row({})], today)[0]).toMatch(/Not enough data yet/);
  });
  it("mixed verification and 2+ year age gap are warned", () => {
    const w = rankingWarnings([row({ verified: true, date_of_birth: "2013-01-01" }), row({ date_of_birth: "2010-01-01" })], today);
    expect(w.some((x) => /not verified/.test(x))).toBe(true);
    expect(w.some((x) => /2 or more years/.test(x))).toBe(true);
  });
});
