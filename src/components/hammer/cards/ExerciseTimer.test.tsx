import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ExerciseTimer } from "./ExerciseTimer";
afterEach(() => { cleanup(); vi.useRealTimers(); });
describe("actual exercise time", () => {
  it("records 1.47 seconds, excludes paused time and resumes", () => {
    vi.useFakeTimers(); const record = vi.fn();
    render(<ExerciseTimer target={30} onRecord={record} />);
    fireEvent.click(screen.getByRole("button", { name: "Start timer" }));
    act(() => vi.advanceTimersByTime(1470));
    fireEvent.click(screen.getByRole("button", { name: "Pause timer" }));
    expect(record).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(5000));
    fireEvent.click(screen.getByRole("button", { name: "Resume timer" }));
    act(() => vi.advanceTimersByTime(530));
    fireEvent.click(screen.getByRole("button", { name: "Stop timer" }));
    expect(record).toHaveBeenLastCalledWith(2);
    expect(record).toHaveBeenCalledTimes(1);
  });
  it("restart resets the clock and countdown records actual completion", () => {
    vi.useFakeTimers(); const record = vi.fn();
    render(<ExerciseTimer target={2} onRecord={record} />);
    fireEvent.click(screen.getByRole("button", { name: "Start timer" }));
    act(() => vi.advanceTimersByTime(1470));
    fireEvent.click(screen.getByRole("button", { name: "Restart timer" }));
    act(() => vi.advanceTimersByTime(2000));
    expect(record).toHaveBeenLastCalledWith(2);
    fireEvent.click(screen.getByRole("button", { name: "Reset timer" }));
    expect(screen.getByLabelText("Remaining seconds").textContent).toBe("2.00 s");
  });
});