/**
 * LOCKED BY OWNER NOV 7: tapping "Find Your Training Plan" goes STRAIGHT to /training-plans —
 * no demo, tour, preview, walkthrough, overlay, interstitial or redirect — for every account.
 * The cause was the app-wide demo gate: '/training-plans' matched its '/training' prefix and a
 * pending-demo account was redirected to /start-here. Do not remove this test.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const h = vi.hoisted(() => ({
  held: [] as string[],
  staff: false,
  coach: false,
  demoState: "pending" as string,
  auth: { user: { id: "u1", created_at: new Date().toISOString(), user_metadata: { full_name: "Test Player" } }, session: {}, loading: false, isAuthStable: true },
  refetch: async () => {},
  onModulesChange: () => () => {},
  enableFastPolling: () => {},
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => h.auth, useOptionalAuth: () => h.auth }));
vi.mock("@/hooks/useSubscription", () => ({
  useSubscription: () => ({
    modules: h.held.length ? ["hitting"] : [], module_details: {}, loading: false, refetch: h.refetch,
    hasAccessForSport: (m: string) => (h.held.includes("5tool") ? m === "hitting" : false),
    activePlansForSport: () => h.held,
    getModuleDetails: () => null, onModulesChange: h.onModulesChange, enableFastPolling: h.enableFastPolling,
  }),
}));
vi.mock("@/hooks/usePurchaseAvailability", () => ({
  usePurchaseAvailability: () => ({ canShowPurchaseUI: true, mode: "web", isStaffAccount: h.staff, roleLoading: false }),
}));
vi.mock("@/hooks/useDemoProgress", () => ({
  useDemoProgress: () => ({ progress: { demo_state: h.demoState }, loading: false }),
}));
vi.mock("@/hooks/useOwnerAccess", () => ({ useOwnerAccess: () => ({ isOwner: false }) }));
vi.mock("@/hooks/useAdminAccess", () => ({ useAdminAccess: () => ({ isAdmin: false }) }));
vi.mock("@/hooks/useScoutAccess", () => ({ useScoutAccess: () => ({ isScout: false, isCoach: h.coach, loading: false }) }));
vi.mock("@/hooks/usePlayerModuleAccess", () => ({ usePlayerModuleAccess: () => ({ hasPlayerAccess: false }) }));
vi.mock("@/hooks/useProgramsRetired", () => ({ useProgramsRetired: () => ({ retired: false }) }));
vi.mock("@/hooks/usePlayerOrganization", () => ({ usePlayerOrganization: () => ({ orgName: null }) }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => Object.assign(Promise.resolve({ data: [], error: null }), {
          maybeSingle: async () => ({ data: { parent_controlled: false }, error: null }),
        }),
      }),
    }),
  },
}));
vi.mock("@/lib/addons/client", () => ({
  callFn: vi.fn(async () => ({ gate: "self", parentIds: [], recap: { ok: true }, purchases: [], requests: [] })),
  buyAddon: vi.fn(), askParents: vi.fn(),
}));
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
import { DemoGate } from "@/components/demo/DemoGate";

function Where() {
  const l = useLocation();
  return <div data-testid="where">{l.pathname + l.search}</div>;
}
const DemoScreen = () => <div data-testid="demo-screen">DEMO</div>;

function app(start: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[start]}>
        <DemoGate>
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/training-plans" element={<><TrainingPlans /><Where /></>} />
            <Route path="/start-here" element={<><DemoScreen /><Where /></>} />
            <Route path="/demo/*" element={<DemoScreen />} />
            <Route path="*" element={<Where />} />
          </Routes>
        </DemoGate>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  h.held = []; h.staff = false; h.coach = false; h.demoState = "pending";
  localStorage.clear();
  localStorage.setItem("dontShowSportWarning", "true");
});

const ACCOUNTS = [
  { name: "a player with no plan", held: [] as string[], staff: false, coach: false },
  { name: "a player with a plan", held: ["5tool"], staff: false, coach: false },
  { name: "a coach", held: [] as string[], staff: true, coach: true },
  // Worst case for an org admin: not counted as staff, no plan, demo still pending.
  { name: "an org admin", held: [] as string[], staff: false, coach: false },
];

describe("locked by owner Nov 7 — Find Your Training Plan never shows a demo", () => {
  it.each(ACCOUNTS)("$name lands on /training-plans with no demo, tour or redirect", async (acct) => {
    h.held = acct.held; h.staff = acct.staff; h.coach = acct.coach;
    app("/dashboard");
    fireEvent.click(await screen.findByRole("button", { name: "Find Your Training Plan" }));
    await screen.findByRole("heading", { name: "Find Your Training Plan" });
    // Give the demo gate every chance to redirect.
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByTestId("where").textContent).toMatch(/^\/training-plans\?sport=/);
    expect(screen.queryByTestId("demo-screen")).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.querySelector("[data-tour-overlay], [data-spotlight-tour]")).toBeNull();
  });

  it("control: the same pending-demo gate is armed in this harness (it still guards other training pages)", async () => {
    app("/training-block");
    await waitFor(() => expect(screen.getByTestId("demo-screen")).toBeTruthy());
    expect(screen.getByTestId("where").textContent).toBe("/start-here?intent=%2Ftraining-block");
  });
});
