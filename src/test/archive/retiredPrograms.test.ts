import { describe, it, expect } from "vitest";
import { isRetiredRoute, isRetiredKey, mentionsRetired, scrubRetiredInline, scrubRetiredFromList } from "../../../supabase/functions/_shared/archive/retiredPrograms";
describe("programs_retired helpers", () => {
  it("finds every program route and key", () => {
    for (const r of ["/speed-lab", "/explosive-conditioning", "/the-unicorn", "/production-lab", "/production-studio"]) expect(isRetiredRoute(r)).toBe(true);
    for (const k of ["workout-unicorn", "workout-hitting", "workout-pitching", "speed-lab", "explosive-conditioning"]) expect(isRetiredKey(k)).toBe(true);
    expect(isRetiredRoute("/dashboard")).toBe(false);
    expect(isRetiredKey("texvision")).toBe(false);
  });
  it("takes names out of text", () => {
    expect(scrubRetiredInline("(throwing analysis + Speed Lab)")).toBe("(throwing analysis)");
    expect(mentionsRetired(scrubRetiredFromList("Hitting + Throwing Analysis, Iron Bambino, Speed Lab, Tex Vision"))).toBe(false);
    expect(mentionsRetired("Tex Vision")).toBe(false);
  });
});
