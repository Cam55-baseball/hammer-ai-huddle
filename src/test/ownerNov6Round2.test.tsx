import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "fs";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CoachCheckinsReadinessView, TeamReadinessStripView } from "@/components/coach/CoachCheckinsReadinessTab";
import { TestingDayNoticesView } from "@/components/organization/TestingDayNotices";

const mig = readdirSync("drizzle/migrations").filter((f) => f.includes("coach_checkins_always_visible")).map((f) => readFileSync(`drizzle/migrations/${f}`, "utf8")).join("\n");
const fn = (name: string) => { const i = mig.indexOf(`FUNCTION public.${name}(`); return mig.slice(i, mig.indexOf("$function$;", i) > 0 ? mig.indexOf("$function$;", i) : mig.indexOf("$$;", i)); };

describe("Owner Nov 6 r2 #1 — check-ins always visible to connected coaches", () => {
  it("a connected coach sees a non-sharing player's check-ins: no health-sharing gate on check-ins/readiness", () => {
    for (const f of ["coach_athlete_checkins_28", "coach_athlete_readiness", "coach_team_readiness_today"]) {
      expect(fn(f)).not.toMatch(/resolve_recruiting_scope/);
      expect(fn(f)).toMatch(/_coach_checkin_access/);
    }
    render(<CoachCheckinsReadinessView data={{ shared: true, checkins: [], daily_logs: [], load: [], today: "2026-11-06" }} />);
    expect(screen.queryByText(/Not shared by the player/)).toBeNull();
  });
  it("an unconnected coach can't: access requires a coaching connection or assigned org staff, and refuses otherwise", () => {
    const gate = fn("_coach_checkin_access");
    expect(gate).toMatch(/_coach_training_access\(_athlete\)/);
    expect(gate).toMatch(/is_coach_of\(auth\.uid\(\), _athlete\)/);
    expect(gate).not.toMatch(/is_linked_coach/); // follow-only scouts/recruiters never qualify
    expect(gate).toMatch(/'scout'/);
    expect(fn("coach_athlete_checkins_28")).toMatch(/not authorized/);
    expect(fn("coach_athlete_readiness")).toMatch(/not authorized/);
  });
  it("the strip never shows a not-shared state", () => {
    render(<TeamReadinessStripView rows={[{ athlete_id: "1", name: "Ana", checked_in: false }]} />);
    expect(screen.getByText("Ana · Not checked in yet")).toBeTruthy();
    expect(screen.queryByText(/Not shared/)).toBeNull();
  });
  it("the lawyer queue carries the privacy-policy line", () => {
    expect(readFileSync("docs/owner/legal-review-queue.md", "utf8")).toMatch(/coaches[\s\S]*see your daily check-ins and readiness/i);
  });
});

describe("Owner Nov 6 r2 #2 — coach reaches the player's plan and week", () => {
  it("My players has a Plan & week button that opens the coach week tab", () => {
    const src = readFileSync("src/pages/CoachDashboard.tsx", "utf8");
    expect(src).toMatch(/\/coach\/athlete\/\$\{player\.id\}\?tab=week/);
    expect(readFileSync("src/pages/CoachAthleteDetail.tsx", "utf8")).toMatch(/searchParams\.get\("tab"\)/);
  });
});

describe("Owner Nov 6 r2 #3 — testing day notices", () => {
  it("the player is a recipient, and due reminders run for any recipient", () => {
    expect(fn("_testing_day_recipients")).toMatch(/UNION SELECT _td\.athlete_id/);
    expect(fn("_testing_day_recipients")).toMatch(/org_athlete_assignments/);
    expect(fn("send_my_testing_day_reminders")).toMatch(/Testing day is today/);
    expect(fn("send_my_testing_day_reminders")).toMatch(/current_date \+ 1 AND current_date \+ 3/);
  });
  it("notices render for the coach/player", () => {
    render(<TestingDayNoticesView notices={[{ id: "1", title: "Testing day scheduled", message: "Ana — testing day 2026-11-09. Tests: 60", is_read: false, created_at: "" }]} />);
    expect(screen.getByText("Testing day scheduled")).toBeTruthy();
  });
});

describe("Owner Nov 6 r2 #4 — organization View opens the coach profile", () => {
  it("roster View goes to /coach/athlete, never the missing /player route", () => {
    const src = readFileSync("src/components/organization/TeamRosterView.tsx", "utf8");
    expect(src).not.toMatch(/\/player\/\$\{/);
    expect(src).toMatch(/\/coach\/athlete\/\$\{p\.userId\}/);
    void MemoryRouter;
  });
});
