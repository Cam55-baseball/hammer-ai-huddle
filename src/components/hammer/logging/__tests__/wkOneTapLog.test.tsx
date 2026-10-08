import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const inserts: any[] = [];
const updates: any[] = [];

vi.mock("@/integrations/supabase/client", () => {
  const chain = (table: string) => {
    const q: any = {
      select: () => q, eq: (_c: string, v: any) => { if (q._upd) { updates.push({ table, ...q._upd, id: v }); } return q; },
      order: () => q, limit: () => Promise.resolve({ data: [], error: null }),
      insert: (row: any) => { inserts.push({ table, row }); return Promise.resolve({ error: null }); },
      update: (v: any) => { q._upd = v; return q; },
      then: (r: any) => Promise.resolve({ data: null, error: null }).then(r),
    };
    return q;
  };
  return { supabase: { from: (t: string) => chain(t) } };
});
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));
vi.mock("@/hooks/useFeatureSwitches", () => ({ useFeatureSwitches: () => ({ isEnabled: (k: string) => k === "one_tap_logging" }) }));
vi.mock("@/hooks/useVerifiedMax", () => ({ useVerifiedMax: () => null }));
vi.mock("@/components/hammer/HammersTodayProvider", () => ({ useHammersToday: () => ({}) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { WkOneTapLog } from "../WkOneTapLog";

const rx: any = { id: "rx1", plan_date: "2026-10-08", movement_slug: "goblet_squat", sets: 3, reps: 5, load_pct: null };

function mount() {
  render(<QueryClientProvider client={new QueryClient()}><WkOneTapLog rx={rx} /></QueryClientProvider>);
}

describe("one-tap logging saves each outcome per the completion rules", () => {
  beforeEach(() => { inserts.length = 0; updates.length = 0; });

  it("Done → full log, card completed", async () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    await waitFor(() => expect(updates.length).toBe(1));
    expect(inserts[0].row).toMatchObject({ prescription_id: "rx1", sets_completed: 3, reps_completed: [5, 5, 5] });
    expect(inserts[0].row.metrics.one_tap_outcome).toBe("completed");
    expect(updates[0]).toMatchObject({ table: "wk_prescriptions", status: "completed", id: "rx1" });
  });

  it("Skipped → zero sets, card skipped", async () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Skipped" }));
    await waitFor(() => expect(updates.length).toBe(1));
    expect(inserts[0].row).toMatchObject({ sets_completed: 0, reps_completed: null, load_used: null });
    expect(inserts[0].row.metrics.one_tap_outcome).toBe("skipped");
    expect(updates[0].status).toBe("skipped");
  });

  it("Cut short → tagged cut short, card completed (not a skip)", async () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Cut short" }));
    await waitFor(() => expect(updates.length).toBe(1));
    expect(inserts[0].row.metrics).toMatchObject({ one_tap_outcome: "cut_short", cut_short: true });
    expect(updates[0].status).toBe("completed");
  });
});
