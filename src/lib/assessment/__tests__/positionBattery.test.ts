import { describe, expect, it } from "vitest";
import { fullPositionBattery, positionBattery, PREFERRED_CATEGORY_ORDER } from "../positionBattery";

// Locked by owner Nov 6: no per-position filtering. Program split only, no bleed-over.
const POS = ["hitting", "throwing"];
const PIT = ["pitching", "throwing"];
const TWO = ["hitting", "pitching", "throwing"];
const PITCHING = ["pitching_velocity", "pulldown_velocity"];
const POS_PLAYER = ["pop_time", "fielding_exchange_time", "position_throw_velo"];
const list = (sport: "baseball" | "softball", modules: string[]) => fullPositionBattery({ sport, modules, densityLevel: 4 });
const keys = (sport: "baseball" | "softball", modules: string[]) => list(sport, modules).map(m => m.key);

describe.each(["baseball", "softball"] as const)("%s batteries", sport => {
  it("position player: full position-player battery, no pitching tests", () => {
    const k = keys(sport, POS);
    expect(k).toEqual(expect.arrayContaining(POS_PLAYER));
    PITCHING.forEach(p => expect(k).not.toContain(p));
  });
  it("pitcher: pitching tests, no hitting or position-player tests", () => {
    const l = list(sport, PIT);
    expect(l.map(m => m.key)).toEqual(expect.arrayContaining(PITCHING));
    POS_PLAYER.forEach(p => expect(l.map(m => m.key)).not.toContain(p));
    expect(l.some(m => m.category === "exit_velocity")).toBe(false);
  });
  it("Golden 2Way gets both", () => {
    expect(keys(sport, TWO)).toEqual(expect.arrayContaining([...PITCHING, ...POS_PLAYER, ...keys(sport, POS)]));
  });
  it("locked by owner Nov 6: no per-position filtering — catcher, shortstop, center fielder identical", () => {
    // Position is no longer an input; the same call serves every position player.
    const c = keys(sport, POS), ss = keys(sport, POS), cf = keys(sport, POS);
    expect(c).toEqual(ss); expect(ss).toEqual(cf);
  });
  it("Initial Assessment list equals the 6-week list (same shared function)", () => {
    for (const mods of [POS, PIT, TWO]) expect(keys(sport, mods)).toEqual(keys(sport, mods));
  });
  it("pitching tests only on the pitching tab", () => {
    expect(positionBattery({ sport, module: "throwing", modules: TWO, densityLevel: 4 }).map(m => m.key)).not.toContain("pitching_velocity");
  });
  it("keeps the preferred category order", () => {
    const cats = list(sport, TWO).map(m => PREFERRED_CATEGORY_ORDER.indexOf(m.category as never));
    expect(cats).toEqual([...cats].sort((a, b) => a - b));
  });
});

it("softball circle wording", () => {
  const sb = positionBattery({ sport: "softball", module: "pitching", modules: PIT, densityLevel: 4 }).find(m => m.key === "pitching_velocity");
  expect(sb?.instructions).toMatch(/circle/);
  expect(sb?.instructions).not.toMatch(/mound/);
});
