import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
const mocks = vi.hoisted(() => ({ save: vi.fn(), mark: vi.fn() }));
vi.mock("@/hooks/useExerciseLog", () => ({ useLatestExerciseLog: () => ({ data: null }), useSaveExerciseLog: () => ({ mutateAsync: mocks.save, isPending: false }) }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "test-player" } }) }));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ invalidateQueries: vi.fn() }) }));
vi.mock("@/lib/wic/execution/liftCompletion", () => ({ markPrescriptionDone: mocks.mark, missedStillEditable: () => true }));
import { InlinePrescriptionLog } from "./InlinePrescriptionLog";
const rx = { id: "completion-proof", plan_date: "2026-10-11", movement_name: "90-foot repeats", movement_slug: "repeat_90ft_bb", slot: "conditioning", sets: 4, reps: 1, distance_feet: 90 } as any;
describe("top entries preserve automatic completion without opening exercise details", () => {
  beforeEach(() => { vi.clearAllMocks(); sessionStorage.clear(); mocks.save.mockResolvedValue({}); mocks.mark.mockResolvedValue(null); });
  it("prefilled distances without measured times do not count as completed sets", () => {
    render(<InlinePrescriptionLog rx={rx} />);
    fireEvent.click(screen.getByRole("button", { name: "Save log" }));
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it.each([[1, "cut_short"], [4, "completed"]])("%i entered sets save %s with existing credit semantics", async (count, outcome) => {
    render(<InlinePrescriptionLog rx={rx} />);
    for (let i = 1; i <= Number(count); i++) fireEvent.change(screen.getByLabelText(`Time ${i}`), { target: { value: "12" } });
    fireEvent.click(screen.getByRole("button", { name: "Save log" }));
    await waitFor(() => expect(mocks.mark).toHaveBeenCalled());
    expect(mocks.save.mock.calls[0][0].rounds).toHaveLength(Number(count));
    expect(mocks.save.mock.calls[0][0].outcome).toBe(outcome);
    // Existing storage records Cut short in metrics, with completed task credit.
    expect(screen.queryByText("How hard 1–10")).not.toBeInTheDocument();
  });
});