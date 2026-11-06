// Locked by owner Nov 6: players (and parents) cannot hide check-ins/readiness from connected coaches and their org.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { CONSENT_SCOPES } from "@/lib/recruiting/consentStatus";
import { CHECKINS_ALWAYS_SHARED } from "@/lib/recruiting/checkinsAlwaysShared";

const read = (p: string) => readFileSync(p, "utf8");
const live = read("drizzle/migrations/0205_coach_checkins_always_visible_testing_day_notices.sql");
const access = live.slice(live.indexOf("FUNCTION public._coach_checkin_access"));
const accessBody = access.slice(0, access.indexOf("$$", access.indexOf("$$") + 2) + 2 || undefined);

describe("check-ins are always shared with connected coaches and the organization", () => {
  it("has the exact plain privacy line on the player's sharing screen", () => {
    expect(CHECKINS_ALWAYS_SHARED).toBe("Your coaches and organization always see your check-ins and readiness.");
    expect(read("src/pages/RecruitingConsent.tsx")).toContain("CHECKINS_ALWAYS_SHARED");
  });

  it("no player or parent switch exists for check-ins or readiness", () => {
    expect(CONSENT_SCOPES.some((s) => /check|readiness/i.test(s))).toBe(false);
    for (const f of ["src/pages/RecruitingConsent.tsx", "src/components/recruiting/ParentSharingChecklist.tsx", "src/components/parent/ParentControls.tsx", "src/components/parent/OptionalSharingControl.tsx"]) {
      const src = read(f);
      expect(src).not.toMatch(/<Switch[^>]*(check-?in|readiness)/i);
    }
  });

  it("the server check-in rule ignores the sharing switches (a player who turned sharing off is still seen)", () => {
    expect(accessBody).toMatch(/_coach_training_access|is_coach_of/);
    expect(accessBody).not.toMatch(/share_health|resolve_recruiting_scope|visibility_enabled|parent_optional/);
  });

  it("an unconnected coach, scout or recruiter is still refused", () => {
    expect(accessBody).toMatch(/NOT public\.user_has_role\(auth\.uid\(\), 'scout'/);
    expect(accessBody).toMatch(/NOT public\.user_has_role\(auth\.uid\(\), 'recruiter'/);
    expect(accessBody).not.toMatch(/\bOR true\b/i);
  });

  it("pending fix: start follow-ups, plan pain lines and load use the check-in rule, not health sharing", () => {
    const fix = read("docs/owner/checkins-always-shared-fix.sql");
    expect(fix).not.toMatch(/resolve_recruiting_scope\(_athlete, 'health'\)/);
    expect(fix.match(/_coach_checkin_access\(_athlete\)/g)?.length).toBe(3);
  });
});
