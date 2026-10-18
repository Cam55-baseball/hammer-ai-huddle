import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PostGameLogPrompt } from "../games/PostGameLogPrompt";

const state = vi.hoisted(() => ({
  family: "gp_defense_plays", fail: false,
  calls: [] as { table: string; filters: [string, unknown][] }[],
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "player" } }) }));
vi.mock("react-router-dom", () => ({ useNavigate: () => vi.fn() }));
vi.mock("@/lib/games/ledger", () => ({ gp: (table: string) => {
  const filters: [string, unknown][] = [];
  state.calls.push({ table, filters });
  const query = {
    select: () => query,
    eq: (key: string, value: unknown) => { filters.push([key, value]); return query; },
    is: (key: string, value: unknown) => { filters.push([key, value]); return query; },
    gte: () => query, lte: () => query, order: () => query, in: () => query,
    then: (resolve: (result: unknown) => void) => {
      if (table === "gp_games") {
        const games = [
          { id: "logged", user_id: "player", opponent_team: "Logged", status: "final", deleted_at: null },
          { id: "empty", user_id: "player", opponent_team: "Empty", status: "final", deleted_at: null },
          { id: "removed", user_id: "player", opponent_team: "Removed", status: "draft", deleted_at: "2026-10-18" },
          { id: "other", user_id: "other", opponent_team: "Other", status: "draft", deleted_at: null },
        ].filter(game => filters.every(([key, value]) => game[key as keyof typeof game] === value));
        resolve({ data: games, error: null });
      } else resolve({ data: table === state.family ? [{ game_id: "logged" }] : [], error: state.fail && table === state.family ? new Error("Read failed") : null });
    },
  };
  return query;
} }));

beforeEach(() => { cleanup(); state.calls = []; state.fail = false; });

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const screen = render(<QueryClientProvider client={client}><PostGameLogPrompt /></QueryClientProvider>);
  return { client, screen };
}

describe("post-game logging evidence", () => {
  it.each(["gp_at_bats", "gp_pitches", "gp_defense_plays", "gp_baserun_events"])("counts final games logged through %s", async family => {
    state.family = family;
    const { client, screen } = mount();
    await waitFor(() => expect(client.getQueryData(["gp-pending-log", "player"])).toEqual([
      expect.objectContaining({ id: "empty" }),
    ]));
    expect(state.calls[0].filters).toContainEqual(["user_id", "player"]);
    expect(state.calls[0].filters).toContainEqual(["deleted_at", null]);
    screen.unmount(); client.clear();
  });
  it("does not treat a failed event read as an unlogged game", async () => {
    state.family = "gp_defense_plays"; state.fail = true;
    const { client, screen } = mount();
    await waitFor(() => expect(client.getQueryState(["gp-pending-log", "player"])?.status).toBe("error"));
    expect(client.getQueryData(["gp-pending-log", "player"])).toBeUndefined();
    screen.unmount(); client.clear();
  });
});