import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ConditioningBaseRest } from "./ConditioningBaseRest";
import { ConditioningRestProvider, nextConditioningRest } from "./ConditioningRestContext";
afterEach(() => { cleanup(); vi.useRealTimers(); });
describe("base-running rest counter", () => {
  it("two prescribed doubles reach home, reset the counter and switch 30s to 300s", () => {
    render(<ConditioningBaseRest basesPerRep={2} />);
    fireEvent.click(screen.getByRole("button", { name: "Finished this running rep" }));
    expect(screen.getByText("Rest between reps time (0:30.00):")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Finished this running rep" }));
    expect(screen.getByText("Rest at home plate time (5:00.00):")).toBeVisible();
  });
  it("single, double, single across exercises share 30, 30, 300 seconds and zero bases", () => {
    let state = nextConditioningRest({ bases: 0, rest: null }, 1, 1000);
    expect(state.bases).toBe(1);
    expect(state.rest?.seconds).toBe(30);
    state = nextConditioningRest(state, 2, 2000);
    expect(state.bases).toBe(3);
    expect(state.rest?.seconds).toBe(30);
    state = nextConditioningRest(state, 1, 3000);
    expect(state.bases).toBe(0);
    expect(state.rest?.seconds).toBe(300);
    expect(state.rest?.startedAt).toBe(3000);
  });
  it("keeps the session's base count and running clock when changing exercise logs", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-21T04:00:00Z'));
    const tree = (rep: 1 | 2) => <ConditioningRestProvider><ConditioningBaseRest key={rep} basesPerRep={rep} /></ConditioningRestProvider>;
    const { rerender } = render(tree(1));
    fireEvent.click(screen.getByRole('button', { name: 'Finished this running rep' }));
    vi.setSystemTime(new Date('2026-10-21T04:00:05Z'));
    rerender(tree(2));
    expect(screen.getByText('0:25.00')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Finished this running rep' }));
    expect(screen.getByText('Rest between reps time (0:30.00):')).toBeVisible();
  });
});