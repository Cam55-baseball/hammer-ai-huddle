import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { buildShadowInputs, type RawPractice } from "../../../supabase/functions/_shared/wic/schedule/tissueCost/shadow/adapter";
import { PLAN_RULES_VERSION } from "../../../supabase/functions/_shared/planRulesVersion";
import { practiceLengthProblem, practiceLengthMissing, PRACTICE_LENGTH_ASSUMPTION_LINE, coachPracticeLengthBlocked } from "@/lib/practice/practiceLength";

const inserted: any[] = [];
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));
vi.mock("@/hooks/useScheduleTimeline", () => ({ announceChange: vi.fn().mockResolvedValue(null) }));
vi.mock("@/integrations/supabase/client", () => {
  const chain: any = { select: () => chain, eq: () => chain, maybeSingle: () => Promise.resolve({ data: { sport: "baseball" }, error: null }) };
  return {
    supabase: {
      from: () => ({ ...chain, insert: (row: any) => { inserted.push(row); return Promise.resolve({ error: null }); } }),
    },
  };
});
import { AddPracticeDialog } from "@/components/hammer/AddPracticeDialog";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

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

describe("Owner Nov 10 — planner: a blank practice length counts as 60, never 0", () => {
  it("blank (null) length counts as 60 minutes with the default note", () => {
    const r = practiceDay([{ scheduled_date: DAY, duration_minutes: null, status: "scheduled" }]);
    expect(r.day?.practiceMinutes).toBe(60);
    expect(r.diagnostics).toContain(`practice_minutes_default_${DAY}`);
  });

  it("an entered 90 counts as 90, with no default note", () => {
    const r = practiceDay([{ scheduled_date: DAY, duration_minutes: 90, status: "scheduled" }]);
    expect(r.day?.practiceMinutes).toBe(90);
    expect(r.diagnostics).not.toContain(`practice_minutes_default_${DAY}`);
  });

  it("cancelled practices stay ignored (both spellings)", () => {
    expect(practiceDay([{ scheduled_date: DAY, duration_minutes: null, status: "cancelled" }]).day?.practiceMinutes ?? null).toBeNull();
    expect(practiceDay([{ scheduled_date: DAY, duration_minutes: null, status: "canceled" }]).day?.practiceMinutes ?? null).toBeNull();
  });

  it("the stored record stays blank: the planner never fills in the 60", () => {
    const row: RawPractice = { scheduled_date: DAY, duration_minutes: null, status: "scheduled" };
    practiceDay([row]);
    expect(row.duration_minutes).toBeNull();
    // The planner service never writes practice rows.
    for (const f of [
      "supabase/functions/_shared/wic/schedule/tissueCost/shadow/run.ts",
      "supabase/functions/tcs-shadow-run/index.ts",
    ]) {
      const src = readFileSync(f, "utf8");
      expect(src).not.toMatch(/scheduled_practice_sessions"\)\s*\.(insert|update|upsert)/);
    }
  });

  it("the rules version is bumped so saved future days refresh", () => {
    expect(PLAN_RULES_VERSION).toBe(14);
  });
});

describe("Owner Nov 10 — practice length is asked for", () => {
  it("5 and 400 minutes are refused; blank is required; 10, 90 and 360 are fine", () => {
    expect(practiceLengthProblem("5")).toBe("impossible");
    expect(practiceLengthProblem("400")).toBe("impossible");
    expect(practiceLengthProblem("")).toBe("required");
    expect(practiceLengthProblem("10")).toBeNull();
    expect(practiceLengthProblem("90")).toBeNull();
    expect(practiceLengthProblem("360")).toBeNull();
  });

  it("a shown practice with no length is labeled; cancelled or entered ones are not", () => {
    expect(PRACTICE_LENGTH_ASSUMPTION_LINE).toBe("Length not entered — counted as 60 minutes. Add the length.");
    expect(practiceLengthMissing({ duration_minutes: null, status: "scheduled" })).toBe(true);
    expect(practiceLengthMissing({ duration_minutes: 90, status: "scheduled" })).toBe(false);
    expect(practiceLengthMissing({ duration_minutes: null, status: "canceled" })).toBe(false);
  });

  it("coach sends never let the server silently change a length", () => {
    expect(coachPracticeLengthBlocked("300")).toBe(true);
    expect(coachPracticeLengthBlocked("12")).toBe(true);
    expect(coachPracticeLengthBlocked("90")).toBe(false);
  });

  describe("the player's Add practice form", () => {
    beforeEach(() => { inserted.length = 0; });
    const open = () => render(
      <QueryClientProvider client={new QueryClient()}>
        <AddPracticeDialog open onOpenChange={() => {}} defaultDate={DAY} />
      </QueryClientProvider>,
    );
    const save = () => fireEvent.click(screen.getByRole("button", { name: /save practice/i }));
    const typeLength = (v: string) => fireEvent.change(screen.getByRole("textbox", { name: /how long is practice/i }), { target: { value: v } });

    it("requires a length: nothing is saved without one", async () => {
      open();
      save();
      expect(await screen.findByText("Add how long practice is (minutes).")).toBeTruthy();
      expect(inserted).toHaveLength(0);
    });

    it.each(["5", "400"])("refuses %s minutes with the friendly message", async (v) => {
      open();
      typeLength(v);
      save();
      expect(await screen.findByText("That number doesn't look right — double-check it.")).toBeTruthy();
      expect(inserted).toHaveLength(0);
    });

    it("saves the length exactly as entered (quick pick 120)", async () => {
      open();
      fireEvent.click(screen.getByRole("button", { name: "120" }));
      save();
      await waitFor(() => expect(inserted).toHaveLength(1));
      expect(inserted[0].duration_minutes).toBe(120);
    });
  });
});
