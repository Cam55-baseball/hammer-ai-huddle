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
  latestObservedAt: "2026-10-02T00:00:00.000Z", says: "Recent finding", fades: [], clearedByCleanClips: false,
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
    expect(after.drills[0].dosage).toBe("1");
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
describe('execution protected from analysis overlays', () => {
  it('never replaces a side-specific bunt or counted arm exposure',()=>{
    const before={...block(),drills:[{name:'Bunt',dosage:'5 attempts',stage:'drills' as const,bunt:{side:'R' as const,type:'squeeze' as const,attempts:5,sourceAttempts:0,sourceSuccesses:0}},{name:'Counted throws',dosage:'10 throws',stage:'drills' as const,armEvent:{kind:'practice' as const,intent:'low' as const,count:10}},{name:'Issue slot',dosage:'10 swings',stage:'drills' as const}]};
    const [after]=apply([before]);
    expect(after.drills[0]).toBe(before.drills[0]);expect(after.drills[1]).toBe(before.drills[1]);expect(after.drills[2].name).toBe('Analysis Match');
  });
  it('preserves prep, full-go and logging while replacing one issue slot', () => {
    const before = { ...block(), drills: [
      { name: 'Prep', dosage: '8 reps', stage: 'prep' as const },
      { name: 'Issue slot', dosage: '10 reps', stage: 'drills' as const },
      { name: 'Compete', dosage: '40 swings', stage: 'full_go' as const },
      { name: 'Actuals', dosage: 'Record count', stage: 'log' as const },
    ] };
    const [after] = apply([before]);
    expect(after.drills[0]).toBe(before.drills[0]);
    expect(after.drills[1].name).toBe('Analysis Match');
    expect(after.drills[1].stage).toBe('drills');
    expect(after.drills[1].dosage).toBe('10 reps');
    expect(after.drills[2]).toBe(before.drills[2]);
    expect(after.drills[3]).toBe(before.drills[3]);
  });
  it('does nothing when only a full-go slot exists', () => {
    const before = { ...block(), drills: [{ name: 'Compete', dosage: '40 swings', stage: 'full_go' as const }] };
    expect(apply([before])[0]).toBe(before);
  });
});
describe("analysis influence reaches every skill card", () => {
  const sig = (discipline: RankedFault["signals"][number]["discipline"], key: string): RankedFault[] => [{
    ...ranked[0], disciplines: [discipline],
    signals: [{ ...ranked[0].signals[0], discipline, fault_key: key }],
  }];
  const run = (modality: PrescribedBlock["modality"], r: RankedFault[], d: EliteDrill) =>
    applyFaultPlanInfluence({ blocks: [{ ...block(), modality, route: `/practice?module=${r[0].signals[0].discipline}` }], rankedFaults: r, sport: "baseball",
      ownedEquipment: new Set(), catalog: [d], circulation: { servedToUser: {}, usage: {} },
      now: new Date("2026-10-03T00:00:00.000Z") })[0];
  it("a pitching finding swaps one drill only on an explicit pitching prescription", () => {
    const d = { ...drill, id: "p1", name: "Pitch Fix", category: "pitching" as const, violationKeys: ["early_trunk_rotation"] };
    const after = run("throwing", sig("pitching", "early_trunk_rotation"), d);
    expect(after.drills[0].name).toBe("Pitch Fix");
    expect(after.because?.[0]).toContain("Pitch Fix");
  });
  it('a pitching finding cannot prescribe a mound drill in overhand throwing work', () => {
    const before = { ...block(), modality: 'throwing' as const, route: '/practice?module=throwing' };
    const [after] = applyFaultPlanInfluence({ blocks: [before], rankedFaults: sig('pitching', 'early_trunk_rotation'), sport: 'baseball',
      ownedEquipment: new Set(), catalog: [{ ...drill, category: 'pitching', violationKeys: ['early_trunk_rotation'] }], circulation: { servedToUser: {}, usage: {} } });
    expect(after).toEqual(before);
  });
  for (const sport of ['baseball', 'softball'] as const) it(`${sport}: overhand throwing findings cannot change pitching work`, () => {
    const before = { ...block(), modality: 'throwing' as const, route: '/practice?module=pitching' };
    const [after] = applyFaultPlanInfluence({ blocks: [before], rankedFaults: sig('throwing', 'early_trunk_rotation'), sport,
      ownedEquipment: new Set(), catalog: [{ ...drill, sports: [sport], category: 'throwing', violationKeys: ['early_trunk_rotation'] }], circulation: { servedToUser: {}, usage: {} } });
    expect(after).toEqual(before);
  });
  it("no spill-over: a fielding finding never borrows a throwing drill for the defense card", () => {
    const d = { ...drill, id: "f1", name: "Glove Fix", category: "throwing" as const, violationKeys: ["glove_late"] };
    const after = run("defense", sig("fielding", "glove_late"), d);
    expect(after.drills.map((x) => x.name)).not.toContain("Glove Fix");
    expect(after.because).toBeUndefined();
  });
  it("a running finding with no running drill library changes nothing (never invents a drill)", () => {
    const before = { ...block(), modality: "baserunning" as const };
    const [after] = applyFaultPlanInfluence({ blocks: [before], rankedFaults: sig("running", "late_jump"), sport: "baseball",
      ownedEquipment: new Set(), catalog: [drill], circulation: { servedToUser: {}, usage: {} } });
    expect(after.drills).toEqual(before.drills);
    expect(after.because).toBeUndefined();
  });
});
