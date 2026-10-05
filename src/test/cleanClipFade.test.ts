import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { EliteDrill } from "@/data/drills/eliteDrillCatalog";
import type { PrescribedBlock } from "@/lib/hammer/prescription/dailyPlan";
import {
  fadeForSignal,
  fadeMessage,
  ONE_CLEAN_CLIP_WEIGHT,
  type ClipEvidence,
} from "@/lib/wic/faultLedger/cleanClipFade";
import { rankFaults, recencyWeight, type FaultSignal } from "@/lib/wic/faultLedger/ranking";
import { applyFaultPlanInfluence } from "@/lib/prescription/applyFaultPlanInfluence";
import { buildFaultPriority, rankLedger } from "../../supabase/functions/_shared/wic/faultLedger/priority";

const SEEN = "2026-09-20T10:00:00.000Z";
const NOW = Date.parse("2026-10-05T12:00:00.000Z");

const signal = (over: Partial<FaultSignal> = {}): FaultSignal => ({
  id: "s1", user_id: "u1", source: "video_analysis",
  fault_key: "front_shoulder_opens_early", root_pattern_id: "trunk_rotates_before_front_foot_plant",
  discipline: "hitting", confidence: 0.7, sample_size: 3, severity: 0.52,
  evidence: "Front shoulder opened early", observed_at: SEEN, ...over,
});

let n = 0;
const clip = (module: string, created_at: string, violations: Record<string, unknown> | null): ClipEvidence =>
  ({ video_id: `v${++n}`, module, created_at, violations });

const cleanHitting = (at: string) => clip("hitting", at, {
  early_shoulder_rotation: false, hands_pass_elbow_early: false, front_shoulder_opens_early: false,
});

describe("clean-clip fade — evidence rules", () => {
  it("one newer clean clip of the same skill eases the fault", () => {
    const f = fadeForSignal(signal(), [cleanHitting("2026-09-25T00:00:00Z")]);
    expect(f.status).toBe("eased");
    expect(f.multiplier).toBe(ONE_CLEAN_CLIP_WEIGHT);
    expect(f.cleanClipIds).toHaveLength(1);
  });

  it("two clean clips in a row clear it", () => {
    const f = fadeForSignal(signal(), [cleanHitting("2026-09-25T00:00:00Z"), cleanHitting("2026-09-28T00:00:00Z")]);
    expect(f.status).toBe("cleared");
    expect(f.multiplier).toBe(0);
  });

  it("a clip that could not judge the fault is not evidence", () => {
    for (const v of [null, {}, { front_shoulder_opens_early: null }, { early_shoulder_rotation: true }, { front_shoulder_opens_early: "false" }]) {
      expect(fadeForSignal(signal(), [clip("hitting", "2026-09-25T00:00:00Z", v as any)]).status).toBe("none");
    }
  });

  it("an unjudged clip between two clean clips neither breaks nor counts", () => {
    const f = fadeForSignal(signal(), [
      cleanHitting("2026-09-25T00:00:00Z"),
      clip("hitting", "2026-09-26T00:00:00Z", null),
      cleanHitting("2026-09-27T00:00:00Z"),
    ]);
    expect(f.cleanClips).toBe(2);
  });

  it("a clean clip of another skill does not count", () => {
    const throwingClean = clip("throwing", "2026-09-25T00:00:00Z", { early_shoulder_rotation: false, shoulders_not_aligned: false, back_leg_not_facing_target: false });
    expect(fadeForSignal(signal({ fault_key: "early_shoulder_rotation" }), [throwingClean]).status).toBe("none");
  });

  it("hitting's forced-false answers are never treated as a check", () => {
    const c = clip("hitting", "2026-09-25T00:00:00Z", { shoulders_not_aligned: false, back_leg_not_facing_target: false });
    expect(fadeForSignal(signal({ fault_key: "shoulders_not_aligned" }), [c]).status).toBe("none");
  });

  it("clips older than the latest sighting do not count", () => {
    expect(fadeForSignal(signal(), [cleanHitting("2026-09-10T00:00:00Z")]).status).toBe("none");
  });

  it("the fault seen again resets to full weight", () => {
    const f = fadeForSignal(signal(), [
      cleanHitting("2026-09-25T00:00:00Z"),
      clip("hitting", "2026-09-26T00:00:00Z", { front_shoulder_opens_early: true }),
    ]);
    expect(f.status).toBe("none");
    expect(f.multiplier).toBe(1);
    // and a fresh finding moves observed_at past older clean clips
    const after = fadeForSignal(signal({ observed_at: "2026-09-26T01:00:00Z" }), [cleanHitting("2026-09-25T00:00:00Z")]);
    expect(after.status).toBe("none");
  });

  it("non-analysis sources never fade from a clip", () => {
    expect(fadeForSignal(signal({ source: "report_card" }), [cleanHitting("2026-09-25T00:00:00Z")]).status).toBe("none");
    expect(fadeForSignal(signal({ source: "game_hub", discipline: "fielding" }), [cleanHitting("2026-09-25T00:00:00Z")]).status).toBe("none");
  });

  it("athlete wording is coach language with no numbers", () => {
    for (const s of ["eased", "cleared"] as const) {
      const m = fadeMessage("hitting", "front_shoulder_opens_early", s)!;
      expect(m).not.toMatch(/\d/);
      expect(m).toMatch(/clip/);
    }
    expect(fadeMessage("hitting", "x", "none")).toBeNull();
  });
});

describe("clean-clip fade — timer stays underneath", () => {
  it("no clips leaves the score exactly as the timer sets it", () => {
    const [a] = rankFaults([signal()], NOW);
    const [b] = rankFaults([signal()], NOW, []);
    expect(b.score).toBe(a.score);
    const expected = 0.7 * 0.52 * (Math.log10(4) / Math.log10(11)) * recencyWeight(SEEN, NOW);
    expect(a.score).toBeCloseTo(expected, 10);
  });

  it("one clean clip halves the timer-decayed score", () => {
    const [plain] = rankFaults([signal()], NOW);
    const [eased] = rankFaults([signal()], NOW, [cleanHitting("2026-09-25T00:00:00Z")]);
    expect(eased.score).toBeCloseTo(plain.score * ONE_CLEAN_CLIP_WEIGHT, 10);
    expect(eased.clearedByCleanClips).toBe(false);
  });

  it("a cleared group keeps no priority but other sources in it still count", () => {
    const clips = [cleanHitting("2026-09-25T00:00:00Z"), cleanHitting("2026-09-28T00:00:00Z")];
    const [cleared] = rankFaults([signal()], NOW, clips);
    expect(cleared.score).toBe(0);
    expect(cleared.clearedByCleanClips).toBe(true);
    const mixed = rankFaults([signal(), signal({ id: "s2", source: "coach_note" })], NOW, clips)[0];
    expect(mixed.clearedByCleanClips).toBe(false);
    expect(mixed.score).toBeGreaterThan(0);
  });
});

describe("plan builder mirror", () => {
  it("the shared copy is byte-identical", () => {
    const a = readFileSync(resolve(__dirname, "../lib/wic/faultLedger/cleanClipFade.ts"), "utf8");
    const b = readFileSync(resolve(__dirname, "../../supabase/functions/_shared/wic/faultLedger/cleanClipFade.ts"), "utf8");
    expect(b).toBe(a);
  });

  it("server and app scores agree with and without clips", () => {
    const clips = [cleanHitting("2026-09-25T00:00:00Z")];
    expect(rankLedger([signal()], NOW, clips)[0].score).toBeCloseTo(rankFaults([signal()], NOW, clips)[0].score, 12);
    expect(rankLedger([signal()], NOW)[0].score).toBeCloseTo(rankFaults([signal()], NOW)[0].score, 12);
  });

  it("a cleared fault gives up its rank and bonus; the next fault moves up; trace keeps it", () => {
    const rows = [
      signal({ root_pattern_id: "weak_bracing", severity: 0.9 }),
      signal({ id: "s2", source: "coach_note", root_pattern_id: "weak_grip", fault_key: "weak_grip", severity: 0.2 }),
    ];
    const clips = [cleanHitting("2026-09-25T00:00:00Z"), cleanHitting("2026-09-28T00:00:00Z")];
    const before = buildFaultPriority(rows, NOW);
    expect(before.ranked[0].rootPatternId).toBe("weak_bracing");
    expect(before.bonusForSlug("bird_dog")).toBeGreaterThan(0);
    const after = buildFaultPriority(rows, NOW, 3, clips);
    expect(after.ranked.map((r) => r.rootPatternId)).toEqual(["weak_grip"]);
    expect(after.bonusForSlug("bird_dog")).toBe(0);
    expect(after.bonusForSlug("dead_hang")).toBe(0.9);
    expect(after.trace.some((t) => t.cleared_by_clean_clips === true && t.root_pattern === "weak_bracing")).toBe(true);
  });

  it("no clips: the plan builder priority is unchanged", () => {
    const rows = [signal({ root_pattern_id: "weak_bracing" })];
    const a = buildFaultPriority(rows, NOW);
    const b = buildFaultPriority(rows, NOW, 3, []);
    expect(b.ranked.map((r) => [r.rootPatternId, r.score])).toEqual(a.ranked.map((r) => [r.rootPatternId, r.score]));
  });
});

// ---- Hammers Today skill slot: same count, drill eases, reason shown ----
const drill: EliteDrill = {
  id: "test.hit.analysis", name: "Analysis Match", category: "hitting", sports: ["baseball"],
  subSkill: "Sequence", level: "feel", fixes: "Early opening", setup: "Open space",
  steps: ["Move"], cues: ["Hold the front side"], dosage: "3 x 6", equipment: [],
  violationKeys: ["front_shoulder_opens_early"], pieV2Signals: [], movementPatterns: [],
};
const block = (): PrescribedBlock => ({
  modality: "hitting", title: "Hitting", why: "Quality work", roadmapReason: "Existing reason.",
  phase: "skill", steps: ["A — 1", "B — 1"], drills: [{ name: "A", dosage: "1" }, { name: "B", dosage: "1" }],
  cues: [], stopRules: [], durationMin: 20, route: "/practice", ctaLabel: "Open", status: "ready",
  missing: [], missingContextKeys: [], gamePlanTemplate: null,
});
const plan = (clips: ClipEvidence[]) => applyFaultPlanInfluence({
  blocks: [block()], rankedFaults: rankFaults([signal()], NOW, clips), sport: "baseball",
  ownedEquipment: new Set(), catalog: [drill], circulation: { servedToUser: {}, usage: {} }, now: new Date(NOW),
});

describe("Hammers Today end to end", () => {
  it("fault drives a drill → one clean clip eases (still there, with reason) → two clean clips clear it", () => {
    const [driving] = plan([]);
    expect(driving.drills[0].name).toBe("Analysis Match");
    expect(driving.cleanClipNote).toBeUndefined();

    const [eased] = plan([cleanHitting("2026-09-25T00:00:00Z")]);
    expect(eased.drills).toHaveLength(2);
    expect(eased.cleanClipNote).toBe("Your last hitting clip didn't show your front shoulder opening early, so we've eased off it.");

    const [cleared] = plan([cleanHitting("2026-09-25T00:00:00Z"), cleanHitting("2026-09-28T00:00:00Z")]);
    expect(cleared.drills.map((d) => d.name)).toEqual(["A", "B"]);
    expect(cleared.drills).toHaveLength(2);
    expect(cleared.durationMin).toBe(20);
    expect(cleared.cleanClipNote).toMatch(/moved on from it/);
  });

  it("unmeasurable and wrong-skill clips change nothing", () => {
    const [a] = plan([clip("hitting", "2026-09-25T00:00:00Z", null), clip("throwing", "2026-09-26T00:00:00Z", { early_shoulder_rotation: false })]);
    expect(a.drills[0].name).toBe("Analysis Match");
    expect(a.cleanClipNote).toBeUndefined();
  });

  it("reappearing fault returns at full weight and drives the slot again", () => {
    const clips = [cleanHitting("2026-09-25T00:00:00Z"), cleanHitting("2026-09-28T00:00:00Z")];
    const [back] = applyFaultPlanInfluence({
      blocks: [block()], rankedFaults: rankFaults([signal({ observed_at: "2026-10-01T00:00:00Z" })], NOW, clips),
      sport: "baseball", ownedEquipment: new Set(), catalog: [drill], circulation: { servedToUser: {}, usage: {} }, now: new Date(NOW),
    });
    expect(back.drills[0].name).toBe("Analysis Match");
    expect(back.cleanClipNote).toBeUndefined();
  });
});
