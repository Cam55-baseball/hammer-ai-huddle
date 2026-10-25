import { describe, expect, it } from "vitest";
import { savedDayCoverage } from "../../../supabase/functions/_shared/coach/savedDayCoverage";
describe("coach full saved-day coverage", () => {
  it("includes existing canonical drill references without name or dose inference", () => {
    expect(savedDayCoverage({ blocks: [{ status: "ready", modality: "hitting", drills: [{ prescriptionId: "row-1", slug: "tee" }] }] }, [{ id: "row-1", movement_slug: "tee", slot: "hitting" }])).toBe(true);
  });
  it("accepts the real snapshot serializer shape: practice-route drills claim no canonical identity", () => {
    // Regression: every real app-saved snapshot (19/19 inspected 2026-10-25)
    // carries drills with slug null and no prescriptionId. Refusing that shape
    // made every real coach-prescription choice fail coverage. Workload is
    // checked from the canonical wk rows directly, not from display drills.
    const snapshot = { sport: "baseball", plan_date: "2026-10-24", blocks: [{ modality: "hitting", status: "ready", drills: [{ name: "Tee work", slug: null, dosage: "20 swings", prescriptionOrigin: null }] }] };
    expect(savedDayCoverage(snapshot, [{ id: "lift", movement_slug: "squat", slot: "lift" }])).toBe(true);
  });
  it("accepts the exact real hitting block shape saved by the app (Oct 24 evidence)", () => {
    const block = {
      phase: "build", route: "/practice?module=hitting", title: "Hitting — built from your gear (off-season)",
      drills: [
        { cue: "shoulder-to-shoulder hold, no hand push", name: "Dry swings — barrel path", slug: null, stage: "prep", dosage: "3 rounds of 10", prescriptionOrigin: null },
        { cue: "hit the back of the ball, finish balanced", name: "Tee work — barrel path", slug: null, stage: "drills", dosage: "30 swings (3 rounds of 10)", prescriptionOrigin: null },
      ],
      status: "ready", because: [], modality: "hitting", durationMin: 27,
    };
    expect(savedDayCoverage({ sport: "baseball", plan_date: "2026-10-24", blocks: [block] }, [])).toBe(true);
  });
  it("still refuses a drill that claims a canonical identity the day does not have", () => {
    expect(savedDayCoverage({ blocks: [{ status: "ready", modality: "hitting", drills: [{ prescriptionId: "row-1", slug: "tee" }] }] }, [{ id: "lift", movement_slug: "squat", slot: "lift" }])).toBe(false);
  });
  it("never counts a replaced block twice", () => {
    expect(savedDayCoverage({ blocks: [{ status: "ready", replacedByCoachRx: "rx", drills: [{ slug: "old" }] }] }, [])).toBe(true);
  });
  it("refuses missing snapshots and foreign canonical IDs", () => {
    expect(savedDayCoverage(null, [])).toBe(false);
    expect(savedDayCoverage({ blocks: [{ status: "ready", drills: [{ prescriptionId: "other-day" }] }] }, [{ id: "today" }])).toBe(false);
  });
  it("refuses borrowed row identities from another movement or category", () => {
    const payload = { blocks: [{ status: "ready", modality: "hitting", drills: [{ prescriptionId: "row", slug: "tee" }] }] };
    expect(savedDayCoverage(payload, [{ id: "row", movement_slug: "other", slot: "hitting" }])).toBe(false);
    expect(savedDayCoverage(payload, [{ id: "row", movement_slug: "tee", slot: "throwing" }])).toBe(false);
  });
  it("does not count one canonical dose as coverage for two saved drills", () => {
    expect(savedDayCoverage({ blocks: [{ status: "ready", modality: "hitting", drills: [{ prescriptionId: "row", slug: "tee" }, { prescriptionId: "row", slug: "tee" }] }] }, [{ id: "row", movement_slug: "tee", slot: "hitting" }])).toBe(false);
  });
  it("maps saved defense only to the fielding category", () => {
    expect(savedDayCoverage({ blocks: [{ status: "ready", modality: "defense", drills: [{ prescriptionId: "row", slug: "grounder" }] }] }, [{ id: "row", movement_slug: "grounder", slot: "fielding" }])).toBe(true);
  });
  it("refuses malformed blocks and drills", () => {
    expect(savedDayCoverage({ blocks: ["nope"] }, [])).toBe(false);
    expect(savedDayCoverage({ blocks: [{ status: "ready", drills: "nope" }] }, [])).toBe(false);
    expect(savedDayCoverage({ blocks: [{ status: "ready", drills: [null] }] }, [])).toBe(false);
  });
});
