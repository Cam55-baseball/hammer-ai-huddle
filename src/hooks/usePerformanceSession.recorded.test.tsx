import { act, renderHook, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ fail: false, invoke: vi.fn(), recorded: vi.fn() }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "test-player" }, session: { access_token: "test-token" } }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ invalidateQueries: vi.fn() }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  from: (table: string) => {
    const chain: Record<string, unknown> = {};
    for (const method of ["select", "insert", "update", "eq", "gte", "is"]) chain[method] = () => chain;
    chain.single = async () => table === "performance_sessions" ? { data: mocks.fail ? null : { id: "saved-session" }, error: mocks.fail ? new Error("write failed") : null } : { data: null, error: null };
    chain.maybeSingle = async () => ({ data: null, error: null });
    chain.then = (resolve: (value: unknown) => void) => Promise.resolve({ data: [], error: null }).then(resolve);
    return chain;
  }, functions: { invoke: mocks.invoke },
} }));
import { usePerformanceSession } from "./usePerformanceSession";
afterEach(() => { cleanup(); vi.clearAllMocks(); mocks.fail = false; });
describe("embedded practice canonical save notification", () => {
  it("returns the saved ID to the exercise while report calculation is still pending", async () => {
    let finish: ((value: unknown) => void) | undefined;
    mocks.invoke.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const { result } = renderHook(() => usePerformanceSession());
    let saving: Promise<unknown> | undefined;
    await act(async () => {
      saving = result.current.createSession({ sport: "baseball", module: "hitting", session_type: "solo_work", session_date: new Date().toISOString().slice(0, 10), drill_blocks: [], onRecorded: mocks.recorded });
      await Promise.resolve(); await Promise.resolve();
    });
    expect(mocks.recorded).toHaveBeenCalledWith("saved-session");
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
    await act(async () => { finish?.({ data: { hie_completed: true } }); await saving; });
  });
  it("never notifies or calculates after a failed recording", async () => {
    mocks.fail = true;
    const { result } = renderHook(() => usePerformanceSession());
    await act(async () => {
      await expect(result.current.createSession({ sport: "baseball", session_type: "solo_work", session_date: new Date().toISOString().slice(0, 10), drill_blocks: [], onRecorded: mocks.recorded })).rejects.toThrow("write failed");
    });
    expect(mocks.recorded).not.toHaveBeenCalled();
    expect(mocks.invoke).not.toHaveBeenCalled();
  });
});