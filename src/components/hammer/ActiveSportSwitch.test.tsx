import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(), persist: vi.fn(), rebuild: vi.fn(), invoke: vi.fn(), handoff: vi.fn(),
}));
vi.mock("react-router-dom", () => ({ useNavigate: () => mocks.navigate }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("@/hooks/usePurchaseAvailability", () => ({ usePurchaseAvailability: () => ({ canShowPurchaseUI: true }) }));
vi.mock("@/lib/purchase/goToStripe", () => ({ goToStripe: mocks.handoff }));
vi.mock("@/contexts/SportThemeContext", () => ({ dispatchSportChange: vi.fn() }));
vi.mock("@/lib/hammer/context/acquisition", () => ({ persistContextAnswer: mocks.persist }));
vi.mock("@/lib/hammer/rebuildAfterChange", () => ({ rebuildAfterChange: mocks.rebuild }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  functions: { invoke: mocks.invoke },
  from: (table: string) => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ error: null, data:
    table === "athlete_context" ? { sport_primary: "baseball", sport_secondary: ["softball"] } :
    { status: "active", subscribed_modules: ["baseball_hitting", "baseball_pitching", "baseball_throwing"] },
  }) }) }) }),
} }));
import { ActiveSportSwitch } from "./ActiveSportSwitch";

async function refuseSoftball() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><ActiveSportSwitch userId="test-both" /></QueryClientProvider>);
  fireEvent.click(await screen.findByRole("button", { name: "Softball" }));
  await screen.findByRole("button", { name: "Add the softball plan" });
}

describe("unpurchased sport handoff", () => {
  beforeEach(() => vi.clearAllMocks());
  it("keeps the refusal without saving a sport or rebuilding", async () => {
    await refuseSoftball();
    expect(mocks.persist).not.toHaveBeenCalled();
    expect(mocks.rebuild).not.toHaveBeenCalled();
  });
  it("opens normal softball checkout for the same Golden 2Way program", async () => {
    await refuseSoftball();
    fireEvent.click(screen.getByRole("button", { name: "Add the softball plan" }));
    expect(mocks.navigate).toHaveBeenCalledWith("/checkout", { state: { tier: "golden2way", sport: "softball" } });
  });
  it("opens the existing Stripe Manage my plan portal", async () => {
    mocks.invoke.mockResolvedValueOnce({ data: { url: "https://billing.stripe.com/p/session/test" }, error: null });
    await refuseSoftball();
    fireEvent.click(screen.getByRole("button", { name: "Switch my plan to softball" }));
    await waitFor(() => expect(mocks.handoff).toHaveBeenCalledWith("https://billing.stripe.com/p/session/test", "portal"));
    expect(mocks.invoke).toHaveBeenCalledWith("customer-portal");
  });
});