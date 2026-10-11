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

describe("power primer pop-up logging", () => {
  it("logs from the top while its details remain closed, preserving the two-round limit", () => {
    const v = render(<PowerPrimerBlock pp={pp} planDate="2026-10-11" />);
    const host = state.host;
    if (!host) throw new Error("Missing log host");
    const top = within(host);
    const toggle = v.getByRole("button", { name: "Power Primer: First step" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(top.getByRole("textbox", { name: "Speed (sec (10 yd))" })).toBeVisible();
    expect(v.container.querySelector("[data-power-primer-entries]")).toBeNull();
    fireEvent.change(top.getByRole("textbox"), { target: { value: "1.50" } });
    fireEvent.click(top.getByRole("button", { name: "Round 1 done" }));
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.change(top.getByRole("textbox"), { target: { value: "1.49" } });
    fireEvent.click(top.getByRole("button", { name: "Round 2 done" }));
    expect(host.querySelector("[data-pap-stopped]")).not.toBeNull();
    expect(top.queryByRole("textbox")).toBeNull();
  });
  it("retains the throwing warm-up lock after portaling entries", () => {
    const v = render(<PowerPrimerBlock pp={{ ...pp, target: "throw", requires_throwing_warmup: true }} />);
    const host = state.host;
    if (!host) throw new Error("Missing log host");
    expect(within(host).queryByRole("textbox")).toBeNull();
    fireEvent.click(v.getByRole("button", { name: "Power Primer: Throwing speed" }));
    fireEvent.click(v.getByRole("checkbox"));
    expect(within(host).getByRole("textbox", { name: "Speed (mph)" })).toBeVisible();
  });
});