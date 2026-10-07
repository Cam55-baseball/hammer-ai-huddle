import { describe, it, expect } from "vitest";
import { profileGaps, missingBodyFields, shouldShowReminder, REMIND_EVERY_MS, BODY_FIELDS } from "@/lib/onboarding/profileGaps";

const fullBody = Object.fromEntries(BODY_FIELDS.map((f) => [f.key, 20]));
const complete = {
  anthropometrics: fullBody,
  category_goals: { categoryOrder: ["speed"], speed: { goal: "faster" } },
  competition_level: "hs_varsity",
  lifting_age_years: 2,
  equipment: ["dumbbells"],
};

describe("profileGaps", () => {
  it("complete profile shows nothing", () => expect(profileGaps(complete)).toEqual([]));
  it("reads weight_lbs as saved weight", () => {
    const { weight_lb, ...rest } = fullBody as Record<string, number>;
    expect(missingBodyFields({ ...rest, weight_lbs: 180 })).toEqual([]);
    expect(missingBodyFields(rest)).toEqual(["weight_lb"]);
  });
  it("lists exactly what's missing", () => {
    const g = profileGaps({ anthropometrics: { height_in: 70, weight_lb: 160 }, equipment: [] });
    expect(g.map((x) => x.section)).toEqual(["body", "goals", "level", "training", "equipment"]);
    expect(g[0].items).not.toContain("Height");
    expect(g[0].items).toContain("Thigh bone");
  });
  it("lifting history counts as training age", () =>
    expect(profileGaps({ ...complete, lifting_age_years: null, lifting_history: { years: 1 } })).toEqual([]));
  it("reminds every 3 days", () => {
    expect(shouldShowReminder(null)).toBe(true);
    expect(shouldShowReminder(1000, 1000 + REMIND_EVERY_MS - 1)).toBe(false);
    expect(shouldShowReminder(1000, 1000 + REMIND_EVERY_MS)).toBe(true);
  });
});
