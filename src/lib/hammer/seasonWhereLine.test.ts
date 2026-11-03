import { describe, expect, it } from "vitest";
import { seasonWhereLine } from "./seasonWhereLine";

describe("Update Hammer 'where you are now' line", () => {
  it("off-season with a known start", () => expect(seasonWhereLine("off_season", { in_season_start_date: "2027-03-01" }, "2026-11-03")).toBe("Off-season — season starts Mar 1"));
  it("in-season with a known end", () => expect(seasonWhereLine("in_season", { in_season_end_date: "2026-11-20" }, "2026-11-03")).toBe("In-season — ends Nov 20"));
  it("nothing known", () => expect(seasonWhereLine(null, null, "2026-11-03")).toBe("Season dates not known yet"));
  it("a past date is not shown as upcoming", () => expect(seasonWhereLine("off_season", { in_season_start_date: "2026-03-01" }, "2026-11-03")).toBe("Off-season — season dates not known yet"));
});
