import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@/hooks/useAuth", () => ({ useOptionalAuth: () => ({ user: null }), useAuth: () => ({ user: null }) }));
vi.mock("@/hooks/useExerciseLog", () => ({ useLatestExerciseLog: () => ({ data: null }) }));
vi.mock("@tanstack/react-query", async importOriginal => ({ ...await importOriginal<typeof import("@tanstack/react-query")>(), useQueryClient: () => ({ invalidateQueries: vi.fn() }) }));
vi.mock("@/components/hammer/cards/ExerciseTools", () => ({ ExerciseTools: () => null }));
import { WARMUP_LIBRARY, buildWarmup } from "@/lib/hammer/prescription/warmupLibrary";
import { LegacyDrillInlineLog } from "@/components/hammer/logging/LegacyDrillInlineLog";
import { InlinePrescriptionLog } from "@/components/hammer/logging/InlinePrescriptionLog";
import { legacyDrillLogSpec } from "@/lib/hammer/prescription/legacyDrillLog";
afterEach(cleanup);
describe("rendered warm-up measure coverage", () => {
  it("every declared warm-up variant renders count, time and distance when declared", () => {
    let count = 0;
    for (const drill of WARMUP_LIBRARY) for (const dosage of new Set([drill.baseDose, drill.beginnerDose, drill.eliteDose].filter((d): d is string => Boolean(d)))) {
      render(<LegacyDrillInlineLog modality="warmup" name={drill.name} dosage={dosage} storageKey={`audit:${drill.slug}`} completed={false} />);
      const spec = legacyDrillLogSpec("warmup", drill.name, dosage);
      const work = dosage.toLowerCase().replace(/rest.*$/g, "");
      if (/\b(?:reps?|contacts?|steps?|breaths?|rocks?)\b|\bper\s+(?:side|leg|direction|foot)\b/.test(work) && !/\b(?:yd|yards?|ft|feet)\b/.test(work)) {
        expect(spec.fields.some(f => f.key === "reps"), `${drill.slug}: ${dosage}`).toBe(true);
      }
      if (/\b(?:seconds?|secs?|minutes?|mins?)\b/.test(work)) {
        expect(spec.fields.some(f => f.key === "time"), `${drill.slug}: ${dosage}`).toBe(true);
        expect(screen.getByRole("button", { name: "Start timer" })).toBeTruthy();
      }
      if (/\b(?:yards?|yds?|feet|ft)\b/.test(work)) expect(spec.fields.some(f => f.key === "distance"), `${drill.slug}: ${dosage}`).toBe(true);
      expect(screen.getAllByRole("textbox").length).toBeGreaterThan(0);
      cleanup(); count++;
    }
    expect(count).toBeGreaterThan(100);
  });
  it("all generated warm-up contexts keep their declared fields rendered", () => {
    for (const context of ["game_day", "speed_day", "lift_day", "throwing_day", "hitting_day", "recovery_day", "travel_day", "offseason_extended"] as const) {
      const built = buildWarmup({ context, lifecycle: "elite", gameDay: context === "game_day", equipment: [], daySeed: 5 });
      for (const drill of built.drills) {
        render(<LegacyDrillInlineLog modality="warmup" name={drill.name} dosage={drill.dosage} storageKey={`generated:${context}:${drill.slug}`} completed={false} />);
        expect(screen.getAllByRole("textbox").length, `${context}/${drill.slug}`).toBeGreaterThan(0);
        cleanup();
      }
    }
  });
  it("a catalog rep-based warm-up is not silently changed to seconds", () => {
    render(<InlinePrescriptionLog rx={{ id: "warmup-rep", plan_date: "2026-10-25", movement_slug: "wu_90_90_switch", movement_name: "Seated Bent-Knee Hip Switches", slot: "warmup", dosage_unit: "reps", sets: 1, reps: 8 } as any} />);
    expect(screen.getByLabelText("Reps 1")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Start timer" })).toBeNull();
  });
});