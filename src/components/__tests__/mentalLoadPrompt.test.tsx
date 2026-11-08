// Release A2: the optional "How mentally draining was it?" prompt.
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { MentalLoadPrompt } from "../mentalLoad/MentalLoadPrompt";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), on: true, minutes: { royal_timing: 15 } as Record<string, number> }));
vi.mock("@/hooks/useFeatureSwitches", () => ({ useFeatureSwitches: () => ({ loading: false, isEnabled: (k: string) => k === "mental_load_v1" && mocks.on }) }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: mocks.rpc,
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { setting_value: mocks.minutes }, error: null }) }) }) }),
  },
}));
const wrap = (ui: ReactNode) => render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);

describe("mental-load prompt", () => {
  beforeEach(() => { mocks.on = true; mocks.rpc.mockReset().mockResolvedValue({ data: { saved: true, ledger: "saved" }, error: null }); });

  it("one tap saves rating × prescribed minutes on the activity", async () => {
    wrap(<MentalLoadPrompt activity="royal_timing" activityId="s1" activityDate="2026-11-20" kind="royal_timing" />);
    await waitFor(() => expect((screen.getByRole("button", { name: "7 out of 10" }) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByRole("button", { name: "7 out of 10" }));
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledWith("record_mental_load", {
      _activity: "royal_timing", _activity_id: "s1", _rating: 7, _minutes: 15, _minutes_source: "prescribed", _activity_date: "2026-11-20",
    }));
    expect(await screen.findByRole("status")).toBeTruthy();
  });

  it("tracked minutes are used when the card recorded them", async () => {
    wrap(<MentalLoadPrompt activity="baserunning_iq" activityId="a1" activityDate="2026-11-20" kind="baserunning_iq" trackedMinutes={2.5} />);
    await waitFor(() => expect((screen.getByRole("button", { name: "4 out of 10" }) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByRole("button", { name: "4 out of 10" }));
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledWith("record_mental_load", expect.objectContaining({ _rating: 4, _minutes: 2.5, _minutes_source: "tracked" })));
  });

  it("Skip saves nothing (unknown) and hides the prompt", async () => {
    wrap(<MentalLoadPrompt activity="mind_item" activityId="m1" activityDate="2026-11-20" kind="situations" />);
    fireEvent.click(await screen.findByRole("button", { name: "Skip" }));
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("How mentally draining was it?")).toBeNull();
  });

  it("switch off: no prompt at all", () => {
    mocks.on = false;
    wrap(<MentalLoadPrompt activity="mind_item" activityId="m1" activityDate="2026-11-20" kind="situations" />);
    expect(screen.queryByLabelText("How mentally draining was it?")).toBeNull();
  });
});
