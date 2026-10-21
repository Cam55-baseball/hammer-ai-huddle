import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { useScoutProfile } from "./ScoutProfileTabs";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), user: { id: "viewer" } }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: mocks.rpc } }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock("@/components/scout/ScoutOverviewSummary", () => ({ ScoutOverviewSummary: () => null }));
const profile = { shared: { profile: true }, overview: { full_name: "TEST" } };
function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
beforeEach(() => mocks.rpc.mockReset());
afterEach(cleanup);
describe("server-owned scout scope preflight", () => {
  it("does not request athlete data when every scope is denied", async () => {
    mocks.rpc.mockResolvedValue({ data: false, error: null });
    const { result } = renderHook(() => useScoutProfile("athlete"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
    expect(mocks.rpc.mock.calls.map(([name]) => name)).toEqual(Array(4).fill("scout_can_view_scope"));
  });
  it("reads the profile only after a server scope is allowed", async () => {
    mocks.rpc.mockImplementation(async (name, args) => ({ data: name === "scout_athlete_profile" ? profile : args?._scope === "profile", error: null }));
    const { result } = renderHook(() => useScoutProfile("athlete"), { wrapper });
    await waitFor(() => expect(result.current.data).toEqual(profile));
    expect(mocks.rpc).toHaveBeenLastCalledWith("scout_athlete_profile", { _athlete: "athlete" });
    expect(mocks.rpc).toHaveBeenCalledWith("scout_can_view_scope", { _viewer: "viewer", _athlete: "athlete", _scope: "profile" });
  });
  it("keeps a failed sharing check visible and never requests profile data", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "unavailable" } });
    const { result } = renderHook(() => useScoutProfile("athlete"), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mocks.rpc.mock.calls.some(([name]) => name === "scout_athlete_profile")).toBe(false);
  });
});