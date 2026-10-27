import { describe, expect, it, vi } from "vitest";
import { saveAnalysisReport } from "../../../supabase/functions/_shared/saveAnalysisReport";
describe("computed report persistence", () => {
  it("recovers a failed write without rerunning analysis", async () => {
    const write = vi.fn().mockResolvedValueOnce({ error: { message: "temporary" } }).mockResolvedValueOnce({ error: null });
    const wait = vi.fn(async () => {});
    expect(await saveAnalysisReport(write, wait)).toEqual({ saved: true, error: null });
    expect(write).toHaveBeenCalledTimes(2); expect(wait).toHaveBeenCalledTimes(1);
  });
  it("returns persistent failure honestly after exactly two writes", async () => {
    const write = vi.fn(async () => ({ error: { message: "permission denied" } }));
    expect(await saveAnalysisReport(write, async () => {})).toEqual({ saved: false, error: "permission denied" });
    expect(write).toHaveBeenCalledTimes(2);
  });
});