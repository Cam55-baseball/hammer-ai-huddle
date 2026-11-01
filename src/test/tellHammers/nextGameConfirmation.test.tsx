import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { nextGameQuestionNeeded } from "@/lib/hammer/tellHammers/nextGameQuestion";

const save = vi.fn();
let entries: any[] = [];
let season: string | null = "in_season";
vi.mock("@/hooks/useScheduleTimeline", () => ({ useScheduleTimeline: () => ({ enabled: true, entries, save }) }));
vi.mock("@/hooks/usePhaseState", () => ({ usePhaseState: () => ({ phaseState: season ? { season } : null }) }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));
vi.mock("@/integrations/supabase/client", () => {
  const chain: any = { select: () => chain, eq: () => chain, is: () => chain, gte: () => chain, not: () => chain, limit: () => Promise.resolve({ data: [], error: null }) };
  return { supabase: { from: () => chain } };
});
vi.mock("@/utils/dateUtils", async (orig) => ({ ...(await orig() as any), getTodayDate: () => "2026-11-02" }));
import { NextGameConfirmation } from "@/components/checkin/NextGameConfirmation";

beforeEach(() => { save.mockReset(); entries = []; season = "in_season"; save.mockResolvedValue({}); });

describe("next game question: only when the schedule is unclear", () => {
  const base = { today: "2026-11-02", entries: [], loggedGameDates: [] as string[] };
  it("asks in-season with no upcoming game", () => expect(nextGameQuestionNeeded({ ...base, season: "in_season" })).toBe(true));
  it("does not ask off-season", () => expect(nextGameQuestionNeeded({ ...base, season: "off_season" })).toBe(false));
  it("does not ask when a game is entered on the schedule", () =>
    expect(nextGameQuestionNeeded({ ...base, season: "in_season", entries: [{ tag: "GAME", start_date: "2026-11-05", dates: ["2026-11-05"], undone_at: null }] })).toBe(false));
  it("does not ask when a logged game is upcoming", () => expect(nextGameQuestionNeeded({ ...base, season: "in_season", loggedGameDates: ["2026-11-04"] })).toBe(false));
  it("does not ask when games can't be read", () => expect(nextGameQuestionNeeded({ ...base, season: "in_season", loggedGameDates: null })).toBe(false));
});

describe("next game question screen", () => {
  it("has no Done / Nothing's changed buttons and saves No game scheduled", async () => {
    render(<NextGameConfirmation />);
    expect(screen.queryByRole("button", { name: "Done" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Nothing's changed" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "No game scheduled" }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save.mock.calls[0][0]).toMatchObject({ tag: "NOTE", payload: { kind: "next_game_answer", answer: "none_scheduled" } });
  });
  it("is hidden off-season", () => {
    season = "off_season";
    const { container } = render(<NextGameConfirmation />);
    expect(container.textContent).toBe("");
  });
});
