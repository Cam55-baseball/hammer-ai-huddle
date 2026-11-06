import { describe, expect, it } from "vitest";
import { fullPositionBattery, positionBattery, PREFERRED_CATEGORY_ORDER } from "../positionBattery";

// Locked by owner Nov 6: Initial Assessment athletic test === 6-week battery, position-specific.
const POS = ["hitting", "throwing"];
const PIT = ["pitching", "throwing"];
const TWO = ["hitting", "pitching", "throwing"];
const keys = (sport: "baseball" | "softball", modules: string[], position: string) =>
  fullPositionBattery({ sport, modules, position, densityLevel: 4 }).map(m => m.key);
const POSITION_ONLY = ["pop_time", "fielding_exchange_time", "position_throw_velo", "pitching_velocity", "pulldown_velocity"];
const only = (k: string[]) => k.filter(x => POSITION_ONLY.includes(x)).sort();

describe.each(["baseball", "softball"] as const)("%s position batteries", sport => {
  it("catcher gets pop time, exchange and position throw; no pitching", () => {
    expect(only(keys(sport, POS, "C"))).toEqual(["fielding_exchange_time", "pop_time", "position_throw_velo"]);
  });
  it("shortstop gets infield tests, never pop time", () => {
    expect(only(keys(sport, POS, "SS"))).toEqual(["fielding_exchange_time", "position_throw_velo"]);
  });
  it("center fielder gets outfield throw only", () => {
    expect(only(keys(sport, POS, "CF"))).toEqual(["position_throw_velo"]);
  });
  it("starting pitcher (Complete Pitcher) gets pitching tests, no position-player throw tests or hitting", () => {
    const k = keys(sport, PIT, "P");
    expect(only(k)).toEqual(["pitching_velocity", "pulldown_velocity"]);
    expect(k).not.toContain("tee_exit_velocity");
  });
  it("Golden 2Way shortstop gets the shortstop battery plus pitching tests", () => {
    expect(only(keys(sport, TWO, "SS"))).toEqual(["fielding_exchange_time", "pitching_velocity", "position_throw_velo", "pulldown_velocity"]);
    expect(keys(sport, TWO, "SS")).toEqual(expect.arrayContaining(keys(sport, POS, "SS")));
  });
  it("pitching tests never appear outside the pitching tab", () => {
    expect(positionBattery({ sport, module: "throwing", modules: TWO, position: "P", densityLevel: 4 }).map(m => m.key)).not.toContain("pitching_velocity");
  });
  it("keeps the preferred category order", () => {
    const cats = fullPositionBattery({ sport, modules: TWO, position: "C", densityLevel: 4 }).map(m => PREFERRED_CATEGORY_ORDER.indexOf(m.category as never));
    expect(cats).toEqual([...cats].sort((a, b) => a - b));
  });
  it("a position change changes the next battery", () => {
    expect(keys(sport, POS, "C")).not.toEqual(keys(sport, POS, "CF"));
  });
});

describe("sport distances and wording", () => {
  it("softball uses the 7-yard dash and circle wording; baseball 10-yard and mound", () => {
    expect(keys("softball", POS, "SS")).toContain("seven_yard_dash");
    expect(keys("softball", POS, "SS")).not.toContain("ten_yard_dash");
    expect(keys("baseball", POS, "SS")).toContain("ten_yard_dash");
    const sb = positionBattery({ sport: "softball", module: "pitching", modules: PIT, position: "P", densityLevel: 4 }).find(m => m.key === "pitching_velocity");
    expect(sb?.instructions).toMatch(/circle/);
    expect(sb?.instructions).not.toMatch(/mound/);
  });
});
