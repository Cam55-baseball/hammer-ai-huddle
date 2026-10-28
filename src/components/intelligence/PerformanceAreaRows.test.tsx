import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

let result: { data: unknown; error: unknown } = { data: [], error: null };
let staff = false;
vi.mock("@/hooks/useOwnerAccess", () => ({ useOwnerAccess: () => ({ isOwner: staff }) }));
vi.mock("@/hooks/useAdminAccess", () => ({ useAdminAccess: () => ({ isAdmin: false }) }));
vi.mock("@/hooks/useReportCardTrend", () => ({ useReportCardTrend: () => ({ isLoading: false, data: [{ createdAt: "2026-10-01T12:00:00Z", grade: { score: 50 } }] }) }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));
vi.mock("@/integrations/supabase/client", () => {
  const chain: any = { select: () => chain, eq: () => chain, order: () => chain, limit: () => Promise.resolve(result) };
  return { supabase: { from: () => chain } };
});
import { PerformanceAreaRows } from "./PerformanceAreaRows";

const view = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter><PerformanceAreaRows /></MemoryRouter>
  </QueryClientProvider>,
);

describe("PerformanceAreaRows", () => {
  it("shows a failure notice instead of an empty list when the read fails", async () => {
    result = { data: null, error: { message: "503" } };
    view();
    expect(await screen.findByText("We couldn't load your areas. Please try again later.")).toBeTruthy();
  });
  it("labels the analysis count and date and shows no video grade while the report card is off", async () => {
    result = { data: [{ module: "hitting", created_at: "2026-10-01T12:00:00Z" }], error: null };
    view();
    expect(await screen.findByText(/Analyses: 1 · early read/)).toBeTruthy();
    expect(screen.getByText(/Last analysis:/)).toBeTruthy();
    expect(screen.queryByText("Grade: Grade coming with camera measurement")).toBeNull();
    expect(screen.getByText("See analysis")).toBeTruthy();
    expect(screen.queryByText(/Grade: 50/)).toBeNull();
  });
  it("keeps the archived card and internal label hidden for the owner", async () => {
    staff = true;
    result = { data: [{ module: "hitting", created_at: "2026-10-01T12:00:00Z" }], error: null };
    view();
    expect(await screen.findByText(/Analyses: 1 · early read/)).toBeTruthy();
    expect(screen.queryByText("Internal — not released")).toBeNull();
    expect(screen.queryByText("Grade: Grade coming with camera measurement")).toBeNull();
    staff = false;
  });
});
