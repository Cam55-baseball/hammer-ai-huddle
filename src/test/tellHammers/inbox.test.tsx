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
    fireEvent.click(screen.getByTestId("hold-7"));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId("tell-hammers-result").textContent).toMatch(/Got it — Hammer has it/);
    fireEvent.click(screen.getByTestId("tell-resume")); fireEvent.click(screen.getByTestId("resume-today"));
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
  it("one tap on 3 days saves once with a confirmation — no Send needed", async () => {
    render(<TellHammersInbox />); open(); fireEvent.click(screen.getByTestId("tell-break"));
    fireEvent.click(screen.getByTestId("hold-3"));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save.mock.calls[0][0]).toMatchObject({ tag: "HOLD", payload: { reason: "break" } });
    expect(screen.getByTestId("tell-hammers-result").textContent).toMatch(/Got it — Hammer has it/);
    await new Promise(r => setTimeout(r, 20)); expect(save).toHaveBeenCalledTimes(1);
  });
  it("a tap clears typed text, and typing afterwards never carries the tap", async () => {
    render(<TellHammersInbox />); open(); fireEvent.click(screen.getByTestId("tell-break"));
    fireEvent.change(screen.getByTestId("entry-text"), { target: { value: "back for Saturday's game" } });
    fireEvent.click(screen.getByTestId("hold-3"));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save.mock.calls[0][0].payload.text).toBeUndefined();
    fireEvent.click(screen.getByTestId("tell-break"));
    expect((screen.getByTestId("entry-text") as HTMLTextAreaElement).value).toBe("");
    fireEvent.change(screen.getByTestId("entry-text"), { target: { value: "legs feel heavy" } }); send();
    await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
    expect(save.mock.calls[1][0]).toMatchObject({ tag: "NOTE", payload: { kind: "free_text", text: "legs feel heavy" } });
  });
  it("pain Send is disabled until a face is chosen; chosen face is highlighted; face tap does not send", () => {
    render(<TellHammersInbox />); open(); fireEvent.click(screen.getByTestId("tell-pain")); fireEvent.click(screen.getByTestId("pain-elbow"));
    fireEvent.change(screen.getByTestId("entry-text"), { target: { value: "sore inside" } });
    expect((screen.getByTestId("entry-send") as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByTestId("face-little"));
    expect(screen.getByTestId("face-little").getAttribute("aria-pressed")).toBe("true");
    expect(save).not.toHaveBeenCalled();
    expect((screen.getByTestId("entry-send") as HTMLButtonElement).disabled).toBe(false);
  });
  it("Sent today is hidden when nothing was sent", () => {
    render(<TellHammersInbox />); open();
    expect(screen.queryByText("Sent today")).toBeNull();
  });
  it("check-in Nope collapses the section and submits nothing", () => {
    const onDone = vi.fn();
    render(<TellHammersInbox checkIn onDone={onDone} />);
    fireEvent.click(screen.getByTestId("chip-nope"));
    expect(screen.getByTestId("checkin-no-changes").textContent).toMatch(/No changes today/);
    expect(save).not.toHaveBeenCalled();
  });
  it("disabled timeline still leaves the Tell Hammer row visible", () => {
    enabled = false;
    render(<TellHammersInbox />);
    expect(screen.getByText("Tell Hammer")).toBeTruthy();
    expect(screen.queryByTestId("tell-break")).toBeNull();
  });
});
