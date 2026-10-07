import { describe, it, expect } from "vitest";
import { barefootState, calfRaiseTarget, type BarefootEvent } from "@/lib/speed/speedEngine";

const add = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const S = "2026-01-01";
/** Daily pain-free check-ins for `days`, a session every other day. */
function healthy(from: string, days: number, sessionsEvery = 2): BarefootEvent[] {
  const e: BarefootEvent[] = [];
  for (let i = 0; i < days; i++) { e.push({ kind: "healthy_day", date: add(from, i) }); if (i % sessionsEvery === 0) e.push({ kind: "session", date: add(from, i) }); }
  return e;
}

describe("Round 9 barefoot gates", () => {
  it("Foundation → Introduction needs 12 sessions, 21 pain-free days in a row, readiness 60, and a passed test (incl. next-morning check-in)", () => {
    const ev = [...healthy(S, 24)];
    expect(barefootState(ev, 80, add(S, 24)).stage).toBe(0); // no test yet
    ev.push({ kind: "test_pass", date: add(S, 24) });
    expect(barefootState(ev, 80, add(S, 24)).testPending).toBe(true);
    ev.push({ kind: "healthy_day", date: add(S, 25) });
    expect(barefootState(ev, 55, add(S, 25)).stage).toBe(0); // readiness too low
    const r = barefootState(ev, 60, add(S, 25));
    expect(r.stage).toBe(1);
    expect(r.advancedToday).toBe(true);
  });
  it("sessions alone never move anyone up", () => {
    const ev: BarefootEvent[] = Array.from({ length: 40 }, (_, i) => ({ kind: "session", date: add(S, i) }));
    expect(barefootState(ev, 100, add(S, 40)).stage).toBe(0);
  });
  it("a failed test blocks a retest for 7 days", () => {
    const ev = [...healthy(S, 30), { kind: "test_fail", date: add(S, 30) } as BarefootEvent, { kind: "test_pass", date: add(S, 33) } as BarefootEvent];
    const r = barefootState(ev, 90, add(S, 34));
    expect(r.testPassed).toBe(false);
    expect(r.retestOn).toBe(add(S, 37));
  });
  it("pain drops one stage and resets that stage's sessions, pain-free streak and test", () => {
    const ev: BarefootEvent[] = [...healthy(S, 30), { kind: "stage_up", date: add(S, 26), to: 1 }, { kind: "stage_up", date: add(S, 28), to: 2 }];
    ev.push({ kind: "pain", date: add(S, 31), areas: ["ankle"] });
    const r = barefootState(ev, 90, add(S, 32));
    expect(r.stage).toBe(1);
    expect(r.sessions).toBe(0);
    expect(r.healthyDays).toBe(0);
    expect(r.testPassed).toBe(false);
  });
  it("Integration → Advanced needs 42 pain-free days and readiness 65", () => {
    const ev: BarefootEvent[] = [{ kind: "healthy_day", date: S }, { kind: "stage_up", date: S, to: 1 }, { kind: "stage_up", date: S, to: 2 }, ...healthy(add(S, 1), 41)];
    ev.push({ kind: "test_pass", date: add(S, 41) }, { kind: "healthy_day", date: add(S, 42) });
    expect(barefootState(ev, 90, add(S, 41)).stage).toBe(2); // 41 days
    expect(barefootState(ev, 64, add(S, 42)).stage).toBe(2);
    expect(barefootState(ev, 65, add(S, 42)).stage).toBe(3);
  });
  it("same gates for under-13s; only the calf-raise count differs (15 vs 20)", () => {
    expect(calfRaiseTarget(11)).toBe(15);
    expect(calfRaiseTarget(13)).toBe(20);
    expect(calfRaiseTarget(null)).toBe(20);
  });
});
