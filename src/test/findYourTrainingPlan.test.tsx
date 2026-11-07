/**
 * Owner Nov 6 (locked): the Dashboard shows ONE "Find Your Training Plan" button under the
 * baseball/softball toggle. The button opens /training-plans, which holds — in the same order and
 * unchanged — the three plan squares, merch, the Coach/Organization plans and Add-ons.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { planTileDestination, pricingBackTarget, pricingState, trainingPlansUrl, TRAINING_PLANS_PATH } from "@/lib/dashboard/trainingPlans";

const h = vi.hoisted(() => ({
  held: [] as string[],
  staff: false,
  purchase: true,
  mode: "web" as string,
  callFn: vi.fn(),
  buyAddon: vi.fn(),
  // Stable objects: real hooks return the same user/session between renders.
  auth: { user: { id: "u1", user_metadata: { full_name: "Test Player" } }, session: {}, loading: false, isAuthStable: true },
  modules: [] as string[],
  refetch: async () => {},
  onModulesChange: () => () => {},
  enableFastPolling: () => {},
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => h.auth,
}));
vi.mock("@/hooks/useSubscription", () => ({
  useSubscription: () => ({
    modules: h.modules, module_details: {}, loading: false, refetch: h.refetch,
    hasAccessForSport: (m: string) => (h.held.includes("golden2way") ? ["hitting", "pitching"].includes(m) : false),
    activePlansForSport: () => h.held,
    getModuleDetails: () => null, onModulesChange: h.onModulesChange, enableFastPolling: h.enableFastPolling,
  }),
}));
vi.mock("@/hooks/usePurchaseAvailability", () => ({
  usePurchaseAvailability: () => ({ canShowPurchaseUI: h.purchase, mode: h.mode, isStaffAccount: h.staff, roleLoading: false }),
}));
vi.mock("@/hooks/useOwnerAccess", () => ({ useOwnerAccess: () => ({ isOwner: false }) }));
vi.mock("@/hooks/useAdminAccess", () => ({ useAdminAccess: () => ({ isAdmin: false }) }));
vi.mock("@/hooks/useScoutAccess", () => ({ useScoutAccess: () => ({ isScout: false, isCoach: h.staff, loading: false }) }));
vi.mock("@/hooks/usePlayerModuleAccess", () => ({ usePlayerModuleAccess: () => ({ hasPlayerAccess: false }) }));
vi.mock("@/hooks/useProgramsRetired", () => ({ useProgramsRetired: () => ({ retired: false }) }));
vi.mock("@/hooks/usePlayerOrganization", () => ({ usePlayerOrganization: () => ({ orgName: null }) }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: () => ({ select: () => ({ eq: async () => ({ data: [], error: null }) }) }) },
}));
vi.mock("@/lib/addons/client", () => ({ callFn: h.callFn, buyAddon: h.buyAddon, askParents: vi.fn() }));
vi.mock("@/lib/purchase/websiteHandoff", () => ({ openWebsiteCheckout: vi.fn(async () => {}) }));
vi.mock("@/components/DashboardLayout", () => ({ DashboardLayout: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock("@/components/loading/HMLoadingScreen", () => ({ HMLoadingFallback: () => <div>loading</div> }));
vi.mock("@/components/organization/TestingDayNotices", () => ({ TestingDayNotices: () => null }));
vi.mock("@/components/FollowRequestsPanel", () => ({ FollowRequestsPanel: () => null }));
vi.mock("@/components/identity/IdentityCommandCard", () => ({ IdentityCommandCard: () => null }));
vi.mock("@/components/CoachScoutGamePlanCard", () => ({ CoachScoutGamePlanCard: () => null }));
vi.mock("@/components/games/PostGameLogPrompt", () => ({ PostGameLogPrompt: () => null }));
vi.mock("@/components/hammer/HammerDailyPlan", () => ({ HammerDailyPlan: () => null }));
vi.mock("@/components/dashboard/TodaysHammerPick", () => ({ TodaysHammerPick: () => null }));
vi.mock("@/components/dashboard/CommunicationAI", () => ({ CommunicationAI: () => null }));

import Dashboard from "@/pages/Dashboard";
import TrainingPlans from "@/pages/TrainingPlans";

function Where() {
  const l = useLocation();
  return <div data-testid="where">{l.pathname + l.search}|{JSON.stringify(l.state ?? null)}</div>;
}

function app(start: string) {
  return render(
    <MemoryRouter initialEntries={[start]}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/training-plans" element={<TrainingPlans />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
}

const ADDON_STATUS = { gate: "self", parentIds: [], recap: { ok: true }, purchases: [], requests: [] };

beforeEach(() => {
  h.held = []; h.staff = false; h.purchase = true; h.mode = "web";
  localStorage.clear();
  localStorage.setItem("dontShowSportWarning", "true");
  h.callFn.mockReset().mockResolvedValue(ADDON_STATUS);
  h.buyAddon.mockReset().mockResolvedValue({ canceled: true });
});

/** Section order on a page, by the markers each moved item carries. */
const sectionOrder = (root: HTMLElement) => {
  const marks: [string, Element | null][] = [
    ["toggle", root.querySelector('[role="tablist"]')],
    ["button", root.querySelector("[data-find-training-plan]")],
    ["tiles", root.querySelector("[data-plan-tile]")],
    ["merch", root.querySelector("[data-merch-tile]")],
    ["staff", root.querySelector('[aria-label="Coach and Organization plans"]')],
    ["addons", root.querySelector('[aria-label="Add-ons"]')],
  ];
  return marks.filter(([, el]) => el).sort(([, a], [, b]) => (a!.compareDocumentPosition(b!) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1)).map(([k]) => k);
};

describe("Dashboard — one Find Your Training Plan button", () => {
  it("keeps the toggle, puts the button directly under it, and no longer shows the moved items", async () => {
    const { container } = app("/dashboard");
    await screen.findByRole("button", { name: "Find Your Training Plan" });
    expect(sectionOrder(container)).toEqual(["toggle", "button"]);
  });

  it("the button opens the plans page on the sport selected on the Dashboard", async () => {
    localStorage.setItem("selectedSport", "softball");
    const { container } = app("/dashboard");
    fireEvent.click(await screen.findByRole("button", { name: "Find Your Training Plan" }));
    await screen.findByRole("heading", { name: "Find Your Training Plan" });
    expect(container.querySelector('[role="tab"][data-state="active"]')?.getAttribute("data-value") ?? container.querySelector('[role="tab"][aria-selected="true"]')?.textContent).toMatch(/softball/i);
  });

  it("staff accounts (no toggle) still get the button where the merch square was", async () => {
    h.staff = true;
    const { container } = app("/dashboard");
    await screen.findByRole("button", { name: "Find Your Training Plan" });
    expect(sectionOrder(container)).toEqual(["button"]);
  });
});

describe("/training-plans — same items, same order, same behavior", () => {
  it("shows the plan squares, merch, Coach/Organization plans and Add-ons in the old order", async () => {
    const { container } = app("/training-plans?sport=baseball");
    await screen.findByRole("heading", { name: "Find Your Training Plan" });
    await waitFor(() => expect(sectionOrder(container)).toEqual(["toggle", "tiles", "merch", "staff", "addons"]));
    expect(container.querySelectorAll("[data-plan-tile]")).toHaveLength(3);
  });

  it("Back to Dashboard returns to the Dashboard", async () => {
    app("/training-plans?sport=baseball");
    fireEvent.click(await screen.findByRole("button", { name: /Back to Dashboard/ }));
    await screen.findByRole("button", { name: "Find Your Training Plan" });
  });

  it("the toggle carries back: a sport picked on the plans page is the Dashboard's sport", async () => {
    const { container } = app("/training-plans?sport=baseball");
    await screen.findByRole("heading", { name: "Find Your Training Plan" });
    const softTab = Array.from(container.querySelectorAll('[role="tab"]')).find((t) => /softball/i.test(t.textContent ?? ""))!;
    fireEvent.mouseDown(softTab); fireEvent.click(softTab);
    await waitFor(() => expect(localStorage.getItem("selectedSport")).toBe("softball"));
  });

  it("Unlock Now on a locked square goes to Pricing with the same sport/tier and a way back here", async () => {
    app("/training-plans?sport=softball");
    const unlock = await screen.findAllByRole("button", { name: /Unlock Now/ });
    fireEvent.click(unlock[0]);
    const where = await screen.findByTestId("where");
    expect(where.textContent).toContain("/pricing|");
    expect(JSON.parse(where.textContent!.split("|")[1])).toEqual({ sport: "softball", tier: "pitcher", from: "/training-plans" });
  });

  it("a Golden 2Way holder still sees the other two squares as parts of that one plan and can Start", async () => {
    h.held = ["golden2way"];
    const { container } = app("/training-plans?sport=baseball");
    await screen.findByRole("heading", { name: "Find Your Training Plan" });
    const states = Array.from(container.querySelectorAll("[data-plan-tile]")).map((e) => [e.getAttribute("data-plan-tile"), e.getAttribute("data-plan-state")]);
    expect(states).toEqual([["pitcher", "part-of-golden2way"], ["5tool", "part-of-golden2way"], ["golden2way", "unlocked"]]);
    fireEvent.click(container.querySelector('[data-plan-tile="golden2way"]')!);
    expect((await screen.findByTestId("where")).textContent).toContain("/golden-2way");
  });

  it("iPhone storefront keeps 'Subscribe on our website'", async () => {
    h.mode = "native-linkout";
    app("/training-plans?sport=baseball");
    expect(await screen.findAllByRole("button", { name: "Subscribe on our website" })).toHaveLength(3);
  });

  it("Add-ons still buy from here (Buy button calls the same purchase path)", async () => {
    app("/training-plans?sport=baseball");
    const section = await screen.findByLabelText("Add-ons");
    await waitFor(() => expect(section.querySelectorAll("button:not([disabled])").length).toBeGreaterThan(0));
    fireEvent.click(Array.from(section.querySelectorAll("button")).find((b) => !b.disabled)!);
    await waitFor(() => expect(h.buyAddon).toHaveBeenCalledWith("online_lessons", "u1"));
  });

  it("purchase hidden: plan squares stay inert and no Coach/Org plans or Add-ons show", async () => {
    h.purchase = false;
    const { container } = app("/training-plans?sport=baseball");
    await screen.findByRole("heading", { name: "Find Your Training Plan" });
    expect(sectionOrder(container)).toEqual(["toggle", "tiles", "merch"]);
  });
});

describe("routing rules", () => {
  it("the page URL carries the sport", () => {
    expect(trainingPlansUrl("softball")).toBe("/training-plans?sport=softball");
    expect(TRAINING_PLANS_PATH).toBe("/training-plans");
  });
  it("Pricing Back returns to the plans page only when the player came from it", () => {
    expect(pricingBackTarget(pricingState("baseball", "5tool"))).toEqual({ path: "/training-plans", toPlans: true });
    expect(pricingBackTarget(null)).toEqual({ path: "/dashboard", toPlans: false });
    expect(pricingBackTarget({ sport: "baseball" })).toEqual({ path: "/dashboard", toPlans: false });
  });
  it("square taps keep the Dashboard's old destinations", () => {
    const base = { sport: "baseball" as const, isOwnerOrAdmin: false, canShowPurchaseUI: true, isTierUnlocked: () => false, heldPlans: [], hasAccessForSport: () => false };
    expect(planTileDestination({ ...base, module: "5tool" })).toEqual({ path: "/pricing", state: { sport: "baseball", tier: "5tool", from: "/training-plans" } });
    expect(planTileDestination({ ...base, module: "pitcher", hasAccessForSport: (m) => m === "pitching" })).toEqual({ path: "/complete-pitcher" });
    expect(planTileDestination({ ...base, module: "golden2way", isOwnerOrAdmin: true })).toEqual({ path: "/golden-2way" });
    expect(planTileDestination({ ...base, module: "5tool", canShowPurchaseUI: false })).toBeNull();
  });
  it("the add-on Stripe cancel return lands on the plans page; success still lands on the add-on thanks page", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("supabase/functions/create-addon-checkout/index.ts", "utf8");
    expect(src).toMatch(/cancel_url: `\$\{origin\}\/training-plans`/);
    expect(src).toMatch(/success_url: `\$\{origin\}\/addons\/success\?session_id=/);
  });
});
