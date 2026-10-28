import { describe, expect, it } from "vitest";
import type { EliteDrill } from "@/data/drills/eliteDrillCatalog";
import type { PrescribedBlock } from "@/lib/hammer/prescription/dailyPlan";
import { applyFaultPlanInfluence } from "@/lib/prescription/applyFaultPlanInfluence";
import { detectRecurring, stillRecurring, type RecurringIssue } from "./recurringIssues";

const NOW = Date.parse("2026-10-28T12:00:00Z");
const day = (d: number) => new Date(NOW - d * 86_400_000).toISOString();
const f = (video: string, ago: number, key = "front_shoulder_opens_early", saved = true) =>
  ({ fault_key: key, skill_domain: "hitting", video_id: video, created_at: day(ago), saved });

describe("recurring finding rule", () => {
  it("two saved analyses with the same tag within 28 days is recurring", () => {
    expect(detectRecurring([f("v1", 1), f("v2", 20)], new Set(), NOW)).toEqual([
      { skill_domain: "hitting", fault_key: "front_shoulder_opens_early", analysis_count: 2 }]);
  });
  it("one analysis alone is not recurring", () => {
    expect(detectRecurring([f("v1", 1)], new Set(), NOW)).toEqual([]);
  });
  it("two analyses more than 28 days apart from now are not recurring", () => {
    expect(detectRecurring([f("v1", 1), f("v2", 29)], new Set(), NOW)).toEqual([]);
  });
  it("different tags do not combine", () => {
    expect(detectRecurring([f("v1", 1), f("v2", 2, "late_load")], new Set(), NOW)).toEqual([]);
  });
  it("unsaved uploads never count", () => {
    expect(detectRecurring([f("v1", 1), f("v2", 2, undefined, false)], new Set(), NOW)).toEqual([]);
  });
  it("one analysis plus a practice/game indication of the same tag is recurring", () => {
    expect(detectRecurring([f("v1", 1)], new Set(["front_shoulder_opens_early"]), NOW)).toHaveLength(1);
  });
});

const issue: RecurringIssue = {
  user_id: "a", sport: "baseball", skill_domain: "hitting", fault_key: "front_shoulder_opens_early",
  analysis_count: 2, video_ids: ["v1", "v2"], corroborating_signal_ids: [], first_seen: day(10), last_seen: day(2),
};

describe("stored recurring issue freshness", () => {
  it("expires once its newest evidence leaves the 28-day window", () => {
    expect(stillRecurring(issue, NOW)).toBe(true);
    expect(stillRecurring({ ...issue, last_seen: day(30) }, NOW)).toBe(false);
  });
});

const drill: EliteDrill = {
  id: "test.hit.fix", name: "Front Side Hold", category: "hitting", sports: ["baseball"], subSkill: "Sequence",
  level: "feel", fixes: "Early opening", setup: "Tee", steps: ["Swing"], cues: ["Hold"], dosage: "3 x 6",
  equipment: [], violationKeys: ["front_shoulder_opens_early"], pieV2Signals: [], movementPatterns: [],
};
const other: EliteDrill = { ...drill, id: "test.hit.other", name: "Other", violationKeys: ["late_load"] };
const block: PrescribedBlock = {
  modality: "hitting", title: "Hitting", why: "w", roadmapReason: "r.", phase: "skill", steps: [],
  drills: [{ name: "A", dosage: "2 x 5" }, { name: "Owner", dosage: "1", prescriptionOrigin: "owner" } as never],
  cues: [], stopRules: [], durationMin: 20, route: "/practice", ctaLabel: "Open", status: "ready",
  missing: [], missingContextKeys: [], gamePlanTemplate: null,
};
const run = (issues: RecurringIssue[], catalog = [drill, other]) => applyFaultPlanInfluence({
  blocks: [block], rankedFaults: [], recurringIssues: issues, sport: "baseball", ownedEquipment: new Set(),
  catalog, circulation: { servedToUser: {}, usage: {} }, now: new Date(NOW),
})[0];

describe("Today fix-it slot for a recurring issue", () => {
  it("picks the tagged library drill, keeps the dose and owner slot, and says Because", () => {
    const out = run([issue]);
    expect(out.drills[0].name).toBe("Front Side Hold");
    expect(out.drills[0].dosage).toBe("2 x 5");
    expect(out.drills[1].name).toBe("Owner");
    expect(out.because?.at(-1)).toBe('Because "front shoulder opens early" keeps showing up (2 of your videos in the last 4 weeks), "Front Side Hold" works on it today.');
  });
  it("changes nothing when no library drill is tagged for the issue", () => {
    expect(run([issue], [other])).toBe(block);
  });
  it("ignores another sport's issue", () => {
    expect(run([{ ...issue, sport: "softball" }])).toBe(block);
  });
});

describe("seeded replay with the real Hammers library", () => {
  it("the stored row from two saved analyses puts a real tagged drill in Today with its Because line", async () => {
    const { ELITE_DRILL_CATALOG } = await import("@/data/drills/eliteDrillCatalog");
    const out = run([issue], ELITE_DRILL_CATALOG);
    expect(out.drills[0].analysisInfluence?.recurring?.analysisCount).toBe(2);
    expect(out.because?.at(-1)).toMatch(/^Because "front shoulder opens early" keeps showing up/);
  });
});
