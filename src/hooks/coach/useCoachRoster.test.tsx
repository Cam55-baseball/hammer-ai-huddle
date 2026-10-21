import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { TEST_ADMIN_PROOF_ID } from "@/lib/testAdminExclusion";

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "coach-self" } }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: (table: string) => {
  const chain = {
    select: () => chain, eq: () => chain, contains: () => chain, in: () => chain,
    then: (resolve: (result: unknown) => unknown) => {
      const data = table === "athlete_mpi_settings" ? [{ user_id: TEST_ADMIN_PROOF_ID }, { user_id: "demo-player" }]
        : table === "organization_members" ? [{ organization_id: "org", user_id: TEST_ADMIN_PROOF_ID }, { organization_id: "org", user_id: "demo-player" }]
        : table === "scout_follows" ? [{ player_id: TEST_ADMIN_PROOF_ID }, { player_id: "demo-player" }]
        : [{ id: "demo-player", full_name: "TEST Player", avatar_url: null }];
      return Promise.resolve({ data, error: null }).then(resolve);
    },
  };
  return chain;
} } }));

import { useCoachRoster } from "./useCoachRoster";

describe("proof administrator roster exclusion", () => {
  it("hides the exact administrator from all three sources but retains the demo athlete", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const hook = renderHook(useCoachRoster, { wrapper });
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
    expect(hook.result.current.data).toEqual([{ athleteId: "demo-player", displayName: "TEST Player", avatarUrl: null,
      sources: ["mpi", "organization", "scout_follow"] }]);
    client.clear();
  });
});