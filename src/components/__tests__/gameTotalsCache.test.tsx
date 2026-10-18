import { describe, it, expect, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GameTotalsHeader } from "../games/GameTotalsHeader";

vi.mock("@/lib/games/ledger", () => ({ gp: (table: string) => ({ select: () => ({ eq: () => ({
  then: (resolve: (value: unknown) => void) => resolve({ data: table === "gp_pitches" ? [{ perspective: "pitcher" }] : [] }),
  single: async () => ({ data: { game_date: "2026-10-18" } }),
}) }) }) }));

describe("saved game row cache", () => {
  it("never replaces complete saved pitch and at-bat rows with summary projections", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const pitch = [{ id: "saved-pitch", perspective: "pitcher", contact_quality: "hard", entry_source: "player_entered" }];
    const atBat = [{ id: "saved-at-bat", result: "2B", entry_source: "imported" }];
    client.setQueryData(["gp-pitches", "game"], pitch);
    client.setQueryData(["gp-ab", "game"], atBat);
    const screen = render(<QueryClientProvider client={client}><GameTotalsHeader gameId="game" /></QueryClientProvider>);
    await waitFor(() => expect(client.getQueryData(["gp-pitches", "game", "totals"])).toEqual([{ perspective: "pitcher" }]));
    expect(client.getQueryData(["gp-pitches", "game"])).toEqual(pitch);
    expect(client.getQueryData(["gp-ab", "game"])).toEqual(atBat);
    screen.unmount();
    client.clear();
  });
});