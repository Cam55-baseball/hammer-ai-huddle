import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { checkPrescription, repairInstruction, nameDistanceFeet } from "../../../../../supabase/functions/_shared/wic/integrity/doseIntegrity";
import { formatPrescriptionDose } from "../formatPrescriptionDose";
import { ExerciseInstructions } from "@/components/hammer/cards/ExerciseInstructions";
import { ActivityBasics } from "@/components/hammer/cards/ActivityBasics";
import { BASIC_HOW_TO } from "../basicHowTo.generated";
import { RELEASE_LINE } from "@/components/hammer/cards/ReleaseCountdown";

const sprint = { movement_slug: "repeat_90ft_bb", movement_name: "Repeated 90-Foot Sprints (Baseball)", slot: "speed", sets: 9, reps: null, distance_feet: 1, dosage_unit: "feet", why_payload: { cue: "90ft sprint, walk back, repeat." } };

describe("prescription double-check", () => {
  it("repairs the live 1-foot bug: repeated 90-foot sprints show 90 feet per rep", () => {
    const { row, catches } = checkPrescription(sprint);
    expect(row.distance_feet).toBe(90);
    expect(catches.map((c) => c.rule)).toContain("distance_vs_name");
    const dose = formatPrescriptionDose(row as any);
    expect(dose).toContain("90 feet per rep");
    expect(dose).not.toMatch(/\b1 foot\b|\b1 feet\b/);
  });
  it("text never says 10 yards when 60 feet is prescribed", () => {
    const t = repairInstruction("Athletic stance, react, sprint 10y.", { slot: "speed", distance_feet: 60 }, "cue");
    expect(t).toContain("20 yards");
    expect(t).not.toMatch(/10y|10 yards/);
  });
  it("spacing distances are left alone (wickets 5 feet apart)", () => {
    expect(repairInstruction("Wickets 5 feet apart.", { slot: "speed", distance_feet: 40 }, "cue")).toBe("Wickets 5 feet apart.");
  });
  it("numbers must be above zero", () => {
    const { row } = checkPrescription({ slot: "lift", sets: 0, reps: 5 });
    expect(row.sets).toBe(1);
  });
  it("one play per rep: comebacker + cover first is split", () => {
    const t = repairInstruction("PFP: field comebacker, cover 1st.", { slot: "defense" }, "cue")!;
    expect(t).toMatch(/One play per rep/);
  });
  it("ambiguous names are never auto-fixed", () => {
    expect(nameDistanceFeet("Fly 20 (30y build) sp_fly_20")).toBeNull();
    expect(nameDistanceFeet("Repeated 90-Foot Sprints (Baseball) repeat_90ft_bb")).toBe(90);
  });
});

describe("rendered card text", () => {
  it("how-to drawer shows the repaired distance, cue once and why-changed once", () => {
    const rx = { slot: "speed", distance_feet: 60 };
    render(<ExerciseInstructions name="Sport-Stance Reactive Start" slug="sp_sport_stance_start" cue="Sprint 10y on the signal." why="Builds first-step speed." changes={[]} repair={(t) => repairInstruction(t, rx, "cue") ?? t} />);
    fireEvent.click(screen.getByRole("button", { name: /how to do it/i }));
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/10y|10 yards/);
    expect(text).toContain("20 yards");
    expect(text.match(/Cue:/g)?.length).toBe(1);
    expect(text.match(/Why today's work changed/g)?.length).toBe(1);
    expect(text).not.toMatch(/Your progression/);
  });
  it("basic how-to is shown first and is specific (resisted sled)", () => {
    render(<ActivityBasics name="Resisted Sled Sprint" slug="resisted_sled" />);
    expect(document.body.textContent).toMatch(/waist belt or harness behind you/);
    expect(document.body.textContent).not.toMatch(/band/i);
  });
  it("cable hip snap says where the cable attaches", () => {
    expect(BASIC_HOW_TO["bs_cable_hip_snap"]).toMatch(/hip height on your back-hip side/);
  });
  it("every library exercise has a basic how-to with no dose numbers that could disagree", () => {
    const entries = Object.entries(BASIC_HOW_TO);
    expect(entries.length).toBeGreaterThan(900);
    for (const [slug, t] of entries) {
      expect(t.length, slug).toBeGreaterThan(20);
      expect(t, slug).not.toMatch(/\b\d+\s*(?:y|yd|yds|yards)\b(?! apart)/);
    }
  });
  it("plan-time message says midnight only", () => {
    expect(RELEASE_LINE).toMatch(/midnight/);
    expect(RELEASE_LINE).not.toMatch(/12\s*PM|noon/i);
  });
});
