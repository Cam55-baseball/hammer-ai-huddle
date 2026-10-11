import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, within, waitFor } from "@testing-library/react";
import { ExerciseLogSheet } from "./ExerciseLogSheet";
import type { WkRx } from "@/hooks/useWkDailyPrescriptions";

const state = vi.hoisted(() => ({ host: null as HTMLElement | null, save: vi.fn(async (_payload: unknown) => ({})) }));
vi.mock("@/components/hammer/cards/PocketCard", () => ({ usePocketLogHost: () => state.host }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "test-player" } }) }));
vi.mock("@/lib/logging/writeExerciseLog", () => ({ writeExerciseLog: vi.fn(async (_c: unknown, _u: string, p: unknown) => { await state.save(p); return null; }) }));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ invalidateQueries: vi.fn() }) }));
vi.mock("@/hooks/useUnilateralMovements", () => ({ useUnilateralMovements: () => ({ slugs: new Set() }) }));
vi.mock("@/hooks/useExerciseLog", () => ({ useLatestExerciseLog: () => ({ data: null }), usePreviousMovementLog: () => ({ data: null }), useSaveExerciseLog: () => ({ mutateAsync: state.save, isPending: false }), fetchAiReadback: vi.fn() }));
vi.mock("@/hooks/useStandards", () => ({ useStandards: () => ({ progress: [], measures: null }), useRecordAward: () => ({ mutate: vi.fn() }), useRecordStandardAttempts: () => ({ mutate: vi.fn() }) }));
afterEach(() => { cleanup(); state.host?.remove(); state.host = null; vi.clearAllMocks(); });
describe("specialized pitching activity logging", () => {
  it("saves the existing bullpen schema from top entries without opening details", async () => {
    state.host = document.createElement("div"); document.body.append(state.host);
    const rx = { id: "pitching-bullpen-2026-10-11", plan_date: "2026-10-11", slot: "cross_sport", sets: 1, reps: 30, movement_slug: "bullpen_pen", movement_name: "Bullpen", dosage_unit: "throws", status: "planned" } as WkRx;
    const v = render(<ExerciseLogSheet activity open onOpenChange={() => {}} rx={rx} dosageText="30 pitches" />);
    const top = within(state.host);
    expect(top.getAllByRole("textbox")).toHaveLength(1);
    fireEvent.change(top.getByRole("textbox"), { target: { value: "27" } });
    const toggle = v.getByRole("button", { name: /^Bullpen$/ });
    fireEvent.click(toggle); fireEvent.click(toggle);
    expect(top.getByRole("textbox")).toHaveValue("27");
    expect(top.queryByRole("button", { name: /save log/i })).toBeNull();
    await waitFor(() => expect(state.save).toHaveBeenCalled(), { timeout: 3000 });
    expect(state.save.mock.calls.at(-1)?.[0]).toMatchObject({ prescription_id: rx.id, movement_slug: "bullpen_pen", template_id: "bullpen_pitching", rpe: null, rounds: [{ pitches: 27, strikes: null, first_pitch_strikes: null, peak_velo: null, avg_velo: null }] });
  });
});