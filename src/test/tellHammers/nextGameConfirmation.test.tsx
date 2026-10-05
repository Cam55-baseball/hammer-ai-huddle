import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const save = vi.fn();
let entries: Array<{ tag: string; start_date: string; undone_at: null; payload: { kind: string; answer: string } }> = [];
vi.mock("@/hooks/useScheduleTimeline", () => ({
  useScheduleTimeline: () => ({ enabled: true, entries, save }),
}));
import { NextGameConfirmation } from "@/components/checkin/NextGameConfirmation";

beforeEach(() => { save.mockReset(); entries = []; save.mockResolvedValue({}); });
describe("next-game morning confirmation", () => {
  it("saves Nothing's changed independently of an unselected game", async () => {
    render(<NextGameConfirmation />);
    fireEvent.click(screen.getByRole("button", { name: "Nothing's changed" }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save.mock.calls[0][0]).toMatchObject({ tag: "NOTE", payload: { kind: "next_game_answer", answer: "no_change" } });
  });
  it("Done saves a chosen game and retains it after a failed save", async () => {
    save.mockRejectedValueOnce(new Error("offline"));
    render(<NextGameConfirmation />);
    fireEvent.click(screen.getByRole("button", { name: "This week" }));
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/wasn't saved/));
    expect(screen.getByRole("button", { name: "This week" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
    expect(save.mock.calls[1][0]).toMatchObject({ payload: { kind: "next_game_answer", answer: "this_week" } });
  });
});