import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { join } from "node:path";
import { decodeLandmarkSeriesText, type LandmarkSeries } from "../pose/landmarkSeriesFormat";
import { runSoftballPitchingTiles, SP_STANDARDS, SP_CUT_BY_ELITE_FILTER } from "../metrics/softballPitchingTiles";
import { SOFTBALL_PITCHING_COPY, SP_BASIS_LABEL, SP_PRO_LINE, SP_CARD_INTRO } from "../../reportCard/softballPitchingCopy";

const load = (n: string): LandmarkSeries => decodeLandmarkSeriesText(gunzipSync(readFileSync(join(__dirname, "fixtures", n))).toString("utf8"));
const still = load("still-subject-15d75bc9.ndjson.gz"), A = load("swing-24fps-914cf54c.ndjson.gz"), B = load("swing-24fps-9d2e117e.ndjson.gz");

describe("softball windmill card — every fixture refuses with a windmill reason", () => {
  const cases: [string, LandmarkSeries, "L" | "R" | null][] = [["still", still, "L"], ["still", still, "R"], ["still", still, null], ["914cf54c", A, "L"], ["914cf54c", A, "R"], ["9d2e117e", B, "L"], ["9d2e117e", B, "R"]];
  for (const [n, s, side] of cases) it(`${n} side=${side}`, () => {
    const r = runSoftballPitchingTiles(s, { throwing_side: side, pitch_type: "fastball_windmill", age_band: "youth" });
    console.log(n, side, r.anchors.refusal_detail);
    expect(r.validated).toBe(false);
    expect(r.anchors.ok).toBe(false);
    expect(String(r.anchors.refusal_detail)).toMatch(side ? /^no_windmill_delivery/ : /^throwing_side_unknown$/);
    for (const t of Object.values(r.tiles)) { expect(t.verdict).toBeNull(); expect(Object.keys(t.values)).toHaveLength(0); expect(t.missing_reason).toBeTruthy(); }
  });
});

it("still clip: every anchor missing", () => {
  for (const side of ["L", "R"] as const) {
    const r = runSoftballPitchingTiles(still, { throwing_side: side });
    for (const a of Object.values(r.anchors.anchors)) expect(a.k).toBeNull();
  }
});

it("deterministic ×3 and constant detector refuses", () => {
  expect(new Set([0, 1, 2].map(() => JSON.stringify(runSoftballPitchingTiles(A, { throwing_side: "R" })))).size).toBe(1);
  const f = still.frames[10];
  const c: LandmarkSeries = { header: still.header, frames: still.frames.map((x) => ({ ...f, frame_index: x.frame_index, timestamp_seconds: x.timestamp_seconds })) };
  for (const t of Object.values(runSoftballPitchingTiles(c, { throwing_side: "R" }).tiles)) expect(t.verdict).toBeNull();
});

it("doctrine rules: flexion never graded, valgus weight 0, 0–45° band untouched, cuts recorded", () => {
  expect(SP_STANDARDS.trunk_flexion.never_graded).toBe(true);
  expect(SP_STANDARDS.windup_knee_valgus_flag.grading_weight).toBe(0);
  expect(SP_STANDARDS.sfc_knee_valgus_flag.grading_weight).toBe(0);
  expect(SP_STANDARDS.sfc_foot_angle.band_deg_arm_side).toEqual([0, 45]);
  expect(SP_CUT_BY_ELITE_FILTER).toContain("sfc_hip_shoulder_rotation");
});

it("athlete copy: no numbers with ° or %, no baseball terms, basis labels shown, flags send to a professional", () => {
  const all = [SP_CARD_INTRO, ...Object.values(SP_BASIS_LABEL), ...Object.values(SOFTBALL_PITCHING_COPY).flatMap((c) => [c.name, c.standard, c.coach, c.missing])].join("\n");
  expect(all).not.toMatch(/\d\s*(°|%|percent|degrees?)/i);
  expect(all).not.toMatch(/\d/);
  expect(all).not.toMatch(/\b(mound|leg lift|arm slot|layback|baseball)\b/i);
  expect(SOFTBALL_PITCHING_COPY.windup_knee_valgus_flag.coach.endsWith(SP_PRO_LINE)).toBe(true);
  expect(SOFTBALL_PITCHING_COPY.sfc_knee_valgus_flag.coach.endsWith(SP_PRO_LINE)).toBe(true);
  expect(SOFTBALL_PITCHING_COPY.trunk_flexion.standard).toMatch(/never graded/i);
  expect(SP_BASIS_LABEL.PROPOSED).toMatch(/Proposed/);
});
