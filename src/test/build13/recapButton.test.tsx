// Owner Nov 12 (build 13 fix 1): the recap button says when it opens; lock reasons are readable;
// a status that can't load offers Try again; cancelling is one neutral line; failures are plain words.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { recapOpensAt } from "../../../supabase/functions/_shared/addons/recapOpens";
import { earlyRecapEligibility } from "../../../supabase/functions/_shared/addons/rules";
import { opensLabel, failureLine, RECAP_CANCELLED, LESSONS_CANCELLED, PAID_NOT_SAVED } from "@/lib/addons/messages";

const h = vi.hoisted(() => ({ callFn: vi.fn(), buyAddon: vi.fn(), toast: vi.fn() }));
vi.mock("@/lib/addons/client", () => ({ callFn: h.callFn, buyAddon: h.buyAddon, askParents: vi.fn() }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: h.toast }) }));
import { AddOnsSection } from "@/components/dashboard/AddOnsSection";

const DAY = 86400000;
const OPENS = "2026-11-25T14:04:00.000Z"; // 9:04 AM Eastern
const base = { gate: "buy", parentIds: [], purchases: [], requests: [] };
const tooEarly = { ...base, recap: { ok: false, reason: "too_early", message: "Opens after 2 weeks of this block — 13 days to go.", opensAt: OPENS } };
const open = { ...base, recap: { ok: true } };
const card = (title: string) => document.querySelector(`[data-addon-card="${title}"]`) as HTMLElement;
const recapButton = () => card("Early 6-Week Recap").querySelector("button") as HTMLButtonElement;
const ui = () => render(<MemoryRouter><AddOnsSection hasActivePlan /></MemoryRouter>);

beforeEach(() => { h.callFn.mockReset(); h.buyAddon.mockReset(); h.toast.mockReset(); });

describe("open date", () => {
  it("is the block start + 14 days, the same moment the server unlocks it", () => {
    const anchor = new Date(Date.parse(OPENS) - 14 * DAY);
    const now = new Date(anchor.getTime() + 1 * DAY);
    expect(recapOpensAt(anchor, now)).toBe(OPENS);
    expect(earlyRecapEligibility({ hasActivePlan: true, anchor, now: new Date(Date.parse(OPENS) - 1000), boughtBlockStarts: [] }).ok).toBe(false);
    expect(earlyRecapEligibility({ hasActivePlan: true, anchor, now: new Date(OPENS), boughtBlockStarts: [] }).ok).toBe(true);
    expect(recapOpensAt(anchor, new Date(OPENS))).toBeNull();
    expect(recapOpensAt(null, now)).toBeNull();
  });
  it("is shown in the player's own time zone", () => {
    expect(opensLabel(OPENS, "America/New_York")).toBe("Opens Nov 25");
    expect(opensLabel("2026-11-25T03:00:00Z", "America/New_York")).toBe("Opens Nov 24");
    expect(opensLabel("2026-11-25T03:00:00Z", "Europe/London")).toBe("Opens Nov 25");
  });
});

describe("Early 6-Week Recap button", () => {
  it("locked under 14 days: the button shows the date, stays disabled, reason in normal text", async () => {
    h.callFn.mockResolvedValue(tooEarly);
    ui();
    await waitFor(() => expect(recapButton().textContent).toMatch(/^Opens Nov 2[45]$/));
    expect(recapButton().disabled).toBe(true);
    const reason = card("Early 6-Week Recap").querySelector("[data-addon-reason]")!;
    expect(reason.textContent).toContain("13 days to go");
    expect(reason.className).toContain("text-sm");
    expect(reason.className).not.toContain("text-muted-foreground");
  });
  it("a status that can't load says so and Try again loads it again", async () => {
    h.callFn.mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce(open);
    ui();
    await waitFor(() => expect(recapButton().textContent).toBe("Try again"));
    expect(card("Early 6-Week Recap").textContent).toContain("We couldn't check your add-ons right now.");
    expect(card("Early 6-Week Recap").textContent).not.toContain("Loading…");
    expect(recapButton().disabled).toBe(false);
    fireEvent.click(recapButton());
    await waitFor(() => expect(recapButton().textContent).toBe("Buy"));
    expect(h.callFn).toHaveBeenCalledTimes(2);
  });
  it("cancelling shows one neutral line, never a red error", async () => {
    h.callFn.mockResolvedValue(open);
    h.buyAddon.mockResolvedValue({ canceled: true });
    ui();
    await waitFor(() => expect(recapButton().textContent).toBe("Buy"));
    fireEvent.click(recapButton());
    const line = await waitFor(() => card("Early 6-Week Recap").querySelector("[data-addon-notice]")!);
    expect(line.textContent).toBe(RECAP_CANCELLED);
    expect(line.className).not.toContain("destructive");
    expect(h.toast).not.toHaveBeenCalled();
  });
  it("a cancelled lessons payment says Payment cancelled — nothing was charged.", async () => {
    h.callFn.mockResolvedValue(open);
    h.buyAddon.mockResolvedValue({ canceled: true });
    ui();
    const btn = await waitFor(() => { const b = card("Hammers Online ×4 — Private lessons").querySelector("button")!; expect(b.textContent).toBe("Buy"); return b; });
    fireEvent.click(btn);
    await waitFor(() => expect(card("Hammers Online ×4 — Private lessons").querySelector("[data-addon-notice]")!.textContent).toBe(LESSONS_CANCELLED));
  });
  it("a real failure is plain words with no product ids or codes and says nothing was charged", async () => {
    h.callFn.mockResolvedValue(open);
    const err = Object.assign(new Error("[402] price_1UYvr6Gc5QIzbAH6Iz0qCvzl resource_missing"), { code: "resource_missing" });
    h.buyAddon.mockRejectedValue(err);
    ui();
    await waitFor(() => expect(recapButton().textContent).toBe("Buy"));
    fireEvent.click(recapButton());
    const line = await waitFor(() => card("Early 6-Week Recap").querySelector("[data-addon-notice]")!);
    expect(line.textContent).toContain("Nothing was charged.");
    expect(line.textContent).not.toMatch(/price_|resource_missing|\[402\]|com\.hammers/);
  });
});

describe("failure words", () => {
  it("payment sheet failure and known server refusals", () => {
    expect(failureLine(Object.assign(new Error("x"), { code: "payment_failed" }))).toBe("Your payment didn't go through. Nothing was charged.");
    expect(failureLine(Object.assign(new Error("x"), { code: "parent_must_pay" }))).toContain("Nothing was charged.");
  });
  it("never claims nothing was charged after the money moved", () => {
    expect(failureLine(Object.assign(new Error("x"), { afterPayment: true }))).toBe(PAID_NOT_SAVED);
    expect(PAID_NOT_SAVED).not.toMatch(/nothing was charged/i);
  });
});
