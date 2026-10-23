import { act, renderHook, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAutosave } from "./useAutosave";
const jobs = vi.hoisted(() => ({ pending: new Set<string>(), sent: [] as string[], succeeds: false }));
vi.mock("@/lib/logging/logOutbox", () => ({
  installOutboxSync: () => {},
  pendingFor: (id: string) => jobs.pending.has(id) ? { id } : null,
  enqueue: (job: { id: string }) => jobs.pending.add(job.id),
  sendJob: async (id: string) => { jobs.sent.push(id); if (jobs.succeeds) jobs.pending.delete(id); return jobs.succeeds; },
}));
afterEach(() => { cleanup(); jobs.pending.clear(); jobs.sent = []; jobs.succeeds = false; });
describe("focus save acknowledgement", () => {
  it("fails the flush when any linked log or arm write remains pending", async () => {
    const hook = renderHook(() => useAutosave("exercise_log:one"));
    act(() => hook.result.current.queue({ id: "arm:one" } as never, 60000));
    let saved;
    await act(async () => { saved = await hook.result.current.flush(); });
    expect(saved).toBe(false);
    expect(jobs.sent).toContain("arm:one");
  });
  it("confirms only after the linked write clears", async () => {
    jobs.succeeds = true;
    const hook = renderHook(() => useAutosave("exercise_log:one"));
    act(() => hook.result.current.queue({ id: "arm:one" } as never, 60000));
    let saved;
    await act(async () => { saved = await hook.result.current.flush(); });
    expect(saved).toBe(true);
    expect(jobs.pending.size).toBe(0);
  });
});