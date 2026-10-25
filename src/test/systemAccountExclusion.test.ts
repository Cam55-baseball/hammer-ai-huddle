import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Global TEST cleanup law (owner 2026-10-25): parked/system accounts are
 * excluded from every stat, ranking, list, search, coach/org/scout view and
 * nightly job. These guards fail if the exclusion is removed from a reader
 * or job that generates rows or lists athletes.
 */
const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

const JOBS_WITH_SHARED_EXCLUSION = [
  "supabase/functions/nightly-hie-process/index.ts",
  "supabase/functions/hie-refresh-worker/index.ts",
  "supabase/functions/adaptive-phases-shadow/index.ts",
  "supabase/functions/tcs-shadow-run/index.ts",
  "supabase/functions/iq-decay/index.ts",
  "supabase/functions/extract-patterns/index.ts",
  "supabase/functions/generate-follower-reports/index.ts",
];

describe("system/parked account exclusion", () => {
  it("shared helper excludes system, suspended and paused accounts", () => {
    const helper = read("supabase/functions/_shared/systemAccounts.ts");
    expect(helper).toContain("is_system_account.eq.true");
    expect(helper).toContain("suspended_at.not.is.null");
    expect(helper).toContain("account_paused_at.not.is.null");
  });

  for (const job of JOBS_WITH_SHARED_EXCLUSION) {
    it(`${job} filters system accounts before processing`, () => {
      expect(read(job)).toContain("systemAccountIds");
    });
  }

  it("daily plan job only builds for non-system, unsuspended, unpaused players", () => {
    const src = read("supabase/functions/wk-daily-plan-job/index.ts");
    expect(src).toContain('.eq("is_system_account", false)');
    expect(src).toContain('.is("suspended_at", null)');
    expect(src).toContain('.is("account_paused_at", null)');
  });

  it("player search hides system, suspended and paused accounts", () => {
    const src = read("supabase/functions/search-players/index.ts");
    expect(src).toContain(".eq('is_system_account', false)");
    expect(src).toContain(".is('suspended_at', null)");
    expect(src).toContain(".is('account_paused_at', null)");
  });

  it("the public profile view migration excludes parked accounts", () => {
    const sql = read("drizzle/migrations/0114_profiles_public_exclude_system_accounts.sql");
    expect(sql).toContain("is_system_account = false");
    expect(sql).toContain("suspended_at IS NULL");
    expect(sql).toContain("account_paused_at IS NULL");
  });

  it("rankings drop rows whose profile is hidden", () => {
    expect(read("src/pages/Rankings.tsx")).toContain("profilesMap[d.user_id]");
  });

  it("coach roster removes athletes missing from the public view", () => {
    expect(read("src/hooks/coach/useCoachRoster.ts")).toContain("map.delete(id)");
  });

  it("org team roster drops members with no visible profile", () => {
    expect(read("src/components/organization/TeamRosterView.tsx")).toContain("memberIds.filter(uid => profiles.has(uid))");
  });

  it("org team stats count only members visible in the public view", () => {
    const src = read("src/hooks/useTeamStats.ts");
    expect(src).toContain("profiles_public");
    expect(src).toContain("visibleIds.has(id)");
  });

  it("population RPCs exclude system/parked accounts (live definitions evidence)", () => {
    const defs = read(".lovable/proofs/global-test-closeout/0115-live-definitions.txt");
    for (const fn of ["search_athletes_to_connect", "team_discipline_summary", "org_test_ranking", "org_compare_athletes", "org_facility_board"]) {
      expect(defs).toContain(`public.${fn}(`);
    }
    // Every redefined population function carries the exclusion predicate.
    const bodies = defs.split("CREATE OR REPLACE FUNCTION").slice(1);
    expect(bodies.length).toBe(5);
    for (const body of bodies) {
      expect(body.toLowerCase()).toContain("is_system_account");
      expect(body.toLowerCase()).toContain("suspended_at is null");
      expect(body.toLowerCase()).toContain("account_paused_at is null");
    }
  });

  it("the scheduled missed-work marker excludes parked accounts (live definition evidence)", () => {
    const def = read(".lovable/proofs/global-test-closeout/0116-wk-mark-missed-lifts-live.txt");
    expect(def).toContain("public.wk_mark_missed_lifts()");
    expect(def).toContain("COALESCE(p.is_system_account, false) = false");
    expect(def).toContain("p.suspended_at IS NULL");
    expect(def).toContain("p.account_paused_at IS NULL");
  });

  it("coach prescription arm check uses the shared arm ledger and ramp judges", () => {
    const src = read("supabase/functions/_shared/coach/armLoadCheck.ts");
    expect(src).toContain("ledgerDay");
    expect(src).toContain("armBudget");
    expect(src).toContain("activeRamps");
    expect(read("supabase/functions/_shared/coach/loadPrescriptionEnvelope.ts")).toContain("checkCoachArmLoad");
  });

  it("the client arm-ledger adapter re-exports the shared module (one source)", () => {
    const client = read("src/lib/throwing/armLedgerEntry.ts");
    expect(client).toContain("export * from");
    expect(client).toContain("_shared/wic/phases/armLedgerEntry");
  });

  it("coach use_instead reaches the certified day-lock commit for skill blocks", () => {
    const edge = read("supabase/functions/coach-rx-safety/index.ts");
    // The blanket refusal is gone; replacement flows through the commit path.
    expect(edge).not.toContain("hasn't passed its complete safety check yet");
    expect(edge).toContain("block_expected");
    expect(edge).toContain("coach_rx_commit_certified");
  });
});
