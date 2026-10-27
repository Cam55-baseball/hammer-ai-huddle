import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LegacyDrillInlineLog } from "./LegacyDrillInlineLog";

describe("LegacyDrillInlineLog return from background", () => {
  beforeEach(() => {
    sessionStorage.clear(); localStorage.clear();
    vi.useFakeTimers();
  });
  it("does not count untouched component prefills as performed work and retains edited values on reload", () => {
    const saved = vi.fn();
    const props = { modality: "throwing", name: "Band series", dosage: "ER 2x12, IR 2x12, retractions 2x10", storageKey: "compound-proof", completed: false, onSave: saved };
    const view = render(<LegacyDrillInlineLog {...props} />);
    fireEvent.change(screen.getByLabelText("er reps 1"), { target: { value: "11" } });
    expect(saved.mock.lastCall?.[0].rounds).toEqual([{ set: 1, reps_0: 11, reps_1: null, reps_2: null }]);
    view.unmount(); render(<LegacyDrillInlineLog {...props} />);
    expect(screen.getByLabelText("er reps 1")).toHaveValue("11");
    fireEvent.change(screen.getByLabelText("ir reps 1"), { target: { value: "12" } });
    expect(saved.mock.lastCall?.[0].rounds).toEqual([{ set: 1, reps_0: 11, reps_1: 12, reps_2: null }]);
  });

  it.each([
    ["30 seconds", 30_000],
    ["5 minutes", 5 * 60_000],
    ["1 hour", 60 * 60_000],
  ])("keeps the exact open log and unsaved value after %s", (_label, elapsed) => {
    render(
      <LegacyDrillInlineLog
        modality="conditioning"
        name="Tempo runs"
        dosage="2 reps × 30 yd"
        storageKey="return-test"
        completed={false}
        onSave={vi.fn()}
      />,
    );

    const distance = screen.getByLabelText("Distance 1");
    fireEvent.change(distance, { target: { value: "88" } });
    fireEvent(document, new Event("visibilitychange"));
    vi.advanceTimersByTime(elapsed);
    fireEvent(window, new Event("pageshow"));

    expect(screen.getByText("Log this work")).toBeVisible();
    expect(distance).toHaveValue("88");
    expect(localStorage.getItem("return-test")).toContain('"distance":"88"');
  });
});