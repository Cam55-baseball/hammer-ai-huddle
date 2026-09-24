// v1.2 §F — amendment tests.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { render, screen, fireEvent } from "@testing-library/react";
import React, { useState } from "react";
import { painDraft } from "@/lib/hammer/injury/recordPain";
import { findMergeTarget, type TimelineEntry } from "../../../supabase/functions/_shared/wic/schedule/timeline";
import { planAthlete, arcForDays, addDays } from "../../../supabase/functions/_shared/wic/phases/adaptivePhases";
import {
  rampDaysFor, scheduleBreak, nextStep, buildRampSteps, highIntentUnlocked, armBehindBody, WHY_ARM, type ArmProfile,
} from "../../../supabase/functions/_shared/wic/phases/armReadiness";
import {
  outcomeLinks, stepFeedback, defaultFeedback, painPatterns, BANNED_CLAIMS, MAX_FROM_DEFAULT, type OutcomeLink,
} from "../../../supabase/functions/_shared/wic/phases/outcomes";
import { SHARE } from "../../../supabase/functions/_shared/wic/phases/adaptivePhases";
import { PhaseStripView } from "@/components/hammer/AdaptivePhaseStrip";

const pitcher: ArmProfile = { age: 16, isPitcher: true, lastSeasonInnings: 40, lastSeasonPitches: 700, armPainReports12mo: 0, armTank: 30, velocityTrend: 0, priorRampRepeats: 0, priorRamps: 1 };
const noCredit = { P1: 0, P2: 0, P3: 0 };
const need = { goal: null, openPain: false } as any;

describe("v1.2 §F", () => {
  it("one pain entry from three screens = one record and one plan change", () => {
    const store: TimelineEntry[] = [];
    let planChanges = 0;
    for (const origin of ["report_dialog", "checkin_body_map", "something_off"] as const) {
      const d = painDraft({ region: "shoulder" as any, severity: "sore" as any, date: "2026-09-24", origin });
      const hit = findMergeTarget(store, { ...d, source: "inbox" } as any);
      if (hit) { hit.payload = { ...hit.payload, ...d.payload }; continue; }
      store.push({ id: `e${store.length}`, ...d, source: "inbox", summary: "", created_at: "", undone_at: null } as any);
      planChanges++;
    }
    expect(store).toHaveLength(1);
    expect(planChanges).toBe(1);
  });

  it("every card in a day carries the same season state and phase", () => {
    const gen = readFileSync("supabase/functions/wk-generate-daily/index.ts", "utf8");
    const i = gen.indexOf("adaptive_phase: {");
    const loop = gen.slice(gen.lastIndexOf("for (const r of finalRxs", i), i + 200);
    // One plan read once per day, stamped identically onto every row.
    expect(loop).toMatch(/adaptive_phase: \{ phase: plan\.phase, season_state: plan\.seasonState/);
    expect([...gen.matchAll(/adaptive_phase_shadow/g)].length).toBe(1);
  });

  it("168-day and 126-day offseasons are different jobs, not one plan stretched", () => {
    const a = arcForDays(168, noCredit, need, "the season");
    const b = arcForDays(126, noCredit, need, "the season");
    expect(a.tier).toBe("full");
    expect(b.tier).toBe("compressed");
    const shape = (x: typeof a) => x.segments.map((s) => `${s.phase}:${s.block}:${s.weeks}`).join("|");
    expect(shape(a)).not.toBe(shape(b));
    expect(a.segments.map((s) => s.block)).toContain("Full explosiveness");
    expect(a.rampDays).toBeGreaterThan(b.rampDays);
    // Stretch test: scaling b by 168/126 does not give a.
    const stretched = b.segments.map((s) => Math.round((s.weeks * 168) / 126));
    expect(stretched).not.toEqual(a.segments.map((s) => s.weeks));
    const p = planAthlete({ today: "2026-01-05", seasonState: "offseason", lastGameDate: null, hardDate: addDays("2026-01-05", 168), hardDateIsGame: true, yearRound: false, offDaysInWindow: 0, holdToday: false, weeksIntoSeason: 0, records: [], need } as any);
    expect(p.arc?.days).toBeGreaterThan(0);
    expect(p.arc?.lengths.length).toBeGreaterThan(0);
  });

  it("a 30-day throwing break gives a pitcher a ramp of at least 45 days, ending ≥7 days before the game", () => {
    expect(rampDaysFor(30, pitcher).days).toBeGreaterThanOrEqual(45);
    const b = scheduleBreak({ start: "2026-10-01", desiredBreakDays: 30, nextGame: "2027-01-15", profile: pitcher, annualRestMet: true });
    expect(b.breakDays).toBe(30);
    expect(b.rampDays).toBeGreaterThanOrEqual(45);
    expect(b.bufferDays!).toBeGreaterThanOrEqual(7);
  });

  it("if break + ramp don't fit, the break shortens and the ramp stays whole", () => {
    const b = scheduleBreak({ start: "2026-10-01", desiredBreakDays: 30, nextGame: "2026-12-01", profile: pitcher, annualRestMet: false });
    expect(b.shortenedBreak).toBe(true);
    expect(b.breakDays).toBeLessThan(30);
    expect(b.rampDays).toBe(rampDaysFor(b.breakDays, pitcher).days);
    expect(b.bufferDays!).toBeGreaterThanOrEqual(7);
    expect(b.reason).toBeTruthy();
    expect(b.annualRestOwed).toBe(true);
  });

  it("a failed ramp gate repeats the step instead of advancing", () => {
    const ok = { painFree48h: true, soreness: 1, armTank: 30, prevVolumeCompleted: true };
    expect(nextStep(2, ok).step).toBe(3);
    for (const bad of [{ ...ok, painFree48h: false }, { ...ok, soreness: 5 }, { ...ok, armTank: 80 }, { ...ok, prevVolumeCompleted: false }]) {
      const r = nextStep(2, bad);
      expect(r.step).toBe(2);
      expect(r.repeated).toBe(true);
    }
    const steps = buildRampSteps();
    for (let i = 1; i < steps.length; i++) {
      const a = steps[i - 1], b = steps[i];
      const changed = [a.distancePct !== b.distancePct, a.volumePct !== b.volumePct, a.intentPct !== b.intentPct].filter(Boolean).length;
      expect(changed).toBe(1);
      if (b.intentPct === 100) expect(b.distancePct).toBe(100);
    }
  });

  it("high-intent throwing stays locked until the ramp is complete plus two clean weeks", () => {
    expect(highIntentUnlocked({ rampComplete: false, cleanHighIntentWeeks: 5 })).toBe(false);
    expect(highIntentUnlocked({ rampComplete: true, cleanHighIntentWeeks: 1 })).toBe(false);
    expect(highIntentUnlocked({ rampComplete: true, cleanHighIntentWeeks: 2 })).toBe(true);
    expect(armBehindBody(8, 3).hold).toBe(true);
    expect(armBehindBody(8, null).hold).toBe(true);
  });

  it("the drawer shows the phase explanation in one tap and adds nothing else", () => {
    const plan = { phaseName: "Power Building", why: "Now we add force.", weeksLeft: 3 } as any;
    function Host() { const [o, s] = useState(false); return React.createElement(PhaseStripView, { plan, open: o, onToggle: () => s(!o) }); }
    const { container } = render(React.createElement(Host));
    expect(screen.queryByTestId("phase-why")).toBeNull();
    expect(container.querySelectorAll("button")).toHaveLength(1);
    fireEvent.click(screen.getByTestId("phase-why-toggle"));
    expect(screen.getByTestId("phase-why").textContent).toBe("Now we add force.");
    fireEvent.click(screen.getByTestId("phase-why-toggle"));
    expect(screen.queryByTestId("phase-why")).toBeNull();
  });
});

describe("Stage C", () => {
  it("below the minimum data bars, nothing is shown as a link", () => {
    const links = outcomeLinks([{ athlete: "a", metric: "sprint", changePct: 2, phaseWeeks: 4, adherence: 0.8, spacingDays: 3 }]);
    expect(links.every((l) => l.confidence === "not enough data")).toBe(true);
  });
  it("feedback never moves more than 20% from default or 5% a week, and turns itself off when worse", () => {
    const link: OutcomeLink = { metric: "sprint", factor: "phase_length", athletes: 50, pairs: 200, r: 0.5, confidence: "high", text: "" };
    let fb = defaultFeedback();
    for (let w = 0; w < 60; w++) {
      const prev = fb.shares;
      fb = stepFeedback(fb, [link], { adjustedMeanPct: null, defaultMeanPct: null, n: 0 }, `w${w}`);
      for (const p of ["P1", "P2", "P3"] as const) {
        expect(Math.abs(fb.shares[p] - SHARE[p]) / SHARE[p]).toBeLessThanOrEqual(MAX_FROM_DEFAULT + 0.01);
        expect(Math.abs(fb.shares[p] - prev[p]) / prev[p]).toBeLessThanOrEqual(0.05 + 0.01);
      }
    }
    expect(fb.version).toBeGreaterThan(0);
    const off = stepFeedback(fb, [link], { adjustedMeanPct: 1, defaultMeanPct: 2, n: 40 }, "x");
    expect(off.enabled).toBe(false);
    expect(off.shares).toEqual(SHARE);
  });
  it("no pattern, link or arm text makes a medical, prevention or proven-science claim", () => {
    const pains = Array.from({ length: 30 }, (_, i) => ({ athlete: `a${i % 7}`, date: "2026-09-01", region: "shoulder", severity: "sore", phase: "Power Building" }));
    const texts = [
      ...painPatterns(pains, "owner").map((p) => p.text),
      ...painPatterns(pains.slice(0, 3).map((p) => ({ ...p, athlete: "me" })), "athlete").map((p) => p.text),
      ...outcomeLinks([]).map((l) => l.text),
      WHY_ARM,
    ];
    for (const t of texts) expect(t).not.toMatch(BANNED_CLAIMS);
  });
});
