import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { TEST_ADMIN_PROOF_ID } from "@/lib/testAdminExclusion";

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "coach-self" } }) }));
vi.mock("@/hooks/usePlayerOrganization", () => ({ usePlayerOrganization: () => ({ organizationId: "org" }) }));
vi.mock("@/lib/safety/blocks", () => ({ fetchBlockedUserIds: async () => new Set(["blocked-player"]) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: (table: string) => {
  const profiles = [TEST_ADMIN_PROOF_ID, "demo-player", "blocked-player"].map(id => ({ id, full_name: id, position: null, avatar_url: null }));
  const chain = {
    select: () => chain, eq: () => chain, neq: () => chain, in: () => chain,
    then: (resolve: (result: unknown) => unknown) => {
      const data = table === "scout_follows" ? profiles.map(p => ({ player_id: p.id, profiles_public: p }))
        : table === "organization_members" ? profiles.map(p => ({ user_id: p.id })) : profiles;
      return Promise.resolve({ data, error: null }).then(resolve);
    },
  };
  return chain;
} } }));

import { useCoachPlayerPool } from "./useCoachPlayerPool";

describe("proof administrator player pool exclusion", () => {
  it("excludes the exact administrator on both paths without losing demos or blocked-pair protection", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const hook = renderHook(useCoachPlayerPool, { wrapper });
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
    expect(hook.result.current.data).toEqual([{ id: "demo-player", name: "demo-player", position: null, avatar_url: null, source: "both" }]);
    client.clear();
  });
});