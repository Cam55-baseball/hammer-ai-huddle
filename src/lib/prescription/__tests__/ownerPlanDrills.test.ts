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
  for (const sport of ["baseball", "softball"]) it(`${sport}: exact owner role and video tags survive without granting volume or efficacy`, () => {
    setOwnerPlanDrills([row({ sports: [sport], placements: ["hammers_today:warmup"], routine_role: "routine", skill_area: "bat_speed", bat_speed_kind: "overspeed", video_url: "https://example.org/drill.mp4", library_video_id: "video-1" })]);
    const result = mergeOwnerSlotDrills(base, ["hammers_today:warmup"], { sport });
    expect(result).toHaveLength(3);
    expect(result[2]).toMatchObject({ ownerDrillId: "a", routineRole: "routine", skillArea: "bat_speed", batSpeedKind: "overspeed", videoUrl: "https://example.org/drill.mp4", libraryVideoId: "video-1", dosage: "3 x 8" });
    expect(result[2]).not.toHaveProperty("provenEffective");
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
  it("owner tags never displace preparation, full-go, log or existing owner slots", () => {
    setOwnerPlanDrills([row({ routine_role: 'routine' })]);
    const protectedRows = [{ name: 'Prep', stage: 'prep' }, { name: 'Owner', stage: 'drills', prescriptionOrigin: 'owner' },
      { name: 'Live', stage: 'full_go' }, { name: 'Record', stage: 'log' }];
    expect(mergeOwnerSlotDrills(protectedRows, ['hammers_today:skill'], { sport: 'baseball', skill: 'hitting' })).toBe(protectedRows);
    const ordinary = { name: 'Ordinary', stage: 'drills' };
    const mixed = [protectedRows[0], ordinary, ...protectedRows.slice(1)];
    const next = mergeOwnerSlotDrills(mixed, ['hammers_today:skill'], { sport: 'baseball', skill: 'hitting' });
    expect(next).toHaveLength(mixed.length);
    expect(next[1].name).toBe('Owner tee drill');
    for (const index of [0, 2, 3, 4]) expect(next[index]).toBe(mixed[index]);
  });
});
