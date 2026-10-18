import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ScoutingReportPanel } from "../games/reports/ScoutingReportPanel";
import { useIndividualReport, useScoutingReport } from "@/hooks/useGameReport";

const mocks = vi.hoisted(() => ({ queries: [] as any[], calls: [] as any[], scouting: vi.fn() }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "player" } }) }));
vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: any) => { mocks.queries.push(options); return { data: undefined }; },
  useMutation: () => ({}), useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/lib/games/reportEngine", () => ({ buildScoutingReport: mocks.scouting, buildIndividualPostgame: vi.fn() }));
vi.mock("@/components/games/reports/ReportView", () => ({ ReportView: () => null }));
vi.mock("@/lib/games/ledger", () => ({ gp: (table: string) => {
  const filters: any[] = [];
  const result = () => {
    mocks.calls.push({ table, filters });
    const activeOnly = filters.some(([key, value]) => key === "deleted_at" && value === null);
    const rows = table === "gp_games" ? [
      { id: "active", user_id: "player", opponent_team: "Active team", sport: "baseball", deleted_at: null },
      { id: "removed", user_id: "player", opponent_team: "Removed team", sport: "baseball", deleted_at: "2026-10-17" },
    ].filter(r => !activeOnly || r.deleted_at === null) : [];
    return { data: rows, error: null };
  };
  const query: any = {
    select: () => query, eq: (key: string, value: any) => { filters.push([key, value]); return query; },
    is: (key: string, value: any) => { filters.push([key, value]); return query; },
    order: () => query, limit: () => query,
    in: (key: string, value: any) => { filters.push([key, value]); return query; },
    maybeSingle: async () => { result(); return { data: null, error: null }; },
    then: (resolve: any, reject: any) => Promise.resolve(result()).then(resolve, reject),
  };
  return query;
} }));

describe("reports preserve removed-game boundaries", () => {
  beforeEach(() => { mocks.queries.length = 0; mocks.calls.length = 0; mocks.scouting.mockReset(); });
  it("does not offer removed games as opponent choices", async () => {
    render(<ScoutingReportPanel />);
    const choices = await mocks.queries.find(q => q.queryKey[0] === "gp-opponents").queryFn();
    expect(choices).toEqual([{ name: "Active team", sport: "baseball" }]);
  });
  it("excludes removed games from opponent report ledger reads", async () => {
    useScoutingReport("Active team", "baseball");
    await mocks.queries[0].queryFn();
    expect(mocks.calls.find(q => q.table === "gp_pitches").filters).toContainEqual(["game_id", ["active"]]);
    expect(mocks.calls.find(q => q.table === "gp_games").filters).toContainEqual(["user_id", "player"]);
  });
  it("refuses a removed game on an individual report direct link", async () => {
    useIndividualReport("removed");
    await expect(mocks.queries[0].queryFn()).rejects.toThrow("Game not found");
    expect(mocks.calls[0].filters).toContainEqual(["deleted_at", null]);
    expect(mocks.calls[0].filters).toContainEqual(["user_id", "player"]);
  });
});