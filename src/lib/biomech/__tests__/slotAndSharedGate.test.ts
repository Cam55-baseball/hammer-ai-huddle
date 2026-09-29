import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { LOW_SLOT_BANNED, LOW_SLOT_CUE_TEXT, applySlotEmphasis } from "@/lib/reportCard/slotEmphasis";
import { getReportCardSpec } from "@/lib/reportCard";

describe("shared release gate + arm slot", () => {
  it("one hands-apart implementation, used by both cards; no overhand check", () => {
    const p = readFileSync("src/lib/biomech/metrics/pitchingTiles.ts", "utf8");
    const t = readFileSync("src/lib/biomech/metrics/throwingTiles.ts", "utf8");
    expect(p).toMatch(/handsApartAtRelease/);
    expect(t).toMatch(/handsApartAtRelease/);
    expect(p).not.toMatch(/throwing_wrist_below_shoulder/);
    expect(t).not.toMatch(/const HANDS_APART_MIN_FOREARMS/);
  });
  it("low-slot cues never say get on top / raise the elbow and never contain numbers", () => {
    for (const line of LOW_SLOT_CUE_TEXT) {
      for (const b of LOW_SLOT_BANNED) expect(line).not.toMatch(b);
      expect(line).not.toMatch(/\d/);
    }
  });
  it("low slot moves shoulders-wait and front-foot-in-line to the top of throwing", () => {
    const spec = applySlotEmphasis(getReportCardSpec("baseball", "throwing")!, "low", "baseball");
    expect(spec.tiles.slice(0, 2).map((t) => t.key)).toEqual(["trunk_rotation_before_foot_contact", "stride_foot_direction"]);
    const same = applySlotEmphasis(getReportCardSpec("baseball", "throwing")!, "high", "baseball");
    expect(same.tiles[1].key).toBe("horizontal_abduction_at_foot_contact");
  });
});
