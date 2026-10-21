import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UniversalSwapConversation } from "./UniversalSwapConversation";
import type { UniversalSwapMovement } from "@/lib/prescription/universalSwapCandidates";
import type { AtomicSwapSnapshot } from "@/lib/prescription/atomicSwap";

vi.mock("@/hooks/useCloseOnBack", () => ({ useCloseOnBack: vi.fn() }));
const original: UniversalSwapMovement = { slug: "machine", name: "Angled machine fastballs", primary_adaptation: "timing",
  is_active: true, movement_category: "hitting", substitution_family: "timing", dosage_unit: "reps",
  season_legality: { os_q1: true }, training_age_legality: { beginner: true }, sport_scope: "baseball",
  min_age_years: 13, contraindications: [], equipment_requirements: ["pitching_machine"] };
const flips = { ...original, slug: "flips", name: "Partner flips", equipment_requirements: ["partner", "screen", "ball", "net"] };
const expected: AtomicSwapSnapshot = { id: "rx", user_id: "athlete", plan_date: "2026-10-21", movement_slug: "machine",
  updated_at: "2026-10-21T05:00:00Z", status: "planned", sets: 3, reps: 10, total_reps: 30,
  dosage_unit: "reps", duration_seconds: null, distance_feet: null, load_pct: null, tempo: null };
const context = { category: "hitting", phase: "os_q1", trainingAge: "beginner", sport: "baseball",
  ageYears: 16, injuryRestrictions: [], sessionAllowed: true };
afterEach(cleanup);
function answers() {
  fireEvent.click(screen.getByRole("checkbox", { name: "pitching machine" }));
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  for (const label of ["partner", "front toss screen", "balls", "net or cage"]) fireEvent.click(screen.getByRole("checkbox", { name: label }));
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  fireEvent.click(screen.getByRole("button", { name: "Always" }));
}
describe("staged Swap conversation safety", () => {
  it("answers all three questions but cannot save without the certified transaction", () => {
    const onSaved = vi.fn();
    render(<UniversalSwapConversation open onOpenChange={vi.fn()} expected={expected} original={original} catalog={[flips]} context={context} onSaved={onSaved} />);
    answers();
    expect(screen.getByRole("button", { name: "Partner flips" })).toBeDisabled();
    expect(onSaved).not.toHaveBeenCalled();
  });
  it("saves exact 30 reps and always memory together only after transaction confirmation", async () => {
    const transport = vi.fn().mockImplementation(request => Promise.resolve({ state: "saved", requestId: request.requestId,
      row: { ...expected, movement_slug: "flips" }, memorySaved: true, reason: "Same timing work and 30 swings." }));
    const onSaved = vi.fn();
    render(<UniversalSwapConversation open onOpenChange={vi.fn()} expected={expected} original={original} catalog={[flips]} context={context} transport={transport} onSaved={onSaved} />);
    answers(); fireEvent.click(screen.getByRole("button", { name: "Partner flips" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(transport.mock.calls[0][0]).toMatchObject({ expected: { sets: 3, reps: 10, total_reps: 30 }, memoryScope: "always" });
  });
  it("changing accounts clears the unanswered draft before a swap can be offered", () => {
    const props = { open: true, onOpenChange: vi.fn(), expected, original, catalog: [flips], context, onSaved: vi.fn() };
    const { rerender } = render(<UniversalSwapConversation {...props} />);
    answers();
    rerender(<UniversalSwapConversation {...props} expected={{ ...expected, user_id: "other" }} />);
    expect(screen.getByRole("checkbox", { name: "pitching machine" })).not.toBeChecked();
    expect(screen.queryByRole("button", { name: "Partner flips" })).toBeNull();
  });
});