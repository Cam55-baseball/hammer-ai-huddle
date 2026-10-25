import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@/hooks/useAuth", () => ({ useOptionalAuth: () => ({ user: null }), useAuth: () => ({ user: null }) }));
vi.mock("@/hooks/useExerciseLog", () => ({ useLatestExerciseLog: () => ({ data: null }) }));
vi.mock("@tanstack/react-query", async original => ({ ...await original<typeof import("@tanstack/react-query")>(), useQueryClient: () => ({ invalidateQueries: vi.fn() }) }));
vi.mock("@/components/hammer/cards/ExerciseTools", () => ({ ExerciseTools: () => null }));
import catalog from "@/test/fixtures/wkCatalogMeasures.json";
import { InlinePrescriptionLog } from "@/components/hammer/logging/InlinePrescriptionLog";
import { LegacyDrillInlineLog } from "@/components/hammer/logging/LegacyDrillInlineLog";
import { jumpMeasure, ownerExerciseMeasure } from "@/lib/logging/measureType";
import { buildHammerDailyPlan } from "@/lib/hammer/prescription/dailyPlan";
import type { HammerAthleteContext, ContextVariable } from "@/lib/hammer/context/athleteContext";
afterEach(() => { cleanup(); localStorage.clear(); sessionStorage.clear(); });
const slotFor = (category: string) => ["warmup", "arm_care", "conditioning", "mobility", "recovery"].includes(category) ? category : /speed|sprint/.test(category) ? "speed" : category === "bat_speed" ? "hitting" : /throw|pitch/.test(category) ? "throwing" : "lift";
describe("real catalog declarations rendered through the canonical logger", () => {
  it("all 989 catalog items preserve declared time/count/distance rather than inferring seconds from a name", () => {
    const mismatches: string[] = [];
    for (const row of catalog) {
      const rx = { id: `audit:${row.slug}`, plan_date: "2026-10-25", movement_slug: row.slug, movement_name: row.name, slot: slotFor(row.category), sets: row.default_sets, reps: row.default_reps, dosage_unit: row.dosage_unit, duration_seconds: row.default_duration_seconds, distance_feet: row.default_distance_feet };
      render(<InlinePrescriptionLog rx={rx as any} />);
      if (!jumpMeasure(`${row.slug} ${row.name}`) && !ownerExerciseMeasure(row.slug)) {
        if (["seconds", "minutes"].includes(row.dosage_unit) && !screen.queryByRole("button", { name: "Start timer" })) mismatches.push(`${row.slug}: missing time`);
        if (["reps", "contacts", "steps", "swings", "throws"].includes(row.dosage_unit) && row.default_duration_seconds == null) {
          if (screen.queryByRole("button", { name: "Start timer" })) mismatches.push(`${row.slug}: count became time`);
        }
      }
      expect(screen.getAllByRole("textbox").length, row.slug).toBeGreaterThan(0);
      cleanup();
    }
    expect(catalog).toHaveLength(989);
    expect(mismatches).toEqual([]);
  }, 120000);
  it.each(["warmup", "recovery", "mobility", "conditioning", "speed", "coach", "swap", "assessment", "test"])("%s count, contacts and duration stay their declared work", source => {
    for (const dosage of ["2 x 8 reps", "2 x 12 contacts", "2 x 1.47 seconds", "2 x 3 minutes"]) {
      render(<LegacyDrillInlineLog modality={source === "coach" || source === "swap" || source === "assessment" || source === "test" ? "warmup" : source} name="Declared work" dosage={dosage} storageKey={`audit:${source}:${dosage}`} completed={false} />);
      if (/seconds|minutes/.test(dosage)) expect(screen.queryByRole("button", { name: "Start timer" })).not.toBeNull();
      if (/reps|contacts/.test(dosage) && !["conditioning"].includes(source)) expect(screen.queryByRole("button", { name: "Start timer" })).toBeNull();
      cleanup();
    }
  });
  it("a speed block distance renders both distance and actual time", () => {
    render(<LegacyDrillInlineLog modality="speed" name="Accelerations" dosage="3 x 10 yards; rest 60 seconds" storageKey="audit:speed" completed={false} />);
    expect(screen.getByLabelText("Distance 1")).toBeTruthy();
    expect(screen.getByLabelText("Time 1")).toBeTruthy();
  });
});
describe("generated block drill entries", () => {
  it("walks both sports and all positions over a complete week, rendering every returned physical drill", () => {
    const counts = new Map<string, number>();
    for (const sport of ["baseball", "softball"]) for (const role of ["P", "C", "SS", "CF", "2B", "1B", "DH"]) {
      const variables = Object.entries({ sport_primary: sport, position_primary: role, lifecycle_band: "u18", season_phase: "off", lifting_age_years: 2, weekly_availability_days: 6, injury_history: [], equipment_effective: ["ball", "bat", "glove", "field", "tee"] }).map(([key,value]) => ({ key, value, missing: false, confidence: "high" }) as ContextVariable);
      const context = { variables, missing: [], isLoading: false, missingCount: 0, envelope: null, get: (key: string) => variables.find(v => v.key === key) } as HammerAthleteContext;
      for (let d = 0; d < 7; d++) for (const block of buildHammerDailyPlan(context, undefined, null, null, undefined, new Date(2026,9,26+d)).blocks) {
        if (["game_iq", "fueling"].includes(block.modality)) continue;
        for (const drill of block.drills) {
          render(<LegacyDrillInlineLog modality={block.modality} name={drill.name} dosage={drill.dosage} storageKey={`audit:${sport}:${role}:${d}:${drill.name}`} completed={false} />);
          const work = drill.dosage.toLowerCase().split(/rest/)[0];
          if (!jumpMeasure(drill.name) && /\b\d+(?:\.\d+)?\s*(?:seconds?|secs?|minutes?|mins?)\b/.test(work) && !["throwing", "pitching"].includes(block.modality)) expect(screen.queryByRole("button", { name: "Start timer" }), `${block.modality}/${drill.name}: ${drill.dosage}`).not.toBeNull();
          expect(screen.getAllByRole("textbox").length).toBeGreaterThan(0);
          counts.set(block.modality, (counts.get(block.modality) ?? 0) + 1); cleanup();
        }
      }
    }
    console.info("Generated physical drill render counts", Object.fromEntries(counts));
    expect(counts.get("warmup")).toBeGreaterThan(0);
    expect(counts.get("hitting")).toBeGreaterThan(0);
    expect(counts.get("defense")).toBeGreaterThan(0);
  }, 120000);
});