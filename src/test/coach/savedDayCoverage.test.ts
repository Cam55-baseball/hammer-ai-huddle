import { describe, expect, it } from "vitest";
import { savedDayCoverage } from "../../../supabase/functions/_shared/coach/savedDayCoverage";
describe("coach full saved-day coverage", () => {
  it("includes existing canonical drill references without name or dose inference", () => {
    expect(savedDayCoverage({ blocks: [{ status: "ready", drills: [{ prescriptionId: "row-1" }] }] }, [{ id: "row-1" }])).toBe(true);
  });
  it("refuses an unrepresented hitting block alongside a canonical lift", () => {
    expect(savedDayCoverage({ blocks: [{ status: "ready", modality: "hitting", drills: [{ slug: "tee", dosage: "20 swings" }] }] }, [{ id: "lift" }])).toBe(false);
  });
  it("does not mistake the real snapshot serializer shape for canonical workload rows", () => {
    // planSnapshotPayload preserves display dose, not a per-drill row identity.
    // Structure alone cannot prove that this workload reached the governor.
    const snapshot = { sport: "baseball", plan_date: "2026-10-24", blocks: [{ modality: "hitting", status: "ready", drills: [{ name: "Tee work", slug: "tee", dosage: "20 swings", prescriptionOrigin: "hammers" }] }] };
    expect(savedDayCoverage(snapshot, [{ id: "lift", movement_slug: "tee" }])).toBe(false);
  });
  it("never counts a replaced block twice", () => {
    expect(savedDayCoverage({ blocks: [{ status: "ready", replacedByCoachRx: "rx", drills: [{ slug: "old" }] }] }, [])).toBe(true);
  });
  it("refuses missing snapshots and foreign canonical IDs", () => {
    expect(savedDayCoverage(null, [])).toBe(false);
    expect(savedDayCoverage({ blocks: [{ status: "ready", drills: [{ prescriptionId: "other-day" }] }] }, [{ id: "today" }])).toBe(false);
  });
});