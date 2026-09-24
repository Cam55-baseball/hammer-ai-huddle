import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const save = vi.fn();
const undo = vi.fn();
let enabled = true;
vi.mock("@/hooks/useScheduleTimeline", () => ({
  useScheduleTimeline: () => ({ enabled, entries: [], save, undo, loading: false, switchOn: enabled }),
}));
vi.mock("@/hooks/useSeasonStatus", () => ({ useSeasonStatus: () => ({ updateSeasonStatus: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), message: vi.fn() }) }));

import { TellHammersInbox } from "@/components/hammer/TellHammersInbox";

beforeEach(() => {
  enabled = true;
  save.mockReset();
  save.mockResolvedValue({ merged: false, entry: { id: "x" }, message: "Got it — break. Hammer re-planned your week." });
});

describe("Tell Hammers — child-simple paths", () => {
  it("shows the eight big buttons", () => {
    render(<TellHammersInbox />);
    for (const id of ["games", "season", "cancelled", "pain", "break", "event", "travel", "resume"]) {
      expect(screen.getByTestId(`tell-${id}`)).toBeTruthy();
    }
  });

  it("'I need a break' saves in 2 taps, no typing", async () => {
    render(<TellHammersInbox />);
    fireEvent.click(screen.getByTestId("tell-break")); // tap 1
    fireEvent.click(screen.getByTestId("hold-7")); // tap 2
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save.mock.calls[0][0]).toMatchObject({ tag: "HOLD", payload: { reason: "break" } });
  });

  it("'Something hurts' saves in 3 taps: where → face", async () => {
    render(<TellHammersInbox />);
    fireEvent.click(screen.getByTestId("tell-pain")); // 1
    fireEvent.click(screen.getByTestId("pain-shoulder")); // 2
    fireEvent.click(screen.getByTestId("face-lot")); // 3
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save.mock.calls[0][0]).toMatchObject({ tag: "PAIN", payload: { region: "shoulder", face: "lot" } });
  });

  it("'Back to normal' is one tap", async () => {
    render(<TellHammersInbox />);
    fireEvent.click(screen.getByTestId("tell-resume"));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save.mock.calls[0][0].tag).toBe("RESUME");
  });

  it("shows what changed with a one-tap Undo after saving", async () => {
    render(<TellHammersInbox />);
    fireEvent.click(screen.getByTestId("tell-resume"));
    await waitFor(() => expect(screen.getByTestId("tell-hammers-result").textContent).toMatch(/re-planned/));
  });

  it("Ask Hammer asks before saving", async () => {
    render(<TellHammersInbox />);
    fireEvent.click(screen.getByTestId("tell-ask"));
    fireEvent.change(screen.getByTestId("ask-text"), { target: { value: "games cancelled oct 5 to 19" } });
    fireEvent.click(screen.getByTestId("ask-review"));
    expect(save).not.toHaveBeenCalled();
    expect(screen.getByTestId("ask-confirm").textContent).toMatch(/No games October 5 to October 19|No games October 5 to 19/);
    fireEvent.click(screen.getByTestId("ask-yes"));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save.mock.calls[0][1]).toBe("ask_hammer");
  });

  it("switch off → nothing renders (today's screen unchanged)", () => {
    enabled = false;
    const { container } = render(<TellHammersInbox />);
    expect(container.innerHTML).toBe("");
  });
});
