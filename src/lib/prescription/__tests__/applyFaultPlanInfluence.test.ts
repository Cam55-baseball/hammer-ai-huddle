import { describe, expect, it } from "vitest";
import type { EliteDrill } from "@/data/drills/eliteDrillCatalog";
import type { PrescribedBlock } from "@/lib/hammer/prescription/dailyPlan";
import type { RankedFault } from "@/lib/wic/faultLedger/ranking";
import { applyFaultPlanInfluence } from "../applyFaultPlanInfluence";

const drill: EliteDrill = {
  id: "test.hit.analysis", name: "Analysis Match", category: "hitting", sports: ["baseball"],
  subSkill: "Sequence", level: "feel", fixes: "Early opening", setup: "Open space",
  steps: ["Move"], cues: ["Hold the front side"], dosage: "3 x 6", equipment: [],
  violationKeys: ["front_shoulder_opens_early"], pieV2Signals: [], movementPatterns: [],
};

const block = (status: PrescribedBlock["status"] = "ready"): PrescribedBlock => ({
  modality: "hitting", title: "Hitting", why: "Quality work", roadmapReason: "Existing reason.",
  phase: "skill", steps: ["A — 1", "Owner — 1"],
  drills: [{ name: "A", dosage: "1" }, { name: "Owner", dosage: "1", prescriptionOrigin: "owner" }],
  cues: [], stopRules: [], durationMin: 20, route: "/practice", ctaLabel: "Open", status,
  missing: [], missingContextKeys: [],
  gamePlanTemplate: { title: "Hitting", activityType: "practice", icon: "target", color: "token",
    durationMinutes: 20, description: "Hitting", checklist: ["A — 1", "Owner — 1"], source: "internal" },
});

const ranked: RankedFault[] = [{
  rootPatternId: "trunk_rotates_before_front_foot_plant", family: null, score: 1,
  sources: ["video_analysis"], disciplines: ["hitting"], totalSampleSize: 1,
  latestObservedAt: "2026-10-02T00:00:00.000Z", says: "Recent finding",
  signals: [{ id: "signal-1", user_id: "athlete-1", source: "video_analysis",
    fault_key: "front_shoulder_opens_early", root_pattern_id: "trunk_rotates_before_front_foot_plant",
    discipline: "hitting", confidence: 0.7, sample_size: 1, severity: 0.46,
    evidence: "Opened early", observed_at: "2026-10-02T00:00:00.000Z" }],
}];

const apply = (blocks: PrescribedBlock[]) => applyFaultPlanInfluence({
  blocks, rankedFaults: ranked, sport: "baseball", ownedEquipment: new Set(), catalog: [drill],
  circulation: { servedToUser: {}, usage: {} }, now: new Date("2026-10-03T00:00:00.000Z"),
});

describe("analysis influence on Hammers Today", () => {
  it("replaces one existing slot without changing card, drill, duration, or owner slot counts", () => {
    const before = block();
    const [after] = apply([before]);
    expect(after.drills).toHaveLength(before.drills.length);
    expect(after.durationMin).toBe(before.durationMin);
    expect(after.drills[0].name).toBe("Analysis Match");
    expect(after.drills[1].name).toBe("Owner");
    expect(after.drills[0].analysisInfluence?.faultKey).toBe("front_shoulder_opens_early");
  });

  it("leaves off-day work and plans with no findings unchanged", () => {
    const off = block("off-day");
    expect(apply([off])[0]).toBe(off);
    const ready = block();
    const [withoutFindings] = applyFaultPlanInfluence({ blocks: [ready], rankedFaults: [], sport: "baseball",
      ownedEquipment: new Set(), catalog: [drill], circulation: { servedToUser: {}, usage: {} } });
    expect(withoutFindings).toBe(ready);
  });

  it("never serves a drill whose equipment is missing", () => {
    const before = block();
    const [after] = applyFaultPlanInfluence({ blocks: [before], rankedFaults: ranked, sport: "baseball",
      ownedEquipment: new Set(), catalog: [{ ...drill, equipment: ["tee"] }],
      circulation: { servedToUser: {}, usage: {} } });
    expect(after).toBe(before);
  });
});