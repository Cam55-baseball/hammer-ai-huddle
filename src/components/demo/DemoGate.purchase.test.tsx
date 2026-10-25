import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "player" }, loading: false }) }));
vi.mock("@/hooks/useDemoProgress", () => ({ useDemoProgress: () => ({ progress: { demo_state: "pending" }, loading: false }) }));
vi.mock("@/hooks/usePurchaseAvailability", () => ({ usePurchaseAvailability: () => ({ isStaffAccount: false, roleLoading: false }) }));
vi.mock("@tanstack/react-query", () => ({ useQuery: () => ({ data: false, isLoading: false }) }));
import { DemoGate } from "./DemoGate";
afterEach(cleanup);
describe("pending enrollment demo never intercepts purchase", () => {
  for (const path of ["/pricing", "/checkout", "/select-modules"]) {
    it(`leaves ${path} open`, async () => {
      render(<MemoryRouter initialEntries={[path]}><DemoGate><Routes><Route path={path} element={<h1>Purchase choice</h1>} /><Route path="/start-here" element={<h1>Enrollment demo</h1>} /></Routes></DemoGate></MemoryRouter>);
      await waitFor(() => expect(screen.getByRole("heading").textContent).toBe("Purchase choice"));
    });
  }
  it("retains the non-purchase enrollment walkthrough", async () => {
    render(<MemoryRouter initialEntries={["/training"]}><DemoGate><Routes><Route path="/training" element={<h1>Training</h1>} /><Route path="/start-here" element={<h1>Enrollment demo</h1>} /></Routes></DemoGate></MemoryRouter>);
    await waitFor(() => expect(screen.getByRole("heading").textContent).toBe("Enrollment demo"));
  });
});