import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import { FocusSession, useFocusExercise } from "./FocusSession";
import { ConditioningRestProvider } from "./ConditioningRestContext";
afterEach(() => { cleanup(); vi.useRealTimers(); sessionStorage.clear(); });
function Entry({ save, rest, bases }: { save: () => Promise<void>; rest: number; bases?: 1 | 2 }) {
  useFocusExercise({ id: "exercise", name: "Run", rows: 2, ready: [true, true], restSeconds: rest, bases, save });
  return null;
}
describe("guided canonical set progression", () => {
  it("saves before rest and advances only after the prescribed 60 seconds", async () => {
    vi.useFakeTimers(); const save = vi.fn(async () => {});
    render(<FocusSession active storageKey="focus-proof" onExit={() => {}}><Entry save={save} rest={60} /></FocusSession>);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Next" })));
    expect(save).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("heading").textContent).toContain("Set 1 of 2");
    await act(async () => vi.advanceTimersByTime(59900));
    expect(screen.getByRole("heading").textContent).toContain("Set 1 of 2");
    await act(async () => vi.advanceTimersByTime(100));
    expect(screen.getByRole("heading").textContent).toContain("Set 2 of 2");
  });
  it("does not advance when saving fails", async () => {
    const save = vi.fn(async () => { throw new Error("failed"); });
    render(<FocusSession active storageKey="focus-proof" onExit={() => {}}><Entry save={save} rest={60} /></FocusSession>);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Next" })));
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByRole("heading").textContent).toContain("Set 1 of 2");
  });
  it("two declared doubles use 30 seconds then 300 seconds", async () => {
    vi.useFakeTimers(); const save = vi.fn(async () => {});
    render(<ConditioningRestProvider><FocusSession active storageKey="focus-proof" onExit={() => {}}><Entry save={save} rest={1} bases={2} /></FocusSession></ConditioningRestProvider>);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Next" })));
    expect(JSON.parse(sessionStorage.getItem("focus-proof") ?? "{}").restSeconds).toBe(30);
    await act(async () => vi.advanceTimersByTime(30000));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Next" })));
    expect(JSON.parse(sessionStorage.getItem("focus-proof") ?? "{}").restSeconds).toBe(300);
  });
});