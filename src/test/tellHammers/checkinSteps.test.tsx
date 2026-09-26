import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "u1" } }), useOptionalAuth: () => ({ user: { id: "u1" } }) }));
vi.mock("@/lib/asb/emit", () => ({ emitAsbEvent: vi.fn() }));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
import { QuickCheckInSheet } from "@/components/checkin/QuickCheckInSheet";

describe("stepped check-in", () => {
  it("Back returns to the earlier question with its answer kept and saves nothing", async () => {
    const { emitAsbEvent } = await import("@/lib/asb/emit");
    render(<QueryClientProvider client={new QueryClient()}><QuickCheckInSheet open onOpenChange={() => {}} /></QueryClientProvider>);
    const slider = screen.getByRole("slider");
    fireEvent.keyDown(slider, { key: "ArrowRight" });
    expect(screen.getByText("7")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("How fatigued are you right now?")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByText("How ready do you feel today?")).toBeTruthy();
    expect(screen.getByText("7")).toBeTruthy();
    expect(emitAsbEvent).not.toHaveBeenCalled();
  });
  it("morning/night check-in no longer submits from the Anything-change section", () => {
    const src = readFileSync("src/components/vault/VaultFocusQuizDialog.tsx", "utf8");
    expect(src).toMatch(/<CheckInLifeChips \/>/);
    expect(src).not.toMatch(/CheckInLifeChips onDone/);
  });
});
