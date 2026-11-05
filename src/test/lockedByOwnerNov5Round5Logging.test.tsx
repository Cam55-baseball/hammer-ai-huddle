import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
vi.mock("@/components/hammer/logging/ExtraLogs", () => ({ PracticeLog: () => <div data-testid="practice-log-form" /> }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "u" } }), useOptionalAuth: () => ({ user: { id: "u" } }) }));
import { PocketCard } from "@/components/hammer/cards/PocketCard";
import { LegacyDrillInlineLog } from "@/components/hammer/logging/LegacyDrillInlineLog";
import { throwPracticeRoute, throwsByDistance } from "@/lib/hammer/practiceWindow";
import { getTodayDate } from "@/utils/dateUtils";

function Where() { const l = useLocation(); return <div data-testid="where">{l.pathname + l.search}</div>; }
const shell = (ui: React.ReactNode) => render(<QueryClientProvider client={new QueryClient()}><MemoryRouter initialEntries={["/today"]}>
  <Routes><Route path="/today" element={ui} /><Route path="/practice" element={<Where />} /></Routes>
</MemoryRouter></QueryClientProvider>);

describe("locked by owner Nov 5 round 5: practice-log button beside 'Log this work' opens the existing practice page", () => {
  it("sits in the title row (right side) and navigates to the card's existing prefilled practice log", () => {
    const route = "/practice?module=fielding&type=solo_work&drill_type=Defense&date=2026-11-05";
    shell(<PocketCard id="defense" category="Defense" tone="bg-primary" planDate="2026-11-05" prescribed practiceRoute={route}>{() => <div />}</PocketCard>);
    fireEvent.click(screen.getAllByRole("button")[0]);
    const row = document.querySelector("[data-log-title-row]")!;
    expect(row.textContent).toContain("Log this work");
    const btn = row.querySelector("[data-testid=card-practice-log-button]") as HTMLButtonElement;
    expect(btn).toBeTruthy();
    fireEvent.click(btn);
    expect(screen.getByTestId("where").textContent).toBe(route);
  });
});

describe("locked by owner Nov 5 round 5: throwing items open the EXISTING throwing practice log", () => {
  it("reads throws by distance from the item's dose", () => {
    expect(throwsByDistance("45ft x 10 throws, 60ft x 12 throws")).toEqual([{ feet: 45, throws: 10 }, { feet: 60, throws: 12 }]);
    expect(throwsByDistance("2 x 8 throws")).toEqual([{ feet: null, throws: 16 }]);
    const url = new URL(throwPracticeRoute("Catch play", "60ft x 10 throws · easy", "2026-11-05"), "https://x.test");
    expect(url.pathname).toBe("/practice");
    expect(Object.fromEntries(url.searchParams)).toEqual({ module: "throwing", type: "solo_work", drill_type: "Catch play", date: "2026-11-05", constraints: "Throws: 60 ft × 10 (10 total)" });
  });

  it("the item button goes to /practice prefilled — no inline throwing logger opens", () => {
    shell(<LegacyDrillInlineLog modality="throwing" name="Catch play — build to 60 ft" dosage="60ft x 10 throws" storageKey="r5-throw" completed={false} onSave={() => {}} />);
    expect(screen.getByLabelText(/throws/i)).toBeTruthy(); // the item keeps its count
    fireEvent.click(screen.getByTestId("throw-item-log-button"));
    const where = new URL(screen.getByTestId("where").textContent!, "https://x.test");
    expect(where.searchParams.get("module")).toBe("throwing");
    expect(where.searchParams.get("date")).toBe(getTodayDate());
    expect(where.searchParams.get("drill_type")).toBe("Catch play — build to 60 ft");
    expect(where.searchParams.get("constraints")).toBe("Throws: 60 ft × 10 (10 total)");
  });

  it("no other throwing logging UI exists: the custom item logger is gone", () => {
    const src = readFileSync("src/components/hammer/logging/LegacyDrillInlineLog.tsx", "utf8");
    expect(src).not.toMatch(/ArmThrowsPanel|throwLogOpen/);
    const hits = execSync(`grep -rl "Log throwing practice" src --include=*.tsx --exclude=*.test.tsx || true`).toString().trim().split("\n").filter(Boolean);
    expect(hits).toEqual(["src/components/hammer/logging/LegacyDrillInlineLog.tsx"]);
  });
});
