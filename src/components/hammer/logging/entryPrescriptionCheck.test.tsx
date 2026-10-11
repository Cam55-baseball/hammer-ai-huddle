import { describe, expect, it, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ invalidateQueries: vi.fn() }) }));
vi.mock("@/hooks/useExerciseLog", () => ({ useLatestExerciseLog: () => ({ data: null }), useSaveExerciseLog: () => ({ mutateAsync: vi.fn(), isPending: false }) }));
import { InlinePrescriptionLog } from "./InlinePrescriptionLog";
import { LegacyDrillInlineLog } from "./LegacyDrillInlineLog";
import { sprintRestSeconds } from "../cards/RestTimer";
import type { WkRx } from "@/hooks/useWkDailyPrescriptions";
const rx = (values: Record<string, unknown>) => ({ id: "entry-proof", plan_date: "2026-10-11", movement_slug: "trap_bar_deadlift", movement_name: "Trap Bar Deadlift", slot: "lift", ...values }) as WkRx;
describe("prescription entry grids", () => {
  it("3 × 5 lift renders three sets of five and three weight entries", () => {
    const v = render(<InlinePrescriptionLog rx={rx({ sets: 3, reps: 5 })} />);
    expect(v.getAllByLabelText(/^Reps /).map(e => (e as HTMLInputElement).value)).toEqual(["5", "5", "5"]);
    expect(v.getAllByLabelText(/^Weight /)).toHaveLength(3);
  });
  it("4 × 90 ft repeats render four 90-foot distances and four stopwatch entries", () => {
    const v = render(<InlinePrescriptionLog rx={rx({ slot: "conditioning", sets: 4, reps: 1, distance_feet: 90, dosage_unit: "feet", movement_slug: "repeat_90ft_bb" })} />);
    expect(v.getAllByLabelText(/^Distance /).map(e => (e as HTMLInputElement).value)).toEqual(["90", "90", "90", "90"]);
    expect(v.getAllByLabelText(/^Time /)).toHaveLength(4);
  });
  it("holds render sets × seconds", () => {
    const v = render(<InlinePrescriptionLog rx={rx({ movement_slug: "plank_hold", sets: 3, duration_seconds: 30, dosage_unit: "seconds" })} />);
    expect(v.getAllByLabelText(/^Seconds /).map(e => (e as HTMLInputElement).value)).toEqual(["30", "30", "30"]);
  });
  it("jumps render sets × reps without weight", () => {
    const v = render(<InlinePrescriptionLog rx={rx({ slot: "speed", movement_slug: "pogo_jumps", sets: 3, reps: 5 })} />);
    expect(v.getAllByLabelText(/^Reps /).map(e => (e as HTMLInputElement).value)).toEqual(["5", "5", "5"]);
    expect(v.queryAllByLabelText(/^Weight /)).toHaveLength(0);
  });
  it("throw rows sum to the prescribed throws", () => {
    const v = render(<InlinePrescriptionLog rx={rx({ movement_slug: "catch_play", sets: 2, reps: 10, total_reps: 20, dosage_unit: "throws" })} />);
    expect(v.getAllByLabelText(/^Throws /).map(e => (e as HTMLInputElement).value)).toEqual(["10", "10"]);
  });
  it("recovery shows done and five minutes", () => {
    const v = render(<LegacyDrillInlineLog name="Recovery walk" modality="recovery" dosage="5 minutes" storageKey="entry-recovery" completed={false} onSave={vi.fn()} />);
    expect(v.getByRole("checkbox")).toBeInTheDocument();
    expect(v.getByLabelText("Minutes 1")).toHaveValue("5");
  });
  it("sprint rest is one minute per ten yards", () => {
    expect(sprintRestSeconds(90)).toBe(180);
    expect(sprintRestSeconds(60)).toBe(120);
  });
  it("eight weeks of prescription grids keep exact values across role/sport/age/season presentation contexts", () => {
    let checked = 0;
    for (const sport of ["baseball", "softball"]) for (const role of ["P", "C", "IF", "OF"]) for (const age of [12, 14, 18, 30]) for (const season of ["off_season", "pre_season", "in_season", "post_season"]) for (let day = 0; day < 56; day++) {
      const sets = day % 4 + 1;
      const reps = day % 8 + 1;
      const v = render(<InlinePrescriptionLog rx={rx({ id: `${sport}-${role}-${age}-${season}-${day}`, sets, reps })} />);
      expect(v.getAllByLabelText(/^Reps /).map(e => (e as HTMLInputElement).value)).toEqual(Array(sets).fill(String(reps)));
      expect(v.getAllByLabelText(/^Weight /)).toHaveLength(sets);
      cleanup(); checked++;
    }
    expect(checked).toBe(7168);
  }, 120000);
});
