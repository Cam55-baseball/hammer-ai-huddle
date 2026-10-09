import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
vi.mock("@/hooks/useExerciseLog", () => ({ useLatestExerciseLog: () => ({ data: null }), useSaveExerciseLog: () => ({ mutateAsync: vi.fn(), isPending: false }) }));
import { InlinePrescriptionLog } from "./InlinePrescriptionLog";

describe("speed card rep timer", () => {
  it("sits with the rep rows and stopping fills the next rep's time", () => {
    vi.useFakeTimers();
    render(<InlinePrescriptionLog rx={{ id: "t1", plan_date: "2026-10-09", movement_slug: "sp_fly_20", movement_name: "Fly 20", slot: "speed", sets: 3, reps: 1, distance_feet: 60 } as any} />);
    fireEvent.click(screen.getByRole("button", { name: "Start timer" }));
    vi.advanceTimersByTime(3200);
    fireEvent.click(screen.getByRole("button", { name: "Stop timer" }));
    expect(Number((screen.getByLabelText("Time 1") as HTMLInputElement).value)).toBeCloseTo(3.2, 1);
    expect((screen.getByLabelText("Time 2") as HTMLInputElement).value).toBe("");
    vi.useRealTimers();
  });
});
