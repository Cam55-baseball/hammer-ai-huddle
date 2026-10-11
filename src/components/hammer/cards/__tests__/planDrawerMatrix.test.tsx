import { describe, it, expect, vi } from "vitest";
import { render, fireEvent, within } from "@testing-library/react";
import { ExerciseDisclosure } from "../ExerciseDisclosure";
import { ActivityBasics } from "../ActivityBasics";
import { ExerciseInstructions } from "../ExerciseInstructions";
import { LegacyDrillInlineLog } from "../../logging/LegacyDrillInlineLog";
import { selectDefenseDrills, type DefensePosition } from "@/lib/hammer/prescription/defenseLibrary";
import { buildWarmup } from "@/lib/hammer/prescription/warmupLibrary";
import { doseFeet, repairInstruction } from "../../../../../supabase/functions/_shared/wic/integrity/doseIntegrity";

describe("plan-library drawer tap matrix", () => {
  it("taps every exercise, instructions and directly visible survey questions in selected warm-up and defense plans", () => {
    const positions: DefensePosition[] = ["C", "P", "1B", "2B", "SS", "3B", "LF", "CF", "RF", "OF", "IF", "utility"];
    let tapped = 0;
    for (const sport of ["baseball", "softball"] as const) {
      const warmup = buildWarmup({ context: "default", lifecycle: "youth", daySeed: 1, gameDay: false, equipment: [], sport });
      const plans = [warmup.drills, ...positions.flatMap((position) => ["off", "pre", "in"].map((seasonPhase) => selectDefenseDrills({ position, sport, seasonPhase, tier: "developing" })?.drills ?? []))];
      for (const drills of plans) {
        for (const drill of drills) {
          const dosage = drill.dosage ?? "";
          const feet = doseFeet(dosage);
          const repair = (text: string) => repairInstruction(text, feet ? { slot: "speed", distance_feet: feet } : { slot: "other" }, "legacy") ?? text;
          const view = render(<ExerciseDisclosure name={drill.name}>
            <p>{dosage}</p>
            <ActivityBasics name={drill.name} slug={drill.slug} setup={drill.setup} cue={drill.cue} dosage={dosage} repair={repair} />
            <LegacyDrillInlineLog name={drill.name} modality="defense" dosage={dosage} completed={false} storageKey={`matrix-${tapped}`} onSave={vi.fn()} onOutcome={vi.fn()} />
            <ExerciseInstructions name={drill.name} slug={drill.slug} guideOverride={drill.guide} dosage={dosage} setup={drill.setup} cue={drill.cue} repair={repair} />
          </ExerciseDisclosure>);
          const scope = within(view.container);
          const toggle = scope.getByRole("button", { name: drill.name });
          expect(toggle).toHaveAttribute("aria-expanded", "false");
          fireEvent.click(toggle);
          const instructions = scope.getByRole("button", { name: "How to do it" });
          fireEvent.click(instructions);
          expect(instructions).toHaveAttribute("aria-expanded", "true");
          expect(view.container.textContent).not.toMatch(/\b1 feet\b|\bNaN\b|\bundefined\b|Extra log \(optional\)/);
          expect(scope.getByRole("textbox", { name: "Notes (optional)" })).toBeVisible();
          fireEvent.click(instructions);
          expect(instructions).toHaveAttribute("aria-expanded", "false");
          fireEvent.click(toggle);
          expect(toggle).toHaveAttribute("aria-expanded", "false");
          view.unmount();
          tapped++;
        }
      }
    }
    expect(tapped).toBeGreaterThan(100);
  }, 60000);
});