import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { join } from "node:path";
import { decodeLandmarkSeriesText, type LandmarkSeries } from "../pose/landmarkSeriesFormat";
import { runPitchingCardTiles, pitchingRootPatterns, PITCHING_CARD_FLOORS, PITCHING_CARD_STANDARDS } from "../metrics/pitchingCardTiles";
import { frontAnkleIndex, rearAnkleIndex } from "../side/strideSide";
import { PITCHING_COPY, PITCHING_ROOT_COPY } from "../../reportCard/pitchingCopy";

const load = (n: string): LandmarkSeries => decodeLandmarkSeriesText(gunzipSync(readFileSync(join(__dirname, "fixtures", n))).toString("utf8"));
const still = load("still-subject-15d75bc9.ndjson.gz"), A = load("swing-24fps-914cf54c.ndjson.gz"), B = load("swing-24fps-9d2e117e.ndjson.gz");

describe("pitching card — every fixture refuses, with the delivery gate's own reason", () => {
  const cases: [string, LandmarkSeries, "L" | "R" | null, string][] = [
    ["still", still, "L", "no_pitching_delivery:"], ["still", still, "R", "no_pitching_delivery:"], ["still", still, null, "throwing_side_unknown"],
    ["914cf54c", A, "L", "no_pitching_delivery:throwing_wrist_below_shoulder_at_release"],
    ["914cf54c", A, "R", "no_pitching_delivery:plant_missing:no_observed_frames_after_lift"],
    ["9d2e117e", B, "L", "no_pitching_delivery:peak_leg_lift_missing"],
    ["9d2e117e", B, "R", "no_pitching_delivery:release_too_long_after_plant"],
  ];
  for (const [n, s, side, detail] of cases) it(`${n} side=${side}`, () => {
    const r = runPitchingCardTiles(s, { throwing_side: side, athlete_height_in: 70 });
    expect(r.validated).toBe(false);
    expect(r.delivery.ok).toBe(false);
    expect(String(r.delivery.refusal_detail)).toContain(detail);
    for (const t of Object.values(r.tiles)) { expect(t.value).toBeNull(); expect(t.verdict).toBeNull(); expect(t.missingness).not.toBeNull(); expect(String(t.lineage.gate)).toContain(detail); }
  });
});

it("front foot comes from the throwing side, never fixed", () => {
  expect(frontAnkleIndex("R")).toBe(27); expect(rearAnkleIndex("R")).toBe(28);
  expect(frontAnkleIndex("L")).toBe(28); expect(rearAnkleIndex("L")).toBe(27);
});

it("deterministic ×3", () => {
  const runs = [0, 1, 2].map(() => JSON.stringify(runPitchingCardTiles(A, { throwing_side: "L", athlete_height_in: 70 })));
  expect(new Set(runs).size).toBe(1);
});

it("constant detector (every frame identical) refuses everything", () => {
  const f = still.frames[10];
  const c: LandmarkSeries = { header: still.header, frames: still.frames.map((x) => ({ ...f, frame_index: x.frame_index, timestamp_seconds: x.timestamp_seconds })) };
  const r = runPitchingCardTiles(c, { throwing_side: "R", athlete_height_in: 70 });
  for (const t of Object.values(r.tiles)) expect(t.value).toBeNull();
});

it("floors below the owner's standard, except release extension (flagged)", () => {
  expect(PITCHING_CARD_FLOORS.shoulder_tilt_deg).toBeLessThan(PITCHING_CARD_STANDARDS.shoulder_tilt_deg.pass_max);
  expect(PITCHING_CARD_FLOORS.eye_tilt_deg).toBeLessThan(PITCHING_CARD_STANDARDS.stack_and_track.pass_max);
  expect(PITCHING_CARD_FLOORS.balance_deg).toBeLessThan(PITCHING_CARD_STANDARDS.balance_at_landing.pass_max_from_vertical_deg);
  const [lo, hi] = PITCHING_CARD_STANDARDS.release_extension.band_in;
  expect(PITCHING_CARD_FLOORS.release_extension_in).toBeGreaterThan((hi - lo) / 2);
});

it("posture root pattern is one finding", () => {
  const r = runPitchingCardTiles(A, { throwing_side: "L", athlete_height_in: 70 });
  const fail = (k: string) => ({ ...(r.tiles as any)[k], verdict: "fail" });
  const rp = pitchingRootPatterns({ ...r.tiles, shoulder_tilt_deg: fail("shoulder_tilt_deg"), stack_and_track: fail("stack_and_track"), balance_at_landing: fail("balance_at_landing") } as any, "fail");
  expect(rp).toHaveLength(1);
  expect(rp[0].evidence).toHaveLength(4);
});

it("coach copy carries no numbers", () => {
  const all = [...Object.values(PITCHING_COPY).flatMap((c) => [c.pass, c.fail]), ...Object.values(PITCHING_ROOT_COPY).flatMap((c) => [c.label, c.plain])];
  for (const t of all) { expect(t).not.toMatch(/\d/); expect(t.toLowerCase()).not.toMatch(/swing|batter|hitter/); }
});
