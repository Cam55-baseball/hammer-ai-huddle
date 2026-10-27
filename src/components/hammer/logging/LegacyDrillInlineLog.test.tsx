import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LegacyDrillInlineLog, focusTimedRow } from "./LegacyDrillInlineLog";
import { FocusSession } from "../cards/FocusSession";

describe("LegacyDrillInlineLog return from background", () => {
  it('a mixed circuit timer records only its timed component, never an earlier rep row',()=>{
    const fieldsAt=(row:number)=>[{key:row===2?'time':'reps'}];
    expect(focusTimedRow([{reps:'12'},{reps:''},{time:''},{reps:''}],fieldsAt)).toBe(2);
    expect(focusTimedRow([{reps:'12'},{reps:''},{time:'30',_t:'1'},{reps:''}],fieldsAt)).toBe(-1);
  });
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
    fireEvent.blur(screen.getByLabelText("ir reps 1"));
    expect(saved.mock.lastCall?.[0].rounds).toEqual([{ set: 1, reps_0: 11, reps_1: 12, reps_2: null }]);
  });
  it("mixed components keep separate declared sets and never record an untouched target", () => {
    const saved = vi.fn();
    render(<LegacyDrillInlineLog modality="throwing" name="Band prep" dosage="ER 2x12 per arm, opener 1x30 seconds, scap pulls 3x10" storageKey="mixed-rows-proof" completed={false} onSave={saved} />);
    expect(screen.getByLabelText("Reps per arm 1")).toHaveValue("");
    fireEvent.focus(screen.getByLabelText("Reps per arm 1"));
    expect(saved.mock.lastCall?.[0].rounds).toEqual([]);
    fireEvent.change(screen.getByLabelText("Reps per arm 1"), { target: { value: "12" } });
    expect(saved.mock.lastCall?.[0].rounds).toEqual([{set:1,reps:12}]);
    expect(screen.queryByRole("button", {name:"Add set"})).not.toBeInTheDocument();
    expect(saved.mock.lastCall?.[0].components).toHaveLength(6);
  });
  it("guided circuits require every component entered before Next can save the existing set", () => {
    render(<FocusSession active storageKey="compound-focus" onExit={() => {}}><LegacyDrillInlineLog modality="throwing" name="Band series" dosage="ER 1x12, IR 1x12, retractions 1x10" storageKey="compound-focused" completed={false} onSave={vi.fn()} /></FocusSession>);
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("er reps 1"), { target: { value: "11" } });
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    fireEvent.blur(screen.getByLabelText("ir reps 1"));
    fireEvent.blur(screen.getByLabelText("retractions reps 1"));
    expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();
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