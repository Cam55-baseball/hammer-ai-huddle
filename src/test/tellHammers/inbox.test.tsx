import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const save = vi.fn();
const undo = vi.fn();
let enabled = true;
vi.mock("@/hooks/useScheduleTimeline", () => ({
  useScheduleTimeline: () => ({ enabled, entries: [], save, undo, loading: false, switchOn: enabled }),
}));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), message: vi.fn() }) }));

import { TellHammersInbox } from "@/components/hammer/TellHammersInbox";

beforeEach(() => {
  localStorage.clear(); enabled = true; save.mockReset(); undo.mockReset();
  save.mockImplementation(async (d) => ({ merged: false, entry: { ...d, id: String(save.mock.calls.length), created_at: new Date().toISOString() }, message: "Hammer re-planned your week." }));
});
const open = () => fireEvent.click(screen.getByRole("button", { name: /Tell Hammer/i }));
const send = () => fireEvent.click(screen.getByTestId("entry-send"));

describe("Tell Hammer shared entry flow", () => {
  it("starts closed; opens to exactly eight choices and no filter or example button", () => {
    render(<TellHammersInbox />);
    expect(screen.queryByTestId("tell-break")).toBeNull();
    open();
    for (const key of ["games", "season", "cancelled", "pain", "break", "event", "travel", "resume"]) expect(screen.getByTestId(`tell-${key}`)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "All" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Close Tell Hammer" }));
    expect(screen.queryByTestId("tell-break")).toBeNull();
  });
  it("sends two entries in a row and confirms each without closing", async () => {
    render(<TellHammersInbox />); open();
    fireEvent.click(screen.getByTestId("tell-break"));
    fireEvent.click(screen.getByTestId("hold-7")); send();
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId("tell-hammers-result").textContent).toMatch(/Got it — Hammer has it/);
    fireEvent.click(screen.getByTestId("tell-resume")); send();
    await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId("tell-hammers-result").textContent).toMatch(/Got it — Hammer has it/);
    expect(screen.getByText("Sent today")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /^Undo / })).toHaveLength(2);
  });
  it("Back returns without saving", () => {
    render(<TellHammersInbox />); open(); fireEvent.click(screen.getByTestId("tell-pain"));
    fireEvent.click(screen.getAllByRole("button", { name: /^Back$/i })[0]);
    expect(screen.getByTestId("tell-break")).toBeTruthy(); expect(save).not.toHaveBeenCalled();
  });
  it("dated text-only break asks before changing the plan", async () => {
    render(<TellHammersInbox />); open(); fireEvent.click(screen.getByTestId("tell-break"));
    fireEvent.change(screen.getByTestId("entry-text"), { target: { value: "off Thursday and Friday" } }); send();
    expect(screen.getByTestId("ask-confirm")).toBeTruthy(); expect(save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("ask-yes"));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save.mock.calls[0][0].tag).toBe("HOLD");
  });
  it("unreadable text is only a note", async () => {
    render(<TellHammersInbox />); open(); fireEvent.click(screen.getByTestId("tell-break"));
    fireEvent.change(screen.getByTestId("entry-text"), { target: { value: "I might need some time" } }); send();
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save.mock.calls[0][0]).toMatchObject({ tag: "NOTE", payload: { kind: "free_text" } });
    expect(screen.getByTestId("tell-hammers-result").textContent).toMatch(/Saved your note/);
  });
  it("pain text preserves region and face and shows safety warning", async () => {
    render(<TellHammersInbox />); open(); fireEvent.click(screen.getByTestId("tell-pain"));
    fireEvent.click(screen.getByTestId("pain-shoulder")); fireEvent.click(screen.getByTestId("face-lot"));
    fireEvent.change(screen.getByTestId("entry-text"), { target: { value: "tingling in my shoulder" } });
    expect(screen.getByRole("alert").textContent).toMatch(/Stop and get it checked/);
    send(); await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save.mock.calls[0][0]).toMatchObject({ tag: "PAIN", payload: { region: "shoulder", face: "lot", text: "tingling in my shoulder" } });
  });
  it("disabled timeline renders no entries", () => {
    enabled = false;
    expect(render(<TellHammersInbox />).container.innerHTML).toBe("");
  });
});
