import { describe, it, expect, vi } from "vitest";
import { recordAnalysisRun } from "../../../supabase/functions/_shared/recordAnalysisRun";

const record = { video_id: "clip", cache_fingerprint_hex: "fingerprint", cache_hit: false, outcome: "ok" as const };
function client(results: unknown[], existing?: unknown) {
  const single = vi.fn();
  for (const result of results) {
    if (result instanceof Error) single.mockRejectedValueOnce(result);
    else single.mockResolvedValueOnce(result);
  }
  const insert = vi.fn(() => ({ select: () => ({ single }) }));
  return { insert, db: { from: () => ({ insert, select: () => ({ eq: (_key: string, id: string) => ({ maybeSingle: async () => existing ?? { data: { id }, error: null } }) }) }) } };
}
describe("analysis audit persistence", () => {
  it("retries a refused write without changing the run identity", async () => {
    const c = client([{ error: { message: "temporary failure" } }, { data: { id: "saved" }, error: null }]);
    expect(await recordAnalysisRun(c.db, record)).toEqual({ id: "saved", error: null });
    expect(c.insert).toHaveBeenCalledTimes(2);
    expect(c.insert.mock.calls[0]).toEqual(c.insert.mock.calls[1]);
  });
  it("recovers a committed row after a lost response without a duplicate run", async () => {
    const c = client([new Error("response lost"), { error: { code: "23505", message: "duplicate" } }]);
    const result = await recordAnalysisRun(c.db, record);
    expect(result.error).toBeNull();
    expect(result.id).toBeTruthy();
    expect(c.insert.mock.calls[0]).toEqual(c.insert.mock.calls[1]);
  });
  it("reports persistent failure instead of pretending a run was saved", async () => {
    const c = client([{ error: { message: "denied" } }, { error: { message: "denied" } }]);
    expect(await recordAnalysisRun(c.db, record)).toEqual({ id: null, error: "denied" });
    expect(c.insert).toHaveBeenCalledTimes(2);
  });
  it("preserves the caller's run identity across outcome paths", async () => {
    const c = client([{ data: { id: "invocation-id" }, error: null }]);
    await recordAnalysisRun(c.db, { ...record, id: "invocation-id" });
    expect(c.insert).toHaveBeenCalledWith(expect.objectContaining({ id: "invocation-id", outcome: "ok" }));
  });
  it("does not claim success when the insert has no read-back row", async () => {
    const c = client([{ data: null, error: null }, { data: null, error: null }]);
    expect(await recordAnalysisRun(c.db, record)).toEqual({ id: null, error: "Audit insert returned no row" });
  });
});