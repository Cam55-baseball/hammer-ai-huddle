import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, within, cleanup } from "@testing-library/react";
import { PowerPrimerBlock, type PowerPrimerPayload } from "./PowerPrimerBlock";

const state = vi.hoisted(() => ({ host: null as HTMLElement | null }));
vi.mock("@/components/hammer/cards/PocketCard", () => ({ usePocketLogHost: () => state.host }));
vi.mock("@/hooks/useAuth", () => ({ useOptionalAuth: () => ({ user: null }) }));
vi.mock("@tanstack/react-query", () => ({ useQuery: () => ({ data: null }), useQueryClient: () => ({ invalidateQueries: vi.fn() }) }));
const pp: PowerPrimerPayload = {
  target: "first_step", primer: { source: "lift", name: "Trap Bar Deadlift", reps: [3, 5], heavy: true },
  action: { name: "10-yard sprint", reps: [1, 1] }, rest_s: [120, 180], max_sets: 2,
  max_total_reps: null, half_volume: false, stop: { kind: "sprint", drop_pct: 3 },
  stop_buttons: ["Pain"], requires_throwing_warmup: false,
};
beforeEach(() => { localStorage.clear(); state.host = document.createElement("div"); document.body.append(state.host); });
afterEach(() => { cleanup(); state.host?.remove(); state.host = null; localStorage.clear(); });

vi.mock("@/lib/logging/logOutbox", () => ({ enqueue: vi.fn(), sendJob: vi.fn(async () => true) }));

describe("power primer built into the lift", () => {
  it("interleaves lift sets with rated all-out sets and stops after a 3/5", () => {
    const v = render(<PowerPrimerBlock pp={{ ...pp, max_sets: 4 }} planDate="2026-10-11" liftName="Trap Bar Deadlift" liftSets={4} />);
    const top = within(state.host!);
    expect(top.getByText("All-out effort — this is what we measure")).toBeVisible();
    fireEvent.click(top.getByRole("button", { name: "5/5 Felt excellent" }));
    expect(state.host!.querySelectorAll("[data-primer-explosive]").length).toBe(2);
    fireEvent.click(top.getByRole("button", { name: "3/5 Lost snap" }));
    expect(state.host!.querySelector("[data-pap-stopped]")?.textContent).toMatch(/last all-out set/);
    expect(state.host!.querySelectorAll("[data-primer-explosive]").length).toBe(2);
    expect(state.host!.querySelectorAll("[data-primer-lift-set]").length).toBe(4);
    expect(v.getByRole("button", { name: /how the heavy set \+ all-out effort works/ })).toHaveAttribute("aria-expanded", "false");
  });
  it("keeps the throwing warm-up lock; lift sets still go ahead", () => {
    render(<PowerPrimerBlock pp={{ ...pp, target: "throw", requires_throwing_warmup: true }} liftSets={3} />);
    expect(state.host!.querySelector("[data-primer-explosive]")).toBeNull();
    expect(state.host!.textContent).toMatch(/unlock after your throwing warm-up/);
  });
});
