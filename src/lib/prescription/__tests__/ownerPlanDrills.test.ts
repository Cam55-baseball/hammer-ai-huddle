import { describe, it, expect, beforeEach } from "vitest";
import { setOwnerPlanDrills, mergeOwnerSlotDrills, missingForPlacement, eligibleFor } from "../ownerPlanDrills";
import type { OwnerDrillRow } from "../ownerDrills";

const row = (o: Partial<OwnerDrillRow>): OwnerDrillRow => ({
  id: "a", overrides_drill_id: null, placements: ["hammers_today:skill", "analysis:baseball:hitting"], sports: ["baseball"],
  name: "Owner tee drill", fault_keys: [], phase: null, level: null, dosage: "3 x 8", setup: "Tee at the front hip", steps: [],
  cue: "stay through it", feel: null, feel_wrong: null, common_mistake: null, equipment: [], video_url: null,
  active: true, pinned: false, created_at: "2026-10-01", ...o,
});
const base = [{ name: "A", dosage: "1" }, { name: "B", dosage: "2" }, { name: "C", dosage: "3" }];

describe("owner plan drills", () => {
  beforeEach(() => setOwnerPlanDrills([]));

  it("skill drill takes exactly one slot in the matching skill block", () => {
    setOwnerPlanDrills([row({})]);
    const out = mergeOwnerSlotDrills(base, ["hammers_today:skill"], { sport: "baseball", skill: "hitting" });
    expect(out).toHaveLength(3);
    expect(out[2].name).toBe("Owner tee drill");
    expect(mergeOwnerSlotDrills(base, ["hammers_today:skill"], { sport: "baseball", skill: "throwing" })).toEqual(base);
  });

  it("warm-up drill serves the warm-up", () => {
    setOwnerPlanDrills([row({ placements: ["hammers_today:warmup"] })]);
    expect(mergeOwnerSlotDrills(base, ["hammers_today:warmup"], { sport: "baseball" })[2].name).toBe("Owner tee drill");
  });

  it("every declared condition must hold", () => {
    const ctx = { sport: "baseball", skill: "hitting" as const };
    expect(eligibleFor(row({ active: false }), ["hammers_today:skill"], ctx)).toBe(false);
    expect(eligibleFor(row({ sports: ["softball"] }), ["hammers_today:skill"], ctx)).toBe(false);
    expect(eligibleFor(row({ equipment: ["tee"] }), ["hammers_today:skill"], { ...ctx, owned: new Set() })).toBe(false);
    expect(eligibleFor(row({ equipment: ["Tee"] }), ["hammers_today:skill"], { ...ctx, owned: new Set(["tee"]) })).toBe(true);
    expect(eligibleFor(row({ cue: "" }), ["hammers_today:skill"], ctx)).toBe(false);
  });

  it("reports what a placement still needs", () => {
    expect(missingForPlacement(row({ placements: ["hammers_today:skill"], dosage: "", setup: "", sports: [] }), "hammers_today:skill"))
      .toEqual(["a dose", "a sport", "which skill (tick a hitting, throwing or pitching analysis)", "set-up or steps"]);
  });

  it("rotates by day so no drill monopolises", () => {
    setOwnerPlanDrills([row({ id: "a", name: "X" }), row({ id: "b", name: "Y" })]);
    const names = [0, 1].map((d) => mergeOwnerSlotDrills(base, ["hammers_today:skill"], { sport: "baseball", skill: "hitting", day: new Date(d * 86_400_000) })[2].name);
    expect(new Set(names).size).toBe(2);
  });
});
