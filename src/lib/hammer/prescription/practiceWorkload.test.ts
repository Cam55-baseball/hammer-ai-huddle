import { describe, expect, it } from "vitest";
import { practiceWorkloadSignal } from "./practiceWorkload";

const log = (id: string, session_date: string, session_type = "solo_work", deleted_at: string | null = null) =>
  ({ id, session_date, session_type, deleted_at });

describe("practice logs → workload signal", () => {
  it("two practices in the last two days is heavy, with a plain Because", () => {
    const s = practiceWorkloadSignal([log("a", "2026-06-02"), log("b", "2026-06-01", "team_session")], "2026-06-03");
    expect(s.heavy).toBe(true);
    expect(s.because).toBe("Because you logged 2 practices in the last 2 days.");
  });
  it("live at-bats yesterday is named", () => {
    const s = practiceWorkloadSignal([log("a", "2026-06-02", "live_abs")], "2026-06-03");
    expect([s.heavy, s.liveAbsYesterday, s.because]).toEqual([false, true, "Because you logged live at-bats yesterday."]);
  });
  it("deleted, duplicate, unknown-type and same-day logs are ignored; no logs → nothing", () => {
    const s = practiceWorkloadSignal([
      log("a", "2026-06-02", "solo_work", "2026-06-02T10:00:00Z"), log("b", "2026-06-02", "game"),
      log("c", "2026-06-03"), log("d", "2026-06-01"), log("d", "2026-06-01"),
    ], "2026-06-03");
    expect([s.sessionsLast2, s.heavy, s.because]).toEqual([1, false, null]);
    expect(practiceWorkloadSignal([], "2026-06-03").because).toBeNull();
  });
});
