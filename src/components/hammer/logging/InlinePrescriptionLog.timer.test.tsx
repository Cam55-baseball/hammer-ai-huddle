import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
vi.mock("@/hooks/useExerciseLog", () => ({ useLatestExerciseLog: () => ({ data: null }), useSaveExerciseLog: () => ({ mutateAsync: vi.fn(), isPending: false }) }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ invalidateQueries: vi.fn() }) }));
import { InlinePrescriptionLog } from "./InlinePrescriptionLog";
import { liftRestBand } from "../cards/RestTimer";

describe("speed card rep timer", () => {
  it("retains existing lift rest bands and the saved prescription rest override", () => {
    expect(liftRestBand({ load_pct: 85 }).min).toBe(180);
    expect(liftRestBand({ load_pct: 70 })).toMatchObject({ min: 120, max: 150 });
    expect(liftRestBand({ movement_slug: "plank_hold" })).toMatchObject({ min: 60, max: 90 });
    expect(liftRestBand({ rest_seconds: 150, load_pct: 85 })).toMatchObject({ min: 150, max: 150 });
  });
  it("sits with the rep rows and stopping fills the next rep's time", () => {
    vi.useFakeTimers();
    render(<InlinePrescriptionLog rx={{ id: "t1", plan_date: "2026-10-09", movement_slug: "sp_fly_20", movement_name: "Fly 20", slot: "speed", sets: 3, reps: 1, distance_feet: 60 } as any} />);
    fireEvent.click(screen.getByRole("button", { name: "Start timer" }));
    act(() => vi.advanceTimersByTime(3200));
    fireEvent.click(screen.getByRole("button", { name: "Stop timer" }));
    expect(Number((screen.getByLabelText("Time 1") as HTMLInputElement).value)).toBeCloseTo(3.2, 1);
    expect((screen.getByLabelText("Time 2") as HTMLInputElement).value).toBe("");
    vi.useRealTimers();
  });
});
