/**
 * Owner Nov 6 r5 (locked): every screen that names a plan or marks one unlocked uses the ONE shared
 * activePlans judge. A Golden 2Way holder is shown exactly one plan: The Golden 2Way. Plans are never
 * inferred from the read-time skill keys (Golden 2Way → hitting + throwing + pitching).
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { activePlans, heldPlans, normalizeProgramModules } from "../../../../supabase/functions/_shared/programAccess";
import { billingRows, heldPlanLabels } from "../planDisplay";
import { plansForSport } from "@/utils/tierAccess";

// TEST "Test Pitcher" (1356c243…): sponsored Golden 2Way + own Complete Pitcher payment that is ending.
const TEST_PITCHER_KEYS = ["baseball_golden2way", "baseball_pitching"];
const TEST_PITCHER_DETAILS = {
  baseball_golden2way: { status: "scheduled", subscription_id: "sponsor:abc", sponsored: true, current_period_end: "2026-12-06T00:00:00Z", cancel_at_period_end: false },
  baseball_pitching: { status: "active", subscription_id: "sub_123", current_period_end: "2026-12-06T00:00:00Z", cancel_at_period_end: true },
};
const PLAN_NAMES = [/Complete Pitcher/, /5Tool Player/, /Golden 2Way/];
const namesShown = (text: string) => PLAN_NAMES.filter((r) => r.test(text));

describe("activePlans — the one shared judge", () => {
  it("Golden 2Way holder → exactly Golden 2Way, even with an older pitching payment", () => {
    expect(activePlans("baseball", TEST_PITCHER_KEYS)).toEqual(["golden2way"]);
    expect(activePlans("softball", ["softball_golden2way"])).toEqual(["golden2way"]);
  });
  it("5Tool holder → 5Tool only; Complete Pitcher holder → Complete Pitcher only", () => {
    expect(activePlans("baseball", ["baseball_5tool"])).toEqual(["5tool"]);
    expect(activePlans("baseball", ["baseball_pitcher"])).toEqual(["pitcher"]);
  });
  it("two separate plans really held → both shown", () => {
    expect(activePlans("baseball", ["baseball_pitcher", "baseball_5tool"])).toEqual(["pitcher", "5tool"]);
  });
  it("never reads the read-time aliases as extra plans (sports stay separate)", () => {
    expect(heldPlans(["baseball_golden2way"], "baseball")).toEqual([{ sport: "baseball", plan: "golden2way" }]);
    expect(activePlans("softball", ["baseball_golden2way"])).toEqual([]);
    // The normalized access list contains pitching + hitting aliases; plan naming never uses it.
    expect(normalizeProgramModules(["baseball_golden2way"]).length).toBeGreaterThan(1);
    expect(plansForSport({ activePlansForSport: (s) => activePlans(s, ["baseball_golden2way"]) }, "baseball")).toEqual(["golden2way"]);
  });
  it("Profile labels and billing rows for the TEST account name only Golden 2Way", () => {
    expect(heldPlanLabels(TEST_PITCHER_KEYS, "baseball")).toEqual(["Baseball · The Golden 2Way"]);
    const rows = billingRows(TEST_PITCHER_DETAILS, TEST_PITCHER_KEYS, "baseball");
    expect(new Set(rows.map((r) => r.planTitle))).toEqual(new Set(["The Golden 2Way"]));
    expect(rows.find((r) => r.key === "baseball_pitching")?.note).toMatch(/already part of The Golden 2Way/);
  });
});

describe("rendered screens for a Golden 2Way holder show exactly one plan", () => {
  it("Profile → plan badges", async () => {
    const { HeldPlanBadges } = await import("@/components/subscription/HeldPlans");
    const { container } = render(<HeldPlanBadges planModules={TEST_PITCHER_KEYS} primarySport="baseball" />);
    expect(container.querySelectorAll("[data-held-plan]")).toHaveLength(1);
    expect(namesShown(container.textContent ?? "")).toHaveLength(1);
  });

  it("Profile → plans/purchases billing cards", async () => {
    const { PlanBillingCards } = await import("@/components/subscription/HeldPlans");
    const { container } = render(<PlanBillingCards moduleDetails={TEST_PITCHER_DETAILS} planModules={TEST_PITCHER_KEYS} primarySport="baseball" onActionComplete={() => {}} />);
    const text = container.textContent ?? "";
    expect(namesShown(text).map(String)).toEqual([String(/Golden 2Way/)]);
    expect(text).toMatch(/Sponsored/);
  });

  it("Dashboard → plan tiles: one Unlocked, the other two are parts of it (no Unlock Now)", async () => {
    const { PlanTiles } = await import("@/components/dashboard/PlanTiles");
    const held = activePlans("baseball", TEST_PITCHER_KEYS);
    const { container } = render(
      <PlanTiles isTierUnlocked={(t) => held.includes(t as never)} heldPlans={held} canShowPurchaseUI purchaseMode="web" programsRetired={false} onSelect={() => {}} onUnlock={() => {}} />,
    );
    const unlocked = [...container.querySelectorAll("[data-plan-state='unlocked']")].map((n) => n.getAttribute("data-plan-tile"));
    expect(unlocked).toEqual(["golden2way"]);
    expect(container.querySelectorAll("[data-plan-state='part-of-golden2way']")).toHaveLength(2);
    expect(screen.queryByText(/Unlock Now/)).toBeNull();
  });

  it("Dashboard → a genuine two-plan holder sees both Unlocked", async () => {
    const { PlanTiles } = await import("@/components/dashboard/PlanTiles");
    const held = activePlans("baseball", ["baseball_pitcher", "baseball_5tool"]);
    const { container } = render(
      <PlanTiles isTierUnlocked={(t) => held.includes(t as never)} heldPlans={held} canShowPurchaseUI purchaseMode="web" programsRetired={false} onSelect={() => {}} onUnlock={() => {}} />,
    );
    expect([...container.querySelectorAll("[data-plan-state='unlocked']")].map((n) => n.getAttribute("data-plan-tile"))).toEqual(["pitcher", "5tool"]);
  });
});

// ── Side menu ────────────────────────────────────────────────────────────────
const sub = { modules: [] as string[], plan_modules: [] as string[] };
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (_k: string, f?: string) => f ?? _k }) }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ signOut: vi.fn() }) }));
vi.mock("@/hooks/useOrganization", () => ({ useOrganization: () => ({ myOrgs: { data: [] } }) }));
vi.mock("@/hooks/usePlayerOrganization", () => ({ usePlayerOrganization: () => ({ membership: null, roleInOrg: "player" }) }));
vi.mock("@/hooks/useOwnerAccess", () => ({ useOwnerAccess: () => ({ isOwner: false }) }));
vi.mock("@/hooks/useAdminAccess", () => ({ useAdminAccess: () => ({ isAdmin: false }) }));
vi.mock("@/hooks/useScoutAccess", () => ({ useScoutAccess: () => ({ isScout: false, isCoach: false }) }));
vi.mock("@/hooks/useRankingsVisibility", () => ({ useRankingsVisibility: () => ({ visible: false, loading: false }) }));
vi.mock("@/hooks/usePlayerModuleAccess", () => ({ usePlayerModuleAccess: () => ({ hasPlayerAccess: true, hasPurchasedModule: true, loading: false }) }));
vi.mock("@/hooks/useLanguage", () => ({ useLanguage: () => ({ currentLanguage: "en" }) }));
vi.mock("@/hooks/useSubscription", () => ({
  useSubscription: () => ({ modules: sub.modules, plan_modules: sub.plan_modules, activePlansForSport: (s: string) => activePlans(s, sub.plan_modules, "baseball") }),
}));
vi.mock("@/hooks/useVaultPendingStatus", () => ({ useVaultPendingStatus: () => ({ hasPendingItems: false, pendingCount: 0 }) }));
vi.mock("@/hooks/usePendingRequests", () => ({ usePendingRequests: () => ({ pendingCount: 0, loading: false }) }));
vi.mock("@/contexts/SportThemeContext", () => ({ useSportTheme: () => ({ isSoftball: false }) }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: () => ({ select: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }), functions: { invoke: async () => ({ data: null, error: null }) } },
}));

describe("side menu for a Golden 2Way holder", () => {
  it("shows one plan section (Golden 2Way) and keeps its workouts", async () => {
    localStorage.setItem("selectedSport", "baseball");
    sub.plan_modules = TEST_PITCHER_KEYS;
    sub.modules = normalizeProgramModules(TEST_PITCHER_KEYS, "baseball");
    const { AppSidebar } = await import("@/components/AppSidebar");
    const { SidebarProvider } = await import("@/components/ui/sidebar");
    const { container } = render(<MemoryRouter><SidebarProvider><AppSidebar /></SidebarProvider></MemoryRouter>);
    const text = container.textContent ?? "";
    expect(text).toMatch(/Golden 2Way|golden/i);
    expect(text).not.toMatch(/5Tool Player/);
    expect(text).not.toMatch(/completePitcherShort|Complete Pitcher/);
    // Nothing taken away: the Pitcher/5Tool workouts are reachable inside Golden 2Way.
    expect(text).toMatch(/The Unicorn/);
    expect(text).toMatch(/Explosive Conditioning/);
  });
});
