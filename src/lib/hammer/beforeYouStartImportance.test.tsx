import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { bysLevel, BYS_ITEMS } from "./beforeYouStartImportance";
import { Bys, groupByLevel } from "@/components/hammer/BeforeYouStartSection";

describe("Before you start importance map", () => {
  it("owner's saved level wins", () => expect(bysLevel("coach_advice", { coach_advice: 3 })).toBe(3));
  it("unassigned items show in Level 2", () => {
    expect(bysLevel("royal_timing", {})).toBe(2);
    expect(bysLevel("something_new", null)).toBe(2);
  });
  it("an invalid saved value falls back, never drops the item", () => expect(bysLevel("royal_timing", { royal_timing: 7 })).toBe(2));
  it("items group into Level 1 → 2 → 3, none lost", () => {
    const g = groupByLevel([<Bys key="a" id="daily_intent">a</Bys>, <Bys key="b" id="royal_timing">b</Bys>, <Bys key="c" id="day_notices">c</Bys>], { day_notices: 3 });
    expect([g[1].length, g[2].length, g[3].length]).toEqual([1, 1, 1]);
  });
  it("every inventory item has a unique id", () => expect(new Set(BYS_ITEMS.map((i) => i.id)).size).toBe(BYS_ITEMS.length));
});
