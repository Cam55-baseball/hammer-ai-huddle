import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UniversalSwapConversation } from "./UniversalSwapConversation";
import type { UniversalSwapMovement } from "@/lib/prescription/universalSwapCandidates";
import type { AtomicSwapSnapshot } from "@/lib/prescription/atomicSwap";

vi.mock("@/hooks/useCloseOnBack", () => ({ useCloseOnBack: vi.fn() }));
const original: UniversalSwapMovement = { slug: "machine", name: "Angled machine fastballs", primary_adaptation: "timing",
  cns_cost: 1, volume_cost: 1, contacts_per_rep: 0,
  is_active: true, movement_category: "hitting", substitution_family: "timing", dosage_unit: "reps",
  season_legality: { os_q1: true }, training_age_legality: { beginner: true }, sport_scope: "baseball",
  min_age_years: 13, contraindications: [], equipment_requirements: ["pitching_machine"] };
const flips = { ...original, slug: "flips", name: "Partner flips", equipment_requirements: ["partner", "screen", "ball", "net"] };
const expected: AtomicSwapSnapshot = { id: "rx", user_id: "athlete", plan_date: "2026-10-21", movement_slug: "machine",
  slot: "hitting", phase: "os_q1", sequence_order: 1, sequence_role: "skill", cns_cost: 1, cns_clamped: false,
  density_target_seconds: null, intensity_mode: null, rir_low: null, rir_high: null, intent_tag: "timing",
  execution_note: null, per_side: null, open_ended: null, set_range_max: null, adaptation: null,
  asymmetry_rule: null, engine: null, generator_version: null, rationale: null, cue_ids: null,
  validator_report: null, why_v2: null, why_payload: { rest_seconds: 30 },
  updated_at: "2026-10-21T05:00:00Z", status: "planned", sets: 3, reps: 10, total_reps: 30,
  dosage_unit: "reps", duration_seconds: null, distance_feet: null, load_pct: null, tempo: null };
const context = { category: "hitting", phase: "os_q1", trainingAge: "beginner", sport: "baseball",
  ageYears: 16, injuryRestrictions: [], sessionAllowed: true };
afterEach(cleanup);
function answers() {
  fireEvent.click(screen.getByRole("checkbox", { name: "pitching machine" }));
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  for (const label of ["a partner", "front toss screen", "balls", "net or cage"]) fireEvent.click(screen.getByRole("checkbox", { name: label }));
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  fireEvent.click(screen.getByRole("button", { name: "Always" }));
}
describe("staged Swap conversation safety", () => {
  it("AI-interpreted availability is reviewed through the same three questions, never saved automatically", async () => {
    const interpret = vi.fn().mockResolvedValue({ have: ["partner"], lacks: ["pitching_machine"] });
    const onSaved = vi.fn();
    render(<UniversalSwapConversation open onOpenChange={vi.fn()} expected={expected} original={original} catalog={[flips]} context={context} interpret={interpret} onSaved={onSaved} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Tell Hammers what you have today" }), { target: { value: "No machine today; I have a partner." } });
    fireEvent.click(screen.getByRole("button", { name: "Read my answer" }));
    await waitFor(() => expect(screen.getByRole("checkbox", { name: "pitching machine" })).toBeChecked());
    expect(interpret).toHaveBeenCalledWith("No machine today; I have a partner.");
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("checkbox", { name: "a partner" })).toBeChecked();
    expect(onSaved).not.toHaveBeenCalled();
  });
  it("a parent-closed unanswered visit never reuses prior availability on reopen", () => {
    const props = { open: true, onOpenChange: vi.fn(), expected, original, catalog: [flips], context, onSaved: vi.fn() };
    const { rerender } = render(<UniversalSwapConversation {...props} />);
    answers();
    rerender(<UniversalSwapConversation {...props} open={false} />);
    rerender(<UniversalSwapConversation {...props} />);
    expect(screen.getByRole('checkbox', { name: 'pitching machine' })).not.toBeChecked();
    expect(screen.queryByRole('button', { name: 'Partner flips' })).toBeNull();
  });
  it("a prior open visit cannot notify success after closing and reopening the same version", async () => {
    let finish: (() => void) | undefined;
    const transport = vi.fn().mockImplementation(request => new Promise(resolve => {
      finish = () => resolve({ state: 'saved', requestId: request.requestId, memorySaved: true,
        reason: 'Same 30 swings.', row: { ...expected, movement_slug: 'flips', updated_at: '2026-10-21T05:01:00Z' } });
    }));
    const onSaved = vi.fn();
    const props = { open: true, onOpenChange: vi.fn(), expected, original, catalog: [flips], context, transport, onSaved };
    const { rerender } = render(<UniversalSwapConversation {...props} />);
    answers(); fireEvent.click(screen.getByRole('button', { name: 'Partner flips' }));
    rerender(<UniversalSwapConversation {...props} open={false} />);
    rerender(<UniversalSwapConversation {...props} />);
    await act(async () => { finish?.(); });
    expect(onSaved).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Partner flips' })).toBeDisabled();
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it("answers all three questions but cannot save without the certified transaction", () => {
    const onSaved = vi.fn();
    render(<UniversalSwapConversation open onOpenChange={vi.fn()} expected={expected} original={original} catalog={[flips]} context={context} onSaved={onSaved} />);
    answers();
    expect(screen.getByRole("button", { name: "Partner flips" })).toBeDisabled();
    expect(onSaved).not.toHaveBeenCalled();
  });
  it("saves exact 30 reps and always memory together only after transaction confirmation", async () => {
    const transport = vi.fn().mockImplementation(request => Promise.resolve({ state: "saved", requestId: request.requestId,
      row: { ...expected, movement_slug: "flips", updated_at: "2026-10-21T05:01:00Z" }, memorySaved: true, reason: "Same timing work and 30 swings." }));
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
  it("an ambiguous save failure blocks a second write until fresh server reconciliation", async () => {
    const transport = vi.fn().mockRejectedValue(new Error("Timeout after possible commit"));
    render(<UniversalSwapConversation open onOpenChange={vi.fn()} expected={expected} original={original} catalog={[flips]} context={context} transport={transport} onSaved={vi.fn()} />);
    answers(); fireEvent.click(screen.getByRole("button", { name: "Partner flips" }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Partner flips" }));
    expect(transport).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Start again" })).toBeDisabled();
  });
  it("a completed old-account request cannot notify the new account", async () => {
    let finish: (() => void) | undefined;
    const transport = vi.fn().mockImplementation(request => new Promise(resolve => {
      finish = () => resolve({ state: "saved", requestId: request.requestId, memorySaved: true,
        reason: "Same 30 swings.", row: { ...expected, movement_slug: "flips", updated_at: "2026-10-21T05:01:00Z" } });
    }));
    const onSaved = vi.fn();
    const props = { open: true, onOpenChange: vi.fn(), expected, original, catalog: [flips], context, transport, onSaved };
    const { rerender } = render(<UniversalSwapConversation {...props} />);
    answers(); fireEvent.click(screen.getByRole("button", { name: "Partner flips" }));
    rerender(<UniversalSwapConversation {...props} expected={{ ...expected, user_id: "other" }} />);
    await act(async () => { finish?.(); });
    expect(onSaved).not.toHaveBeenCalled();
    expect(screen.getByRole("checkbox", { name: "pitching machine" })).not.toBeChecked();
  });
  it("closing and reopening the same saved version does not unlock an uncertain write", async () => {
    const transport = vi.fn().mockRejectedValue(new Error("Timeout"));
    const props = { open: true, onOpenChange: vi.fn(), expected, original, catalog: [flips], context, transport, onSaved: vi.fn() };
    const { rerender } = render(<UniversalSwapConversation {...props} />);
    answers(); fireEvent.click(screen.getByRole("button", { name: "Partner flips" }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    rerender(<UniversalSwapConversation {...props} open={false} />);
    rerender(<UniversalSwapConversation {...props} />);
    expect(screen.getByRole("button", { name: "Partner flips" })).toBeDisabled();
    expect(transport).toHaveBeenCalledTimes(1);
  });
});