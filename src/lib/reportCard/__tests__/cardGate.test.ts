/**
 * Card gate: each analysis type renders only its own card's tiles.
 * Fails if any card would render a tile that belongs to another card, or if
 * the analysis screen mounts athlete-wide (cross-skill) findings on a clip.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { getReportCardSpec } from "@/lib/reportCard";
import { categorySpecFor } from "@/lib/reportCard/categories/specs";

const CARDS = [
  ["baseball", "hitting"], ["softball", "hitting"],
  ["baseball", "pitching"], ["softball", "pitching"],
  ["baseball", "throwing"], ["softball", "throwing"],
] as const;

const family = (m: string, s: string) => (m === "pitching" ? `${s}_pitching` : m);

function keysFor(s: string, m: string) {
  const rc = getReportCardSpec(s, m)?.tiles.map((t) => t.key) ?? [];
  const cat = categorySpecFor(s, m);
  const ck = cat ? cat.categories.flatMap((c) => c.tiles.map((t) => t.key)).concat(cat.sections.flatMap((x) => x.tiles.map((t) => t.key))) : [];
  return { rc: new Set(rc), cat: new Set(ck) };
}

describe("card gate — no cross-contamination", () => {
  it("each module resolves to its own card", () => {
    expect(getReportCardSpec("baseball", "hitting")?.disciplineLabel).toMatch(/Hitting/);
    expect(getReportCardSpec("softball", "pitching")?.id ?? "").not.toBe(getReportCardSpec("baseball", "pitching")?.id);
    expect(getReportCardSpec("baseball", "throwing")?.disciplineLabel).toMatch(/Throwing/);
    expect(getReportCardSpec("baseball", "fielding")).toBeNull();
    expect(getReportCardSpec("baseball", undefined)).toBeNull();
    expect(categorySpecFor("baseball", undefined)).toBeNull();
  });

  it("no card renders a tile key belonging to a different card family", () => {
    for (const [s, m] of CARDS) {
      for (const [s2, m2] of CARDS) {
        if (family(m, s) === family(m2, s2)) continue;
        const a = keysFor(s, m), b = keysFor(s2, m2);
        const rcClash = [...a.rc].filter((k) => b.rc.has(k));
        const catClash = [...a.cat].filter((k) => b.cat.has(k));
        expect({ card: `${s} ${m} vs ${s2} ${m2}`, rcClash, catClash }).toEqual({ card: `${s} ${m} vs ${s2} ${m2}`, rcClash: [], catClash: [] });
      }
    }
  });

  it("analysis screen mounts no athlete-wide cross-skill findings and passes pitching tiles only to pitching", () => {
    const src = readFileSync("src/pages/AnalyzeVideo.tsx", "utf8");
    expect(src).not.toMatch(/<RootPatternCallout/);
    expect(src).not.toMatch(/<CategoryScoreCard/);
    expect(src).toMatch(/pitching_tiles_deterministic: module === 'pitching'/);
    expect(src).toMatch(/useState<AnalysisView>\("analysis"\)/);
  });
});
