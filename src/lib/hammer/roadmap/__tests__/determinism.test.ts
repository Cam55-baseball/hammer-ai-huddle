import { describe, it, expect } from "vitest";
import {
  evaluateRecoveryWindow,
  applyRecoveryWindows,
  type RecentCompletions,
} from "@/lib/hammer/roadmap/recoveryWindows";
import { resolveSeasonQuarter, quartersFromWeeks } from "@/lib/hammer/roadmap/seasonQuarters";
import { rungByKey, RUNG_ORDER } from "@/lib/hammer/roadmap/roadmapLadder";
import { prescribeThrowingLadder } from "@/lib/hammer/roadmap/throwingLadder";
import { resolveEliteTarget } from "@/lib/hammer/roadmap/eliteTarget";
import {
  resolveSkillDaysTarget,
  SKILL_DAYS_CEILING,
  SKILL_MODALITIES,
} from "@/lib/hammer/roadmap/skillFrequencyLadder";

// Minimal QuarterDescriptor stub for isolated math.
const Q2_OFF = resolveSeasonQuarter(
  { seasonPhase: "off" } as never,
  { phaseStartedAt: "2025-12-25", resolvedPhase: "off", phaseSource: "date_window" },
  new Date("2026-01-15T12:00:00Z"),
);
const UNKNOWN_PHASE = resolveSeasonQuarter(
  { seasonPhase: null } as never,
  { phaseStartedAt: null, resolvedPhase: null, phaseSource: "default" },
  new Date("2026-01-15T12:00:00Z"),
);

describe("roadmap — determinism guards", () => {
  it("every rung has a valid descriptor and monotonically increasing index", () => {
    let prev = 0;
    for (const k of RUNG_ORDER) {
      const d = rungByKey(k);
      expect(d.rung).toBe(k);
      expect(d.index).toBeGreaterThan(prev);
      expect(d.volumeCeilings.throwsPerWeekCeiling).toBeGreaterThan(0);
      prev = d.index;
    }
  });

  it("season quarter is derived from a real phase start date", () => {
    expect(Q2_OFF.quarter).toBe(2);
    expect(Q2_OFF.phase).toBe("off");
    expect(Q2_OFF.phaseKnown).toBe(true);
    expect(Q2_OFF.quarterKnown).toBe(true);
  });

  it("never fabricates a phase/quarter when there is no real season signal", () => {
    expect(UNKNOWN_PHASE.phaseKnown).toBe(false);
    expect(UNKNOWN_PHASE.quarterKnown).toBe(false);
    expect(UNKNOWN_PHASE.label).toBe("Season phase not set");
  });

  it("quartersFromWeeks partitions ~12 weeks into 4 quarters", () => {
    expect(quartersFromWeeks(0)).toBe(1);
    expect(quartersFromWeeks(3)).toBe(2);
    expect(quartersFromWeeks(6)).toBe(3);
    expect(quartersFromWeeks(9)).toBe(4);
    expect(quartersFromWeeks(30)).toBe(4);
  });

  it("recovery clock: same inputs → same outputs (pure)", () => {
    const today = new Date("2026-02-01T12:00:00Z");
    const recent: RecentCompletions = [
      { modality: "heavy_lift", at: new Date("2026-01-31T12:00:00Z"), side: null },
    ];
    const a = evaluateRecoveryWindow("heavy_lift", null, "bridge", Q2_OFF, recent, today);
    const b = evaluateRecoveryWindow("heavy_lift", null, "bridge", Q2_OFF, recent, today);
    expect(a).toEqual(b);
  });

  it("recovery clock: 24h since heavy lift on Bridge (72h window) → off (>75% remaining)", () => {
    const today = new Date("2026-02-02T12:00:00Z");
    const recent: RecentCompletions = [
      { modality: "heavy_lift", at: new Date("2026-02-02T00:00:00Z"), side: null }, // 12h ago
    ];
    const dec = evaluateRecoveryWindow("heavy_lift", null, "bridge", Q2_OFF, recent, today);
    expect(dec.action).toBe("off");
    expect(dec.nextAvailableAt).not.toBeNull();
  });

  it("recovery clock: outside window → primary", () => {
    const today = new Date("2026-02-10T12:00:00Z");
    const recent: RecentCompletions = [
      { modality: "heavy_lift", at: new Date("2026-02-01T12:00:00Z"), side: null },
    ];
    const dec = evaluateRecoveryWindow("heavy_lift", null, "bridge", Q2_OFF, recent, today);
    expect(dec.action).toBe("primary");
  });

  it("laterality: L attempt does NOT gate R attempt for bat speed", () => {
    const today = new Date("2026-02-02T12:00:00Z");
    const recent: RecentCompletions = [
      { modality: "bat_speed_max", at: new Date("2026-02-02T06:00:00Z"), side: "L" },
    ];
    const leftDec = evaluateRecoveryWindow("bat_speed_max", "L", "bridge", Q2_OFF, recent, today);
    const rightDec = evaluateRecoveryWindow("bat_speed_max", "R", "bridge", Q2_OFF, recent, today);
    expect(leftDec.action).not.toBe("primary");
    expect(rightDec.action).toBe("primary");
  });

  it("throwing ladder scales with rung — Foundation < Peak", () => {
    const foundation = prescribeThrowingLadder("foundation", Q2_OFF, "OF");
    const peak = prescribeThrowingLadder("peak", Q2_OFF, "OF");
    expect(foundation.throwsToday).toBeLessThan(peak.throwsToday);
    expect(foundation.longTossUnlocked).toBe(false);
    expect(peak.longTossUnlocked).toBe(true);
  });

  it("pitchers get higher throw counts than position players at the same rung", () => {
    const pitcher = prescribeThrowingLadder("bridge", Q2_OFF, "P");
    const positional = prescribeThrowingLadder("bridge", Q2_OFF, "SS");
    expect(pitcher.throwsToday).toBeGreaterThan(positional.throwsToday);
  });

  it("elite target: baseball → MLB, softball → AUSL, unknown → baseball default", () => {
    expect(resolveEliteTarget("baseball").league).toBe("MLB");
    expect(resolveEliteTarget("softball").league).toBe("AUSL");
    expect(resolveEliteTarget(null).league).toBe("MLB");
  });

  it("applyRecoveryWindows never promotes a suppressed/awaiting/off-day block", () => {
    const today = new Date("2026-02-10T12:00:00Z");
    const blocks = [
      {
        modality: "strength" as const,
        status: "awaiting-input" as const,
        title: "Lifts — awaiting",
        why: "", roadmapReason: "", phase: "build" as const,
        drills: [], steps: [], cues: [], stopRules: [],
        durationMin: 45, gamePlanTemplate: null, side: null,
      },
    ];
    const out = applyRecoveryWindows(blocks as never, "peak", Q2_OFF, [], today);
    expect(out[0].status).toBe("awaiting-input");
  });

  it("skill-frequency ladder: monotonically climbs foundation → sustain, never exceeds ceiling", () => {
    const rungs = ["foundation", "build", "bridge", "peak", "sustain"] as const;
    for (const m of SKILL_MODALITIES) {
      let prev = -1;
      for (const r of rungs) {
        const t = resolveSkillDaysTarget(r, m, null);
        expect(t).toBeGreaterThanOrEqual(prev);
        expect(t).toBeLessThanOrEqual(SKILL_DAYS_CEILING);
        prev = t;
      }
    }
  });

  it("pitcher throwing is bullpen-capped at 5 (never 6) even at Sustain", () => {
    expect(resolveSkillDaysTarget("sustain", "throwing", "P")).toBe(5);
    expect(resolveSkillDaysTarget("sustain", "throwing", "SS")).toBe(6);
  });

  it("leg injury clamps defense + baserunning to ≤ 2 days/wk regardless of rung", () => {
    expect(resolveSkillDaysTarget("sustain", "defense", "OF", ["hamstring"])).toBeLessThanOrEqual(2);
    expect(resolveSkillDaysTarget("sustain", "baserunning", "OF", ["knee"])).toBeLessThanOrEqual(2);
  });

  it("arm injury clamps throwing to ≤ 2 days/wk", () => {
    expect(resolveSkillDaysTarget("peak", "throwing", "OF", ["shoulder"])).toBeLessThanOrEqual(2);
  });

  it("youth band never exceeds Bridge target (training-age clamp)", () => {
    const bridge = resolveSkillDaysTarget("bridge", "hitting", "OF");
    const youth = resolveSkillDaysTarget("sustain", "hitting", "OF", [], "u12", null);
    expect(youth).toBeLessThanOrEqual(bridge);
  });
});
