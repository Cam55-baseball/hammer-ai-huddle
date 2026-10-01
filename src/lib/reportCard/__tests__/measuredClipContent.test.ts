import { describe, expect, it } from "vitest";
import { HITTING_CATEGORIES } from "../categories/specs";
import { measuredClipScore, measuredClipSpec } from "../measuredClipSpec";
import { HITTING_CLIP_COPY, PHASE_EXPLAINER } from "../measuredClipCopy";
import { withoutMeasurementNotation } from "../athleteLanguage";

describe("measured report-card content", () => {
  it("numbers every hitting phase in labels, drafted copy and explainer", () => {
    const card = measuredClipSpec("baseball", "hitting");
    expect(card?.tiles.map((t) => t.key).every((key) => key in HITTING_CLIP_COPY)).toBe(true);
    const surface = [
      ...PHASE_EXPLAINER,
      ...card?.tiles.flatMap((t) => [t.name, t.phase ?? "", t.standard, t.explainer.whatWhy, t.explainer.howToImprove, t.explainer.encouragement]) ?? [],
    ].join(" ");
    expect(surface).not.toMatch(/\bP[1-4]\b|\bP[1-4]\s*[:—-]/i);
    for (const c of HITTING_CATEGORIES.categories.filter((g) => /^p[1-4]$/.test(g.key))) expect(c.title).toMatch(/^Phase [1-4] — /);
    expect(withoutMeasurementNotation("P1 then P4")).toBe("Phase 1 then Phase 4");
  });

  it("only a complete card has a total; a missing clip never becomes zero", () => {
    const analysis = { deterministic_clip_tiles: { card: "hitting", readings: {} } };
    const score = measuredClipScore(analysis, "baseball", "hitting");
    expect(score?.total).toBeNull();
    expect(score?.categories.filter((c) => !c.additive).every((c) => c.score === null)).toBe(true);
    expect(measuredClipSpec("baseball", "hitting")?.tiles.filter((t) => t.phase === "Phase 4 — Hitter's Move").every((t) => t.nonNegotiable)).toBe(true);
    expect(measuredClipSpec("baseball", "pitching")?.tiles.every((t) => !t.explainer.whatWhy && !t.explainer.howToImprove)).toBe(true);
  });

  it("keeps prohibited units out of athlete copy and never manufactures confidence", () => {
    const card = measuredClipSpec("baseball", "hitting");
    const analysis = { deterministic_clip_tiles: { card: "hitting", readings: { pose: { hand_load: { value: 0.42, unit: "percent_stature", confidence: { status: "uncalibrated", value: null } } } } } };
    const state = card?.tiles.find((t) => t.key === "p2.hand_load_depth")?.compute(analysis as never);
    expect(state?.status).toBe("record");
    expect(state?.value).toBeUndefined();
    expect(state?.confidence).toBeUndefined();
  });
});