import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { buildShadowInputs, type RawPractice } from "../../../supabase/functions/_shared/wic/schedule/tissueCost/shadow/adapter";
import { countsAsPractice, readSubmittedPracticeLength } from "../../../supabase/functions/_shared/practiceRules";
import { jobCallerAllowed, JOB_TOKEN_SHA256 } from "../../../supabase/functions/tcs-shadow-run/jobAuth";
import { PLAN_RULES_VERSION } from "../../../supabase/functions/_shared/planRulesVersion";
import { PRACTICE_LENGTH_ASSUMPTION_LINE, practiceLengthMissing } from "@/lib/practice/practiceLength";
import { isImportedPracticeKind } from "@/hooks/useImportScheduleEvents";

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => ({}) } }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (k: string, f?: any) => (typeof f === "string" ? f : k) }) }));
vi.mock("@/hooks/useCalendarSkips", () => ({ useCalendarSkips: () => ({ isSkippedForDay: () => false, getSkipDays: () => [], updateSkipDays: vi.fn(), unskipForDay: vi.fn() }) }));
vi.mock("@/hooks/useCalendarDayOrders", () => ({
  getOrderKey: (e: any) => e.orderKey ?? e.id,
  useCalendarDayOrders: () => ({ isDateLocked: () => false, saveDayOrder: vi.fn(), unlockDate: vi.fn(), getOrderKeysForDate: () => null, fetchDayOrdersForRange: vi.fn(), refetch: vi.fn(), loading: false }),
}));
vi.mock("@/hooks/useGamePlanLock", () => ({ useGamePlanLock: () => ({ getDaySchedule: () => null, unlockDays: vi.fn(), loading: false, refetch: vi.fn() }) }));
vi.mock("@/hooks/useCalendarActivityDetail", () => ({ useCalendarActivityDetail: () => ({ selectedTask: null, detailDialogOpen: false, loading: false, openActivityDetail: vi.fn(), closeDetailDialog: vi.fn(), handleComplete: vi.fn(), handleSaveTime: vi.fn(), handleToggleCheckbox: vi.fn(), quickComplete: vi.fn(), updateSelectedTaskOptimistically: vi.fn() }) }));
vi.mock("@/hooks/useCustomActivities", () => ({ useCustomActivities: () => ({ updateTemplate: vi.fn(), deleteTemplate: vi.fn() }) }));
vi.mock("@/contexts/SportThemeContext", () => ({ useSportTheme: () => ({ sport: "baseball" }) }));
vi.mock("@/components/CustomActivityDetailDialog", () => ({ CustomActivityDetailDialog: () => null }));
vi.mock("@/components/custom-activities/CustomActivityBuilderDialog", () => ({ CustomActivityBuilderDialog: () => null }));
vi.mock("@/components/calendar/DayStatusSelector", () => ({ DayStatusSelector: () => null }));
vi.mock("@/components/calendar/DaySessionsList", () => ({ DaySessionsList: () => null }));
vi.mock("@/components/calendar/DayRecordsList", () => ({ DayRecordsList: () => null }));
vi.mock("@/components/calendar/RestDayScheduler", () => ({ RestDayScheduler: () => null }));
vi.mock("@/components/calendar/SkipDayPickerDialog", () => ({ SkipDayPickerDialog: () => null }));

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CalendarDaySheet } from "@/components/calendar/CalendarDaySheet";
import { GamePlanPracticeLengthNote } from "@/components/practice/GamePlanPracticeLengthNote";

const DAY = "2026-03-09";
function practiceDay(practices: RawPractice[]) {
  const raw: any = {
    userId: "00000000-0000-0000-0000-000000000001",
    today: "2026-03-10", timezone: "UTC", windowStart: "2026-01-09", horizonEnd: "2026-03-24",
    mpi: null, context: null, prescriptions: [], sessionLogs: [], games: [], calendarEvents: [],
    practices, throwingReps: [], speedSessions: [], quizzes: [], dailyLogs: [],
  };
  const out = buildShadowInputs(raw);
  return { day: [...out.history, ...out.calendar].find((d) => d.date === DAY), diagnostics: out.diagnostics };
}

const BR_IQ = { session_module: "baserunning_iq", session_type: "solo_work", practice_kind: null };
const TRAVEL = { session_module: "note", session_type: "travel", practice_kind: "travel" };
const OTHER = { session_module: "note", session_type: "other", practice_kind: "other" };
const REAL = { session_module: "hitting", session_type: "team_session", practice_kind: "team" };

describe("Owner Nov 10 evening — Baserunning IQ and Travel/Other notes are not practices", () => {
  it("one shared rule", () => {
    expect(countsAsPractice(BR_IQ)).toBe(false);
    expect(countsAsPractice(TRAVEL)).toBe(false);
    expect(countsAsPractice(OTHER)).toBe(false);
    expect(countsAsPractice(REAL)).toBe(true);
    expect(isImportedPracticeKind("travel")).toBe(false);
    expect(isImportedPracticeKind("other")).toBe(false);
    expect(isImportedPracticeKind("team_practice")).toBe(true);
  });

  it("a Baserunning IQ session adds 0 practice minutes (no 60, no default note)", () => {
    const r = practiceDay([{ scheduled_date: DAY, duration_minutes: null, status: "scheduled", ...BR_IQ }]);
    expect(r.day?.practiceMinutes ?? 0).toBe(0);
    expect(r.diagnostics).not.toContain(`practice_minutes_default_${DAY}`);
  });

  it("a Travel note adds 0 practice minutes, even with a length", () => {
    const r = practiceDay([{ scheduled_date: DAY, duration_minutes: 120, status: "scheduled", ...TRAVEL }]);
    expect(r.day?.practiceMinutes ?? 0).toBe(0);
    expect(r.diagnostics).not.toContain(`practice_minutes_default_${DAY}`);
  });

  it("a real practice with no length still counts 60 with the default note", () => {
    const r = practiceDay([
      { scheduled_date: DAY, duration_minutes: null, status: "scheduled", ...REAL },
      { scheduled_date: DAY, duration_minutes: null, status: "scheduled", ...BR_IQ },
    ]);
    expect(r.day?.practiceMinutes).toBe(60);
    expect(r.diagnostics).toContain(`practice_minutes_default_${DAY}`);
  });

  it("no label for Baserunning IQ or Travel/Other notes; label for a real practice", () => {
    expect(practiceLengthMissing({ duration_minutes: null, status: "scheduled", ...BR_IQ })).toBe(false);
    expect(practiceLengthMissing({ duration_minutes: null, status: "scheduled", ...TRAVEL })).toBe(false);
    expect(practiceLengthMissing({ duration_minutes: null, status: "scheduled", ...REAL })).toBe(true);
  });

  it("rules version bumped so saved future days refresh", () => {
    expect(PLAN_RULES_VERSION).toBeGreaterThanOrEqual(15);
  });
});

describe("Owner Nov 10 evening — coach-practice-check keeps lengths as entered", () => {
  it("accepts 10 and 360 exactly", () => {
    expect(readSubmittedPracticeLength(10)).toEqual({ ok: true, minutes: 10 });
    expect(readSubmittedPracticeLength(360)).toEqual({ ok: true, minutes: 360 });
  });
  it("refuses 5 and 400 (never clamps)", () => {
    expect(readSubmittedPracticeLength(5)).toEqual({ ok: false });
    expect(readSubmittedPracticeLength(400)).toEqual({ ok: false });
    expect(readSubmittedPracticeLength(90.5)).toEqual({ ok: false });
  });
  it("a missing length is saved blank, never a default", () => {
    expect(readSubmittedPracticeLength(undefined)).toEqual({ ok: true, minutes: null });
    expect(readSubmittedPracticeLength(null)).toEqual({ ok: true, minutes: null });
    expect(readSubmittedPracticeLength("")).toEqual({ ok: true, minutes: null });
  });
  it("the service uses the shared reader, returns an error, and no longer clamps to 15–240", () => {
    const src = readFileSync("supabase/functions/coach-practice-check/index.ts", "utf8");
    expect(src).toContain("readSubmittedPracticeLength(s.duration_minutes)");
    expect(src).toMatch(/if \(!length\.ok\) return json\(\{ error: "That number doesn't look right — double-check it\./);
    expect(src).toContain("duration_minutes: minutes");
    expect(src).toContain("const minutes = length.minutes;");
    expect(src).not.toMatch(/Math\.max\(15/);
    // The coach form's temporary 15–240 refusal is gone.
    const form = readFileSync("src/components/coach/CoachScheduleDialog.tsx", "utf8");
    expect(form).not.toContain("For now, practices sent to players");
  });
});

describe("Owner Nov 10 evening — tcs-shadow-run lock", () => {
  const h = (o: Record<string, string>) => new Headers(o);
  it("no credential, the public app key, or a wrong token → refused", async () => {
    expect(await jobCallerAllowed(h({}), "svc")).toBe(false);
    expect(await jobCallerAllowed(h({ apikey: "anon", Authorization: "Bearer anon" }), "svc")).toBe(false);
    expect(await jobCallerAllowed(h({ "x-job-token": "wrong" }), "svc")).toBe(false);
  });
  it("the job credential (matched by its stored hash) or the service-role key → allowed", async () => {
    const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("test-token"));
    const hex = [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
    expect(await jobCallerAllowed(h({ "x-job-token": "test-token" }), "svc", hex)).toBe(true);
    expect(await jobCallerAllowed(h({ Authorization: "Bearer svc" }), "svc")).toBe(true);
    expect(await jobCallerAllowed(h({ Authorization: "Bearer svc" }), undefined)).toBe(false);
  });
  it("reuses the existing stored hash and checks before any work", () => {
    expect(JOB_TOKEN_SHA256).toBe(readFileSync("supabase/functions/wk-daily-plan-job/index.ts", "utf8").match(/JOB_TOKEN_SHA256 = "([0-9a-f]{64})"/)![1]);
    const src = readFileSync("supabase/functions/tcs-shadow-run/index.ts", "utf8");
    const gate = src.indexOf("jobCallerAllowed(req.headers");
    expect(gate).toBeGreaterThan(0);
    expect(gate).toBeLessThan(src.indexOf("createClient(\n"));
    expect(gate).toBeLessThan(src.indexOf("req.json()"));
  });
});

describe("Owner Nov 10 evening — the label in the two new places", () => {
  const sheet = (practice: any) => render(
    <QueryClientProvider client={new QueryClient()}>
      <CalendarDaySheet
        open onOpenChange={() => {}} date={new Date(`${DAY}T12:00:00`)} sport="baseball"
        onAddEvent={() => {}} onDeleteEvent={async () => {}}
        events={[{ id: `ps-${practice.id}-${DAY}`, date: DAY, title: "Team practice", type: "scheduled_practice", source: practice.id, editable: true, deletable: true, practice }]}
      />
    </QueryClientProvider>,
  );

  it("calendar day view: shown for a real practice with no length", () => {
    sheet({ id: "p1", duration_minutes: null, status: "scheduled", ...REAL });
    expect(screen.getByText(PRACTICE_LENGTH_ASSUMPTION_LINE)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add length" })).toBeTruthy();
  });
  it("calendar day view: not shown for a Baserunning IQ session", () => {
    sheet({ id: "p2", duration_minutes: null, status: "scheduled", ...BR_IQ });
    expect(screen.queryByText(PRACTICE_LENGTH_ASSUMPTION_LINE)).toBeNull();
  });

  const today = (data: any) => render(
    <QueryClientProvider client={new QueryClient()}><GamePlanPracticeLengthNote data={data} /></QueryClientProvider>,
  );
  it("Today's schedule list: shown for a real practice with no length, not for a Travel note", () => {
    const { unmount } = today({ id: "p3", durationMinutes: null, status: "scheduled", sessionModule: "hitting", sessionType: "team_session", practiceKind: "team" });
    expect(screen.getByText(PRACTICE_LENGTH_ASSUMPTION_LINE)).toBeTruthy();
    unmount();
    today({ id: "p4", durationMinutes: null, status: "scheduled", sessionModule: "note", sessionType: "travel", practiceKind: "travel" });
    expect(screen.queryByText(PRACTICE_LENGTH_ASSUMPTION_LINE)).toBeNull();
    expect(readFileSync("src/components/GamePlanCard.tsx", "utf8")).toContain("<GamePlanPracticeLengthNote data={ps}");
  });
});
