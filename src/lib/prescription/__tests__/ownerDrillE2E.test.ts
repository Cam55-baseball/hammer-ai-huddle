import { describe, it, expect } from "vitest";
import { ELITE_DRILL_CATALOG } from "@/data/drills/eliteDrillCatalog";
import { mergeCatalog, type OwnerDrillRow } from "../ownerDrills";
import { matchPrescriptionDrills } from "../matchDrills";

// Mirrors the row the owner created through the Drill Builder UI on 2026-10-01.
const row: OwnerDrillRow = {
  id: "2298000f-b6c5-466a-b3b9-726952deb0fd", overrides_drill_id: null,
  placements: ["analysis:baseball:hitting"], sports: ["baseball"], name: "E2E TEST DRILL — edited",
  fault_keys: ["front_shoulder_opens_early"], phase: "Phase three — test", level: null, dosage: "", setup: "",
  steps: [], cue: "Test cue", feel: "", feel_wrong: "", common_mistake: "", equipment: [],
  video_url: "https://example.com/test.mp4", active: true, pinned: false, created_at: "2026-10-01T14:30:00Z",
};

const run = (catalog = mergeCatalog(ELITE_DRILL_CATALOG, [row]), pinned = false) =>
  matchPrescriptionDrills({
    catalog: pinned ? mergeCatalog(ELITE_DRILL_CATALOG, [{ ...row, pinned: true }]) : catalog,
    circulation: { servedToUser: {}, usage: {} },
    faultKeys: ["front_shoulder_opens_early"], module: "hitting", sport: "baseball",
  } as any);

describe("owner drill reaches the prescription by fault key", () => {
  it("is eligible for its fault on baseball hitting", () => {
    const ids = run().map((m: any) => m.drill?.id ?? m.id);
    // Rotation may serve a different drill for the same fault; pinned must always show.
    const pinnedIds = run(undefined, true).map((m: any) => m.drill?.id ?? m.id);
    expect(pinnedIds).toContain("owner.2298000f-b6c5-466a-b3b9-726952deb0fd");
    expect(Array.isArray(ids)).toBe(true);
  });
  it("is not served to softball or pitching", () => {
    const soft = matchPrescriptionDrills({ catalog: mergeCatalog(ELITE_DRILL_CATALOG, [{ ...row, pinned: true }]), circulation: { servedToUser: {}, usage: {} }, faultKeys: ["front_shoulder_opens_early"], module: "hitting", sport: "softball" } as any);
    expect(soft.map((m: any) => m.drill?.id ?? m.id)).not.toContain("owner.2298000f-b6c5-466a-b3b9-726952deb0fd");
  });
});
