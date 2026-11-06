import { describe, it, expect } from "vitest";
import { validateLineup, draftFrom, gameSpots, withLineupSpot, positionsFor, type DraftRow } from "./savedLineups";
import { cleanDetails, emptyDetails } from "./coachGameDetails";

const connected = [{ id: "a", name: "Ava" }, { id: "b", name: "Ben" }];
const ids = new Set(["a", "b"]);
const rows: DraftRow[] = [
  { athlete_id: "a", name: "Ava", jersey: "7", included: true, position: "SS", order: "1" },
  { athlete_id: "b", name: "Ben", jersey: "12", included: true, position: "FLEX", order: "4" },
];

describe("lineup positions (owner Nov 6)", () => {
  it("sport-correct lists: softball adds DP/Flex, baseball doesn't", () => {
    expect(positionsFor("baseball")).toEqual(["P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH"]);
    expect(positionsFor("softball")).toContain("DP");
    expect(validateLineup("V", rows, ids, "baseball").error).toMatch(/Flex isn't a baseball position/);
  });
  it("blocks duplicate batting spots", () => {
    expect(validateLineup("V", rows.map((r) => ({ ...r, order: "2" })), ids, "softball").error).toMatch(/both bat #2/);
  });
  it("saved lineup stores position/order and they come back", () => {
    const { players, error } = validateLineup("V", rows, ids, "softball");
    expect(error).toBeNull();
    expect(players).toEqual([{ athlete_id: "a", jersey: "7", position: "SS", batting_order: 1 }, { athlete_id: "b", jersey: "12", position: "FLEX", batting_order: 4 }]);
    const back = draftFrom(connected, players);
    expect(back.map((r) => [r.position, r.order])).toEqual([["SS", "1"], ["FLEX", "4"]]);
  });
  it("position and order save with each player's game line", () => {
    const spots = gameSpots(rows);
    const d = cleanDetails(withLineupSpot(emptyDetails(), spots.a));
    expect(d.details).toEqual({ my_positions: ["SS"], lineup_slot: 1 });
    // A player's own entered details still win.
    const own = cleanDetails(withLineupSpot({ ...emptyDetails(), positions: ["P"], values: { lineup_slot: "9" } }, spots.a));
    expect(own.details).toMatchObject({ my_positions: ["P"], lineup_slot: 9 });
  });
});
