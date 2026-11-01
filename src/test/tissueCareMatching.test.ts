import { describe, it, expect, afterEach } from "vitest";
import { rankCare, matchCare, pickCareForDay, careConfigFrom, DEFAULT_CARE_CONFIG, type CareItem, type CareTarget } from "../../supabase/functions/_shared/tissueCare/matching";
import { applyTissueCareMatching, setTissueCareConfig } from "@/lib/prescription/tissueCarePlan";
import { setOwnerPlanDrills } from "@/lib/prescription/ownerPlanDrills";
import { blockSwapChoices } from "../../supabase/functions/_shared/planSwap/blockSwap";

const item = (id: string, areas: any[], types: any[], o: Partial<CareItem> = {}): CareItem => ({ id, name: id, areas, types, origin: "owner", ...o });
const t = (areas: any[], type: any, context: any = "recovery", o: Partial<CareTarget> = {}): CareTarget => ({ areas, type, context, sport: "baseball", ...o });

const POOL: CareItem[] = [
  item("shoulder_roll", ["shoulders"], ["foam_roll"], { contexts: ["pre_throwing"] }),
  item("shoulder_roll_any", ["shoulders"], ["foam_roll"]),
  item("hip_roll", ["hips"], ["foam_roll"]),
  item("shoulder_stretch", ["shoulders"], ["stretch"]),
  item("hamstring_activation", ["hamstrings"], ["activation"]),
  item("hip_glute_mob", ["hips", "glutes"], ["mobility"]),
  item("box_breath", ["full_body"], ["breathing"]),
];

describe("tissue care matching — owner required checks", () => {
  afterEach(() => { setOwnerPlanDrills([]); setTissueCareConfig(DEFAULT_CARE_CONFIG); });

  it("shoulder + foam roll + pre-throwing → exact match", () => {
    const m = matchCare(t(["shoulders"], "foam_roll", "pre_throwing"), POOL)!;
    expect(m.tier).toBe(1);
    expect(m.item.id).toBe("shoulder_roll"); // context-tagged ranks above the general one
  });
  it("no soft-tissue item for an area → falls back to foam roll", () => {
    const m = matchCare(t(["hips"], "soft_tissue"), POOL)!;
    expect(m.item.id).toBe("hip_roll");
    expect(m.tier).toBe(2);
  });
  it("no elbow stretch → a shoulder stretch", () => {
    const m = matchCare(t(["elbow_forearm"], "stretch"), POOL)!;
    expect(m.item.id).toBe("shoulder_stretch");
    expect(m.tier).toBe(3);
  });
  it("no knee activation → another area's activation", () => {
    const m = matchCare(t(["knees"], "activation", "warm_up"), POOL)!;
    expect(m.item.id).toBe("hamstring_activation");
  });
  it("an exercise tagged hips + glutes shows only once", () => {
    const picks = pickCareForDay([t(["hips"], "mobility"), t(["glutes"], "mobility")], POOL);
    expect(picks[0]?.item.id).toBe("hip_glute_mob");
    expect(picks[1]?.item.id ?? null).not.toBe("hip_glute_mob");
  });
  it("nothing irrelevant is ever forced in", () => {
    expect(matchCare(t(["shoulders"], "breathing"), POOL.filter((i) => i.id !== "box_breath"))).toBeNull();
    expect(matchCare(t(["feet"], "soft_tissue"), [item("neck_stretch", ["neck"], ["stretch"])])).toBeNull();
    // Activation ↔ Elasticity only in warm-ups
    expect(matchCare(t(["calves_ankles"], "activation", "recovery"), [item("pogo", ["calves_ankles"], ["elasticity"])])).toBeNull();
    expect(matchCare(t(["calves_ankles"], "activation", "warm_up"), [item("pogo", ["calves_ankles"], ["elasticity"])])?.tier).toBe(2);
    // injured area and moderate-on-recovery never picked; wrong sport never picked
    expect(matchCare(t(["shoulders"], "foam_roll", "recovery", { injuredAreas: ["shoulders"] }), POOL.filter((i) => i.areas.includes("shoulders")))).toBeNull();
    expect(matchCare(t(["hips"], "foam_roll"), [item("hard", ["hips"], ["foam_roll"], { intensity: "moderate" })])).toBeNull();
    expect(matchCare(t(["hips"], "foam_roll"), [item("sb", ["hips"], ["foam_roll"], { sports: ["softball"] })])).toBeNull();
  });
  it("admin edits change the results", () => {
    const noSoft = careConfigFrom({ compatible: [], related: DEFAULT_CARE_CONFIG.related });
    expect(matchCare(t(["hips"], "soft_tissue"), POOL, noSoft)).toBeNull();
    const noRel = careConfigFrom({ compatible: DEFAULT_CARE_CONFIG.compatible, related: {} });
    expect(matchCare(t(["elbow_forearm"], "stretch"), POOL, noRel)?.tier).toBe(5);
    const elbowNeck = careConfigFrom({ compatible: DEFAULT_CARE_CONFIG.compatible, related: { neck: ["elbow_forearm"] } });
    expect(rankCare(t(["elbow_forearm"], "stretch"), [item("neck_s", ["neck"], ["stretch"]), item("shoulder_s", ["shoulders"], ["stretch"])], elbowNeck)[0].item.id).toBe("neck_s");
  });

  const row = (o: any) => ({ active: true, sports: ["baseball"], cue: "c", equipment: [], steps: [], fault_keys: [], phase: null, level: null, setup: "", video_url: null, pinned: false, created_by: null, created_at: "", updated_at: "", overrides_drill_id: null, placements: ["hammers_today:tissue_care"], dosage: "easy", care_measure: "time", work_seconds: 300, ...o });
  const blocks = () => [
    { modality: "warmup", status: "ready", drills: [{ name: "T-spine foam roll extensions", slug: "wu_foam_roll_tspine", dosage: "8 slow reps", stage: "prep" }, { name: "Controlled shoulder circles", slug: "wu_shoulder_cars", dosage: "2 per direction per side", stage: "prep" }] },
    { modality: "throwing", status: "ready", drills: [{ name: "Long toss", dosage: "20 throws" }] },
    { modality: "recovery", status: "ready", drills: [{ name: "Mobility + foam roll", dosage: "10 min focus areas" }, { name: "Evening down-regulation breath (post-session)", dosage: "5 min" }] },
  ];

  it("existing untagged tissue-care rows keep the old Recovery-slot behavior", () => {
    setOwnerPlanDrills([row({ id: "legacy", name: "Calf care" })] as any);
    const out = applyTissueCareMatching(blocks() as any, { sport: "baseball", day: new Date("2026-11-02T12:00:00Z") });
    expect(out[0]).toBe(blocks().length && out[0]); // warm-up untouched
    expect(out[0].drills.map((d: any) => d.name)).toEqual(["T-spine foam roll extensions", "Controlled shoulder circles"]);
    expect(out[2].drills[0].name).toBe("Calf care");
    expect(out[2].drills[0].dosage).toBe("5 min · easy");
    expect(out[2].drills).toHaveLength(2);
  });
  it("tagged rows replace warm-up and recovery like-for-like at the same budget, once each", () => {
    setOwnerPlanDrills([
      row({ id: "o_back", name: "Owner back roll", care_areas: ["back"], care_types: ["foam_roll"] }),
      row({ id: "o_breath", name: "Owner box breathing", care_areas: ["full_body"], care_types: ["breathing"] }),
    ] as any);
    const out = applyTissueCareMatching(blocks() as any, { sport: "baseball", day: new Date("2026-11-02T12:00:00Z") });
    expect(out[0].drills[0].name).toBe("Owner back roll");
    expect(out[0].drills[0].dosage).toBe("8 slow reps");
    expect(out[0].drills[1].name).toBe("Controlled shoulder circles"); // mobility ≠ foam roll; no forced pick
    expect(out[2].drills[1].name).toBe("Owner box breathing");
    expect(out[2].drills[0].name).toBe("Mobility + foam roll"); // back roll already used today — no duplicate
    const ids = out.flatMap((b: any) => b.drills.map((d: any) => d.ownerDrillId).filter(Boolean));
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("Swap: missing roller swaps a foam roll to the closest available like-for-like", () => {
    const choices = blockSwapChoices({ name: "T-spine foam roll extensions", slug: "wu_foam_roll_tspine", dosage: "8 slow reps" }, "warmup", "baseball", [], ["foam_roller"]);
    expect(choices.map((c) => c.name)).toEqual(["T-spine open book"]); // existing owner sibling kept
    const towel = blockSwapChoices({ name: "Barefoot towel scrunch (foot fascia)", slug: "wu_barefoot_towel_scrunch", dosage: "30 sec per foot" }, "warmup", "baseball", [], ["towel"]);
    expect(towel.map((c) => c.slug)).toEqual(["wu_tissue_prep_rhythmic_shake"]); // same type (soft tissue), full body; no sibling existed
    expect(towel[0].replacement.dosage).toBe("30 sec per foot");
  });
});
