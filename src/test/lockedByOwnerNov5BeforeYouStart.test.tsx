// Locked by owner Nov 5 (round 2, Group 4).
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Bys } from "@/components/hammer/BeforeYouStartSection";
import { bysWhy, type BysWhyFacts } from "@/lib/hammer/beforeYouStartWhy";
import { BYS_ITEMS } from "@/lib/hammer/beforeYouStartImportance";
import { startMissing } from "../../supabase/functions/_shared/startReadiness";

const facts: BysWhyFacts = { restDay: false, hittingToday: true, timingRoles: ["hitter", "baserunner"], analysisModules: ["hitting"], recurringIssueCount: 2, baserunningStudyToday: true, hasFuelGoal: true };
const Nothing = () => null;

describe("6c: every Before-you-start item says why", () => {
  it("each item has a reason, or its own card explains it", () => {
    const selfExplaining = new Set(["starting_point", "defensive_prep_video", "day_notices"]);
    for (const { id } of BYS_ITEMS) {
      if (selfExplaining.has(id)) expect(bysWhy(id, facts)).toBeNull();
      else expect(bysWhy(id, facts), id).toBeTruthy();
    }
  });
  it("reasons are personal to today's facts", () => {
    expect(bysWhy("timing_study", facts)).toBe("you hit and run bases today.");
    expect(bysWhy("recurring_videos", facts)).toContain("2 issues");
    expect(bysWhy("recurring_videos", { ...facts, recurringIssueCount: 0 })).toBeNull();
    expect(bysWhy("non_physical", { ...facts, restDay: true })).toContain("rest-day");
  });
  it("shows the line with the item, hides both when the item has nothing", () => {
    const { container } = render(<><Bys id="coach_advice" why="test reason"><p>advice</p></Bys><Bys id="mind_item" why="hidden reason"><Nothing /></Bys></>);
    expect(screen.getByTestId("bys-why-coach_advice").textContent).toBe("Why you see this: test reason");
    const empty = container.querySelector('[data-bys-item="mind_item"] .bys-body')!;
    expect(empty.children.length).toBe(0); // CSS hides the item (and its why line) when the body is empty
  });
});

describe("6a: starting question is required before the first plan", () => {
  const base = { date_of_birth: "2010-01-01", sport_primary: "baseball", position_primary: "SS", competition_level: "high_school", category_goals: { hitting: ["power"] }, season_status: "off_season", bats_hand: "R", throws_hand: "R", current_pain_answered: true, current_pain: false } as const;
  it("brand-new player: missing until answered, then clear", () => {
    expect(startMissing({ ...base, starting_point_answered: false }).map((m) => m.key)).toEqual(["starting_point"]);
    expect(startMissing({ ...base, starting_point_answered: true })).toEqual([]);
  });
});
