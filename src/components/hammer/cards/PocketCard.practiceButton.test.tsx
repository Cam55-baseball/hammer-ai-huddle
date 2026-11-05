import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
vi.mock("@/components/hammer/logging/ExtraLogs", () => ({ PracticeLog: () => <div data-testid="practice-log-form" /> }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "u" } }) }));
import { PocketCard } from "./PocketCard";

// Owner Nov 5 round 2 item 2: the practice-log button sits beside "Log this work".
describe("locked by owner Nov 5: practice-log button beside the title", () => {
  it("renders in the same row as Log this work and opens the card's practice log", async () => {
    render(<QueryClientProvider client={new QueryClient()}><MemoryRouter>
      <PocketCard id="defense" category="Defense" focus="" tone="bg-primary" planDate="2026-11-05" prescribed practiceLogging>{() => <div />}</PocketCard>
    </MemoryRouter></QueryClientProvider>);
    fireEvent.click(screen.getAllByRole("button")[0]);
    const row = document.querySelector("[data-log-title-row]")!;
    expect(row.textContent).toContain("Log this work");
    const btn = row.querySelector("[data-testid=card-practice-log-button]") as HTMLButtonElement;
    expect(btn).toBeTruthy();
    fireEvent.click(btn);
    expect((document.querySelector("[data-card-practice]") as HTMLDetailsElement).open).toBe(true);
  });
});
