/**
 * Card gate: each analysis type renders only its own card's tiles.
 * Fails if any card would render a tile that belongs to another card, or if
 * the analysis screen mounts athlete-wide (cross-skill) findings on a clip.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { getReportCardSpec } from "@/lib/reportCard";
import { categorySpecFor } from "@/lib/reportCard/categories/specs";
import { measuredClipSpec } from "@/lib/reportCard/measuredClipSpec";

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
    expect(getReportCardSpec("softball", "pitching")).not.toBe(getReportCardSpec("baseball", "pitching"));
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
        // Report-card tiles read their own stored namespace; a shared key name is not a leak
        // (proved behaviourally below). Category specs share one raw input, so keys must be unique.
        const rcClash: string[] = [];
        const catClash = [...a.cat].filter((k) => b.cat.has(k));
        expect({ card: `${s} ${m} vs ${s2} ${m2}`, rcClash, catClash }).toEqual({ card: `${s} ${m} vs ${s2} ${m2}`, rcClash: [], catClash: [] });
      }
    }
  });

  it("a card fed only another card's stored readings shows nothing measured", () => {
    const filled = (status: string) => ({ value: 1, verdict: "pass", flag: "clear", missing_reason: null, status });
    const store = new Proxy({}, { get: (_t, k) => (k === "injury" ? store : filled(String(k))) });
    const stores: Record<string, Record<string, unknown>> = {
      hitting: { hitting_tiles_deterministic: store, hitting_card_tiles: store, hitting_pose_tiles_deterministic: store },
      baseball_pitching: { pitching_tiles_deterministic: store, pitching_card_tiles_deterministic: store, tempo_sec_deterministic: { value: 1.2, missing_reason: null } },
      softball_pitching: { softball_pitching_tiles_deterministic: store },
      throwing: { throwing_tiles_deterministic: store },
    };
    for (const [s, m] of CARDS) {
      const own = family(m, s);
      const foreign = Object.assign({}, ...Object.entries(stores).filter(([k]) => k !== own).map(([, v]) => v));
      const spec = getReportCardSpec(s, m)!;
      const leaked = spec.tiles.filter((t) => t.compute(foreign as never).status !== "missing").map((t) => t.key);
      expect({ card: `${s} ${m}`, leaked }).toEqual({ card: `${s} ${m}`, leaked: [] });
    }
  });

  it("analysis screen mounts no athlete-wide cross-skill findings and passes pitching tiles only to pitching", () => {
    const src = readFileSync("src/pages/AnalyzeVideo.tsx", "utf8");
    expect(src).not.toMatch(/<RootPatternCallout/);
    expect(src).not.toMatch(/<CategoryScoreCard/);
    expect(src).toMatch(/module === "pitching"\s*\? \{ tiles: runPitchingTiles/);
    expect(src).toMatch(/card: module === "pitching" \?/);
    expect(src).toMatch(/analysisView === "report_card" \?/);
    expect(src).toMatch(/useState<AnalysisView>\("analysis"\)/);
  });

  it("keeps coaching and measured tiles on separate tabs without athlete-facing diagnostics", () => {
    const src = readFileSync("src/pages/AnalyzeVideo.tsx", "utf8");
    const report = src.match(/analysisView === "report_card" \? \(\s*([\s\S]*?)\s*\) : \(/)?.[1];
    const coaching = src.match(/analysisView === "report_card" \? \([\s\S]*?\) : \(\s*<>\s*([\s\S]*?)\s*<\/>(?:\s*\))\s*}/)?.[1];
    expect(report).toMatch(/<HammerReportCard/);
    expect(report).toMatch(/measuredOnly/);
    expect(report).not.toMatch(/AnalysisResultsPanel|AnalysisVideoRecommendations|BackLegFinding/);
    expect(coaching).toMatch(/AnalysisResultsPanel/);
    expect(coaching).toMatch(/AnalysisVideoRecommendations/);
    expect(coaching).not.toMatch(/HammerReportCard|ReportCardTile|CameraViewCard|TrackDiagnosisCard|SCORED_GRADING_NOTICE/);
    expect(src).not.toMatch(/<CameraViewCard|<TrackDiagnosisCard|SCORED_GRADING_NOTICE/);
    const panel = readFileSync("src/components/analyze/AnalysisResultsPanel.tsx", "utf8");
    expect(panel).not.toMatch(/RadialDial|SCORED_GRADING_NOTICE|CameraViewCard|TrackDiagnosisCard/);
  });

  it("the measured report card never consumes another discipline's readings", () => {
    const winning = { verdict: "pass", value: 1, flag: "clear", values: { value: 1 } };
    const filled = new Proxy({}, { get: () => winning });
    const foreignSources: Record<string, unknown> = {
      hitting: { pose: filled, card: filled, coil: filled },
      baseball_pitching: { tiles: filled, card: { tiles: filled } },
      softball_pitching: { tiles: filled },
      throwing: { ...Object.fromEntries(["tempo", "stride_length", "energy_angle", "head_stability", "front_knee_at_landing"].map((k) => [k, winning])), injury: filled },
    };
    for (const [sport, module] of CARDS) {
      const own = family(module, sport);
      const foreign = Object.assign({}, ...Object.entries(foreignSources).filter(([k]) => k !== own).map(([, v]) => v));
      const card = measuredClipSpec(sport, module);
      expect(card).not.toBeNull();
      const rendered = card?.tiles.filter((tile) => tile.compute({ deterministic_clip_tiles: { card: own === "hitting" ? "throwing" : "hitting", readings: foreign } } as never).status !== "missing").map((tile) => tile.key) ?? [];
      expect(rendered, `${sport} ${module} must not render foreign tiles`).toEqual([]);
    }
    const baseball = measuredClipSpec("baseball", "pitching");
    const softball = measuredClipSpec("softball", "pitching");
    expect(baseball?.tiles.filter((tile) => tile.compute({ deterministic_clip_tiles: { card: "pitching_softball_windmill", readings: foreignSources.softball_pitching } } as never).status !== "missing")).toEqual([]);
    expect(softball?.tiles.filter((tile) => tile.compute({ deterministic_clip_tiles: { card: "pitching_baseball", readings: foreignSources.baseball_pitching } } as never).status !== "missing")).toEqual([]);
  });

  it("renders every built tile on all six cards, including formerly staff-only hitting checks", () => {
    for (const [sport, module] of CARDS) {
      const source = categorySpecFor(sport, module);
      const card = measuredClipSpec(sport, module);
      const expected = [
        ...(source?.sections.flatMap((section) => section.tiles.map((tile) => `${section.key}.${tile.key}`)) ?? []),
        ...(source?.categories.flatMap((group) => group.tiles.map((tile) => `${group.key}.${tile.key}`)) ?? []),
      ];
      expect(card?.tiles.map((tile) => tile.key), `${sport} ${module}`).toEqual(expected);
      for (const tile of card?.tiles ?? []) {
        const result = tile.compute({ deterministic_clip_tiles: { card: source?.card, readings: {} } } as never);
        expect(result.status === "missing" || result.status === "record" || result.status === "pass" || result.status === "fail", tile.key).toBe(true);
        if (result.status === "missing") expect(result.score100).toBeUndefined();
      }
    }
    const hitting = measuredClipSpec("baseball", "hitting");
    for (const key of ["p1.hip_load", "p3.back_hip_socket_hold", "p3.head_path_through_stride"]) {
      expect(hitting?.tiles.some((tile) => tile.key === key), key).toBe(true);
    }
  });

  it("shows real measured tiles but never invents a grade from a record-only meter", () => {
    const card = measuredClipSpec("baseball", "hitting");
    const result = card?.tiles.find((tile) => tile.key === "p4.shoulder_plane_steadiness")?.compute({
      deterministic_clip_tiles: { card: "hitting", readings: { card: { shoulder_plane_steadiness: { value: 82 } } } },
    } as never);
    expect(result).toMatchObject({ status: "record", score100: 82 });
    expect(result?.acceptable).toBeUndefined();
    expect(card?.tiles.find((tile) => tile.key === "p4.sequencing")?.compute({
      deterministic_clip_tiles: { card: "hitting", readings: { card: { sequencing: { verdict: "pass" } } } },
    } as never).status).toBe("pass");
  });
});
