/**
 * Verifies the analysis report's prescription section actually renders elite
 * drills for real `violations_detected` keys emitted by analyze-video.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock("@/hooks/useHIESnapshot", () => ({
  useHIESnapshot: () => ({ snapshot: null, loading: false }),
}));

import { AnalysisPrescriptionSection } from "../AnalysisPrescriptionSection";

function renderSection(module: string, sport: string, violations: Record<string, boolean>) {
  return render(
    <QueryClientProvider client={new QueryClient()}><MemoryRouter>
      <AnalysisPrescriptionSection module={module} sport={sport} violations={violations} />
    </MemoryRouter></QueryClientProvider>,
  );
}

describe("AnalysisPrescriptionSection", () => {
  it("shows targeted hitting drills for a real flagged violation", () => {
    renderSection("hitting", "baseball", { early_shoulder_rotation: true });
    expect(screen.getByText(/Step-Behind Separation/i)).toBeTruthy();
  });

  it("shows softball pitching drills (previously fell back to maintenance)", () => {
    renderSection("pitching", "softball", { early_shoulder_rotation: true });
    expect(screen.getByText(/Back-Hip Load Hold/i)).toBeTruthy();
  });

  it("shows throwing drills for hands_pass_elbow_early", () => {
    renderSection("throwing", "baseball", { hands_pass_elbow_early: true });
    expect(screen.getByText(/Wall Arm-Action Drill/i)).toBeTruthy();
  });

  // Owner P0 (Oct 28): only drills that address this clip's findings; no filler.
  it("shows no maintenance filler drills on a clean clip", () => {
    renderSection("hitting", "baseball", {});
    expect(screen.queryByText(/Walk-Away Load/i)).toBeNull();
  });
});
