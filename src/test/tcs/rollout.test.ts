import { describe, expect, it } from "vitest";
import {
  countGreenNights,
  demote,
  evaluateAutoOff,
  evaluateGate,
  releasePreflight,
  type SwitchMode,
} from "../../../supabase/functions/_shared/wic/flags/rollout";

const green = { status: "passed", mismatches: 0, fallbackRate: 0 };

describe("Step 13 release gates", () => {
  it("lets Just me through on proofs plus one green night", () => {
    const r = evaluateGate("self", {
      proofsOk: true,
      versionOk: false,
      greenNights: 1,
      lastNightGreen: true,
    });
    expect(r.ok).toBe(true);
  });

  it("blocks Just me when last night was not green", () => {
    const r = evaluateGate("self", {
      proofsOk: true,
      versionOk: true,
      greenNights: 0,
      lastNightGreen: false,
    });
    expect(r.ok).toBe(false);
  });

  it("blocks pilot and everyone when last night was not green", () => {
    for (const m of ["pilot", "all"] as SwitchMode[]) {
      const r = evaluateGate(m, {
        proofsOk: true,
        versionOk: true,
        greenNights: 0,
        lastNightGreen: false,
        ownerConfirmed: true,
      });
      expect(r.ok).toBe(false);
    }
  });

  it("Step 13: releases to everyone on one green night, the version pass and the owner's press", () => {
    for (const m of ["pilot", "all"] as SwitchMode[]) {
      const r = evaluateGate(m, {
        proofsOk: true,
        versionOk: true,
        greenNights: 1,
        lastNightGreen: true,
        ownerConfirmed: true,
      });
      expect(r.ok).toBe(true);
      expect(r.needsConfirm).toBe(true);
    }
  });

  it("allows pilot and everyone on the version pass and the owner's press", () => {
    for (const m of ["pilot", "all"] as SwitchMode[]) {
      const r = evaluateGate(m, {
        proofsOk: true,
        versionOk: true,
        greenNights: 3,
        lastNightGreen: true,
        ownerConfirmed: true,
      });
      expect(r.ok).toBe(true);
      expect(r.needsConfirm).toBe(true);
    }
  });

  it("holds pilot and everyone until the version run passes", () => {
    const r = evaluateGate("all", {
      proofsOk: true,
      versionOk: false,
      greenNights: 9,
      lastNightGreen: true,
      ownerConfirmed: true,
    });
    expect(r.ok).toBe(false);
  });

  it("never asks for a waiting period — no 3-night or 14-day wait", () => {
    const r = evaluateGate("all", {
      proofsOk: true,
      versionOk: true,
      greenNights: 1,
      lastNightGreen: true,
      ownerConfirmed: true,
    });
    expect(r.ok).toBe(true);
  });

  it("off is always allowed", () => {
    expect(evaluateGate("off", { proofsOk: false, versionOk: false, greenNights: 0, lastNightGreen: false }).ok).toBe(true);
  });
});

describe("Step 12 automatic safety", () => {
  it("drops one step when the nightly check fails", () => {
    const r = evaluateAutoOff({
      mode: "all",
      shadowCheck: { status: "failed", mismatches: 0, fallbackRate: 0 },
      errorsToday: 0,
      baselineErrors: 0,
    });
    expect(r.demoted).toBe(true);
    expect(r.trigger).toBe("shadow_check_failed");
    expect(r.toMode).toBe("pilot");
  });

  it("drops one step on a mismatch", () => {
    const r = evaluateAutoOff({
      mode: "pilot",
      shadowCheck: { status: "passed", mismatches: 2, fallbackRate: 0 },
      errorsToday: 0,
      baselineErrors: 0,
    });
    expect(r.demoted).toBe(true);
    expect(r.toMode).toBe("self");
  });

  it("drops one step when the backup plan is used above 0.5%", () => {
    const r = evaluateAutoOff({
      mode: "self",
      shadowCheck: { status: "passed", mismatches: 0, fallbackRate: 0.006 },
      errorsToday: 0,
      baselineErrors: 0,
    });
    expect(r.demoted).toBe(true);
    expect(r.trigger).toBe("fallback_rate");
    expect(r.toMode).toBe("off");
  });

  it("stays put at exactly 0.5%", () => {
    const r = evaluateAutoOff({
      mode: "all",
      shadowCheck: { status: "passed", mismatches: 0, fallbackRate: 0.005 },
      errorsToday: 0,
      baselineErrors: 0,
    });
    expect(r.demoted).toBe(false);
  });

  it("drops one step when card problems rise above the normal level", () => {
    const r = evaluateAutoOff({
      mode: "all",
      shadowCheck: green,
      errorsToday: 1,
      baselineErrors: 0,
    });
    expect(r.demoted).toBe(true);
    expect(r.trigger).toBe("card_errors");
  });

  it("Step 15: a critical card-build note drops the switch one step", () => {
    const r = evaluateAutoOff({
      mode: "all",
      shadowCheck: green,
      errorsToday: 0,
      baselineErrors: 0,
      criticalNotes: 1,
    });
    expect(r.demoted).toBe(true);
    expect(r.trigger).toBe("critical_notes");
    expect(r.toMode).toBe("pilot");
  });

  it("Step 15: a ceiling violation walks the ladder down one step at a time", () => {
    let mode: SwitchMode = "all";
    const seen: SwitchMode[] = [];
    for (let i = 0; i < 4; i++) {
      const r = evaluateAutoOff({
        mode,
        shadowCheck: green,
        errorsToday: 0,
        baselineErrors: 0,
        criticalNotes: 2,
      });
      mode = r.toMode;
      seen.push(mode);
    }
    expect(seen).toEqual(["pilot", "self", "off", "off"]);
  });

  it("no critical notes leaves the switch where it is", () => {
    const r = evaluateAutoOff({
      mode: "all",
      shadowCheck: green,
      errorsToday: 0,
      baselineErrors: 0,
      criticalNotes: 0,
    });
    expect(r.demoted).toBe(false);
  });

  it("leaves a healthy switch alone", () => {
    const r = evaluateAutoOff({ mode: "all", shadowCheck: green, errorsToday: 0, baselineErrors: 0 });
    expect(r.demoted).toBe(false);
    expect(r.toMode).toBe("all");
  });

  it("never touches a switch that is already off", () => {
    const r = evaluateAutoOff({
      mode: "off",
      shadowCheck: { status: "failed", mismatches: 5, fallbackRate: 1 },
      errorsToday: 99,
      baselineErrors: 0,
    });
    expect(r.demoted).toBe(false);
  });

  it("walks all the way down one step at a time", () => {
    expect(demote("all")).toBe("pilot");
    expect(demote("pilot")).toBe("self");
    expect(demote("self")).toBe("off");
    expect(demote("off")).toBe("off");
  });

  it("counts only the unbroken run of green nights", () => {
    expect(
      countGreenNights([green, green, { status: "failed", mismatches: 0, fallbackRate: 0 }, green]),
    ).toBe(2);
  });
});

// Step 17 item A — the machine check that runs before any widening flip.
describe("Step 17 release preflight", () => {
  const now = new Date("2026-09-21T21:00:00Z");
  const crit = (min: number) => ({
    id: `n${min}`,
    noted_at: new Date(now.getTime() - min * 60_000).toISOString(),
    category: "rule_violation",
    title: "A movement went above today's ceiling",
  });

  it("refuses a flip while a critical note is less than an hour old, and lists it", () => {
    const r = releasePreflight({ mode: "all", criticalNotes: [crit(10)], now });
    expect(r.ok).toBe(false);
    expect(r.why).toContain("critical note");
    expect(r.blocking.map((b) => b.id)).toEqual(["n10"]);
  });

  it("refuses a flip while an automatic step-down is waiting", () => {
    const r = releasePreflight({
      mode: "all",
      criticalNotes: [],
      now,
      pendingAutoOff: { feature_key: "rest_day_calculator", to_mode: "pilot" },
    });
    expect(r.ok).toBe(false);
    expect(r.why).toContain("step-down");
  });

  it("allows the flip once the hour is quiet and nothing is pending", () => {
    const r = releasePreflight({ mode: "all", criticalNotes: [crit(75)], now });
    expect(r.ok).toBe(true);
    expect(r.blocking).toEqual([]);
  });

  it("never blocks turning something off", () => {
    expect(releasePreflight({ mode: "off", criticalNotes: [crit(1)], now }).ok).toBe(true);
  });
});
