import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
const mocks = vi.hoisted(() => ({ write: vi.fn(), mark: vi.fn() }));
vi.mock("@/hooks/useExerciseLog", () => ({ useLatestExerciseLog: () => ({ data: null }) }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "test-player" } }) }));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ invalidateQueries: vi.fn() }) }));
vi.mock("@/lib/wic/execution/liftCompletion", () => ({ markPrescriptionDone: mocks.mark, missedStillEditable: () => true }));
vi.mock("@/lib/logging/writeExerciseLog", () => ({ writeExerciseLog: mocks.write }));
vi.mock("@/lib/hammer/taskCompletionWrite", () => ({ setTaskCompletion: vi.fn(async () => null) }));
import { InlinePrescriptionLog } from "./InlinePrescriptionLog";
import { pendingJobs } from "@/lib/logging/logOutbox";

const rx = { id: "completion-proof", plan_date: "2099-10-11", movement_name: "90-foot repeats", movement_slug: "repeat_90ft_bb", slot: "conditioning", sets: 4, reps: 1, distance_feet: 90 } as any;
const lift = { id: "lift-proof", plan_date: "2099-10-11", movement_name: "Trap Bar Deadlift", movement_slug: "trap_bar_deadlift", slot: "lift", sets: 3, reps: 5 } as any;
const lastPayload = () => mocks.write.mock.calls[mocks.write.mock.calls.length - 1]?.[2];
const typeSeconds = (row: number, ss: string, hh = "") => {
  fireEvent.change(screen.getByLabelText(`Time ${row} seconds`), { target: { value: ss } });
  if (hh) fireEvent.change(screen.getByLabelText(`Time ${row} hundredths`), { target: { value: hh } });
};

describe("autosave + automatic completion (no Save log, no Completed button)", () => {
  beforeEach(() => { cleanup(); vi.clearAllMocks(); localStorage.clear(); sessionStorage.clear(); mocks.write.mockResolvedValue(null); mocks.mark.mockResolvedValue(null); });

  it("has no Save log or Completed button", () => {
    render(<InlinePrescriptionLog rx={rx} />);
    expect(screen.queryByRole("button", { name: /save log/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /^completed$|^done$/i })).toBeNull();
    expect(screen.queryByRole("checkbox")).toBeNull();
  });

  it("prefilled distances without measured times are not logged sets", () => {
    render(<InlinePrescriptionLog rx={rx} />);
    expect(document.querySelector("[data-auto-status]")).toBeNull();
  });

  it.each([[1, "cut_short", "Cut short"], [4, "completed", "Done"]])("%i timed repeats autosave as %s with the automatic label", async (count, outcome, label) => {
    render(<InlinePrescriptionLog rx={rx} />);
    for (let i = 1; i <= Number(count); i++) typeSeconds(i, "12", "34");
    expect(screen.getByText(label)).toBeInTheDocument();
    await waitFor(() => expect(mocks.write).toHaveBeenCalled(), { timeout: 2000 });
    expect(lastPayload().rounds).toHaveLength(Number(count));
    expect(lastPayload().rounds[0].time).toBe(12.34);
    expect(lastPayload().outcome).toBe(outcome);
    await waitFor(() => expect(mocks.mark).toHaveBeenCalled());
  });

  it("an added set on a 3 × 5 lift saves 4 sets and shows Done · Did more with prescribed vs done", async () => {
    render(<InlinePrescriptionLog rx={lift} />);
    for (let i = 1; i <= 3; i++) fireEvent.change(screen.getByLabelText(`Weight ${i}`), { target: { value: "185" } });
    expect(screen.getByText("Done")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add set" }));
    fireEvent.change(screen.getByLabelText("Reps 4"), { target: { value: "5" } });
    expect(document.querySelector("[data-prescribed-vs-done]")?.textContent).toBe("Prescribed: 3 sets × 5 reps · Done: 4 sets, 20 reps total");
    await waitFor(() => expect(lastPayload()?.rounds).toHaveLength(4), { timeout: 2000 });
    expect(lastPayload().did_more).toBe(true);
    expect(lastPayload().outcome).toBe("completed");
  });

  it("an offline entry stays on the device and syncs when back online", async () => {
    const online = vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    render(<InlinePrescriptionLog rx={lift} />);
    fireEvent.change(screen.getByLabelText("Weight 1"), { target: { value: "135" } });
    await new Promise((r) => setTimeout(r, 800));
    expect(mocks.write).not.toHaveBeenCalled();
    expect(pendingJobs().map((j) => j.id)).toContain("exercise_log:lift-proof");
    expect(screen.getByText(/Saved on this device/)).toBeInTheDocument();
    online.mockReturnValue(true);
    window.dispatchEvent(new Event("online"));
    await waitFor(() => expect(mocks.write).toHaveBeenCalled());
    await waitFor(() => expect(pendingJobs()).toHaveLength(0));
    online.mockRestore();
  });

  it("closing the pop-up (unmount) sends the pending value immediately", async () => {
    const v = render(<InlinePrescriptionLog rx={lift} />);
    fireEvent.change(screen.getByLabelText("Weight 1"), { target: { value: "95" } });
    v.unmount();
    await waitFor(() => expect(mocks.write).toHaveBeenCalled());
    expect(lastPayload().rounds[0]).toMatchObject({ set: 1, reps: 5, weight: 95 });
  });

  it("backgrounding the app sends the pending value immediately", async () => {
    render(<InlinePrescriptionLog rx={lift} />);
    fireEvent.change(screen.getByLabelText("Weight 2"), { target: { value: "105" } });
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    await waitFor(() => expect(mocks.write).toHaveBeenCalled());
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    expect(lastPayload().rounds[0]).toMatchObject({ set: 2, weight: 105 });
  });
});

describe("throws entered on a non-throwing-card row feed the arm ledger", () => {
  it("catch play 2 × 10 plus an added set of 10 records 30 throws in the arm ledger row", async () => {
    cleanup(); localStorage.clear(); vi.clearAllMocks();
    const online = vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    const cp = { id: "cp-proof", plan_date: "2099-10-11", movement_name: "Catch Play", movement_slug: "catch_play", slot: "supplemental", sets: 2, reps: 10, dosage_unit: "throws" } as any;
    render(<InlinePrescriptionLog rx={cp} />);
    fireEvent.change(screen.getByLabelText("Throws 1"), { target: { value: "12" } });
    fireEvent.change(screen.getByLabelText("Throws 2"), { target: { value: "8" } });
    fireEvent.click(screen.getByRole("button", { name: "Add set" }));
    fireEvent.change(screen.getByLabelText("Throws 3"), { target: { value: "10" } });
    const job = pendingJobs().find((j) => j.id === "arm:2099-10-11:catch_play") as any;
    expect(job.row).toMatchObject({ throw_type: "catch_play", count: 30, prescribed: 20, status: "done" });
    online.mockRestore();
  });
});
