// Owner Nov 6 r4 (G15): every coach player tab label stays on one line, never cut off.
import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { Tabs } from "@/components/ui/tabs";
import { CoachAthleteTabStrip, COACH_ATHLETE_TABS, TAB_STRIP_CLASS, TAB_TRIGGER_CLASS } from "./CoachAthleteTabStrip";

describe("coach player tab strip", () => {
  it("renders all 17 labels in full, one line each, in a sideways-scrolling strip", () => {
    render(<Tabs value="checkins"><CoachAthleteTabStrip value="checkins" /></Tabs>);
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(17);
    expect(tabs.map((t) => t.textContent)).toEqual(COACH_ATHLETE_TABS.map((t) => t.label));
    expect(screen.getByRole("tab", { name: "Check-ins & readiness" })).toHaveAttribute("data-state", "active");
    for (const t of tabs) {
      expect(t.className).toContain("whitespace-nowrap");
      expect(t.className).toContain("shrink-0");
      expect(t.className).not.toMatch(/truncate|line-clamp|overflow-hidden|text-ellipsis/);
    }
    const list = screen.getByRole("tablist");
    expect(list.className).toContain("overflow-x-auto");
    expect(list.className).not.toMatch(/grid-cols/);
    expect(TAB_STRIP_CLASS).not.toMatch(/snap-x/); // snapping would hide the active tab's edge
    expect(TAB_TRIGGER_CLASS).not.toMatch(/truncate/);
  });
  it("the coach player page uses this strip, not the old 3-column grid", () => {
    const src = readFileSync("src/pages/CoachAthleteDetail.tsx", "utf8");
    expect(src).toContain("<CoachAthleteTabStrip");
    expect(src).not.toContain("grid h-auto w-full grid-cols-3");
  });
  it("week status chips wrap instead of being cut off", () => {
    const src = readFileSync("src/components/coach/CoachPlayerWeek.tsx", "utf8");
    const chip = src.slice(src.indexOf("export function StatusChip"), src.indexOf("const dateLabel"));
    expect(chip).not.toContain("truncate");
  });
});
