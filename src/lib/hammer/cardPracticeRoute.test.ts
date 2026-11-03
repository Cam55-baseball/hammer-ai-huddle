import { describe, expect, it } from "vitest";
import { cardPracticeRoute } from "./practiceWindow";

const T = "2026-11-03";
const q = (r: string) => new URL(r, "https://x.test").searchParams;

describe("every Today practice-log button opens the right log for today", () => {
  const cases: [string, string, string, string][] = [
    ["defense / fielding", "/practice?module=defense", "defense", "fielding"],
    ["hitting", "/practice?module=hitting", "hitting", "hitting"],
    ["bat speed", "/practice?module=hitting", "bat_speed", "hitting"],
    ["pitching", "/practice?module=pitching", "pitching", "pitching"],
    ["throwing", "/practice?module=throwing", "throwing", "throwing"],
    ["baserunning", "/practice?module=baserunning", "baserunning", "baserunning"],
    ["bunting", "/practice?module=hitting", "bunting", "bunting"],
  ];
  for (const [name, route, modality, module] of cases) {
    it(`${name} button`, () => {
      const p = q(cardPracticeRoute(route, { modality, activity: `${name} work` }, T));
      expect(p.get("module")).toBe(module);
      expect(p.get("type")).toBe("solo_work");
      expect(p.get("drill_type")).toBe(`${name} work`);
      expect(p.get("date")).toBe(T);
    });
  }
  it("non-practice links are untouched", () => {
    expect(cardPracticeRoute("/games", { modality: "defense" }, T)).toBe("/games");
  });
});
