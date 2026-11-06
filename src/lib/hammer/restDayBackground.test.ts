import { describe, expect, it, vi } from "vitest";
import { restDateFor, restDowFor, judgeRestMove } from "../../../supabase/functions/_shared/wic/schedule/restDay";

const invoke = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: (...a: unknown[]) => invoke(...a) }, auth: { getSession: async () => ({ data: { session: { access_token: "t" } } }), refreshSession: async () => ({ data: { session: null } }) } } }));

describe("change rest day", () => {
  it("only this week: Friday becomes the rest day, Sunday trains", () => {
    const choices = [{ rest_dow: 5, scope: "week" as const, week_start: "2026-11-02", created_at: "2026-11-03T14:31:33Z" }];
    expect(restDateFor("2026-11-03", choices)).toBe("2026-11-06");
    expect(restDowFor("2026-11-08", choices)).toBe(5);
    expect(restDowFor("2026-11-10", choices)).toBe(0); // next week back to Sunday
  });
  it("indefinitely: the new day holds in later weeks", () => {
    const v = judgeRestMove({ today: "2026-11-03", target: "2026-11-05", scope: "indefinite", choices: [] });
    expect(v).toEqual({ ok: true, weekStart: "2026-11-02", restDate: "2026-11-05" });
    const choices = [{ rest_dow: 4, scope: "indefinite" as const, week_start: "2026-11-02", created_at: "2026-11-03T15:00:00Z" }];
    expect(restDateFor("2026-11-20", choices)).toBe("2026-11-19");
  });
});

describe("saved changes rebuild in the background", () => {
  it("asks the server to rebuild seven days and returns at once", async () => {
    invoke.mockResolvedValueOnce({ data: { ok: true, background: true, job_id: "j1" }, error: null });
    const { startBackgroundRebuild } = await import("./rebuildAfterChange");
    expect(await startBackgroundRebuild("Rest day moved to Fri", "2026-11-03")).toEqual({ jobId: "j1" });
    expect(invoke).toHaveBeenCalledWith("wk-generate-daily", { body: { rebuild_week_background: true, change_text: "Rest day moved to Fri", first_date: "2026-11-03" } });
  });
  it("falls back (null) when the background path is unavailable", async () => {
    invoke.mockResolvedValueOnce({ data: null, error: new Error("x") });
    const { startBackgroundRebuild } = await import("./rebuildAfterChange");
    expect(await startBackgroundRebuild("x", "2026-11-03")).toBeNull();
  });
});

describe("updating never spins forever", async () => {
  const { planRebuildView } = await import("@/hooks/usePlanRebuildJob");
  const base = { id: "j", reason: "Rest day moved to Fri", first_date: "2026-11-03", message: null, finished_at: null, created_at: "2026-11-03T15:51:41Z" };
  const t = (iso: string) => new Date(iso).getTime();
  it("a job that reported in the last 2 minutes shows Updating", () => {
    expect(planRebuildView({ ...base, status: "running", heartbeat_at: "2026-11-03T15:53:00Z" }, t("2026-11-03T15:54:30Z"))).toBe("running");
  });
  it("no report for over 2 minutes shows the retry line", () => {
    expect(planRebuildView({ ...base, status: "running", heartbeat_at: "2026-11-03T15:53:00Z" }, t("2026-11-03T15:55:30Z"))).toBe("stalled");
  });
  it("a finished job says updated", () => {
    expect(planRebuildView({ ...base, status: "done", finished_at: "2026-11-03T15:53:00Z" }, t("2026-11-03T15:54:00Z"))).toBe("done");
  });
});
