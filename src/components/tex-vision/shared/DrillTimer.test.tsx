import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DrillTimer } from "./DrillTimer";
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
afterEach(() => { cleanup(); vi.useRealTimers(); });
describe("Tex Vision elapsed time", () => {
  it("reports 1.47 seconds rather than a whole-second tick", () => {
    vi.useFakeTimers(); const tick = vi.fn();
    render(<DrillTimer mode="countup" onTick={tick} />);
    fireEvent.click(screen.getByRole("button", { name: "Start timer" }));
    act(() => vi.advanceTimersByTime(1470));
    expect(tick).toHaveBeenLastCalledWith(1.47);
  });
  it("completes a fractional target exactly once and does not auto-restart", () => {
    vi.useFakeTimers(); const complete = vi.fn();
    render(<DrillTimer autoStart initialSeconds={1.47} onComplete={complete} />);
    act(() => vi.advanceTimersByTime(1460));
    expect(complete).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(10));
    expect(complete).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(5000));
    expect(complete).toHaveBeenCalledTimes(1);
  });
});