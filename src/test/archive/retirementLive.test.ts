import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { entitlementsFor } from "@/constants/entitlements";

const PAGES = ["ProductionLab", "ProductionStudio", "SpeedLab", "TheUnicorn", "ExplosiveConditioning"];

describe("five programs retired", () => {
  it("pages are archived, not routed", () => {
    const app = readFileSync("src/App.tsx", "utf8");
    for (const p of PAGES) {
      expect(existsSync(`src/pages/${p}.tsx`)).toBe(false);
      expect(existsSync(`src/archive/retired-programs/pages/${p}.tsx.archived`)).toBe(true);
      expect(app).not.toContain(`./pages/${p}"`);
    }
    for (const r of ["/speed-lab", "/explosive-conditioning", "/the-unicorn", "/production-lab", "/production-studio"])
      expect(app).toContain(`path="${r}" element={<RetiredProgramRoute />}`);
  });
  it("redirect is quiet (dashboard, no banner text)", () => {
    const src = readFileSync("src/components/archive/RetiredProgramRoute.tsx", "utf8");
    expect(src).toContain('<Navigate to="/dashboard" replace />');
  });
  it("every plan keeps the same entitlements", () => {
    const s = (m: string[]) => [...entitlementsFor(m)].sort();
    for (const sport of ["baseball", "softball"]) {
      expect(s([`${sport}_pitcher`])).toEqual(["complete_pitcher", "pitching_analysis", "vault"]);
      expect(s([`${sport}_5tool`])).toEqual(["complete_hitter", "complete_player", "hitting_analysis", "throwing_analysis", "vault"]);
      expect(s([`${sport}_golden2way`])).toEqual(["complete_hitter", "complete_pitcher", "complete_player", "hitting_analysis", "pitching_analysis", "the_unicorn", "throwing_analysis", "vault"]);
    }
  });
});
