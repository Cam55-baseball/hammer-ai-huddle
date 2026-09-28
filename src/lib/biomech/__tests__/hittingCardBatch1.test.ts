import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs"; import { gunzipSync } from "node:zlib"; import { join } from "node:path";
import { decodeLandmarkSeriesText } from "../pose/landmarkSeriesFormat";
import { runHittingPoseTiles } from "../metrics/hittingPoseTiles";
import { detectSwingPeak, detectSwingStart } from "../anchors/poseEvents";
import { deriveDirectionSign } from "../side/strideSide";
import { bhContract, BH_UPLOAD_OUT_OF_SCOPE } from "../../reportCard/contracts/bh.contract";

const load = (n: string) => decodeLandmarkSeriesText(gunzipSync(readFileSync(join(__dirname, "fixtures", n))).toString("utf8"));
const still = load("still-subject-15d75bc9.ndjson.gz"), A = load("swing-24fps-914cf54c.ndjson.gz"), B = load("swing-24fps-9d2e117e.ndjson.gz");
const peak = (s: typeof A, side: "L" | "R") => { const d = deriveDirectionSign(s, side); return detectSwingPeak(s, d, detectSwingStart(s, d)); };

describe("upload scope (owner ruling 2026-09-27)", () => {
  it("bat / contact metrics are out of the upload contract", () => {
    const keys = bhContract.metrics.flatMap((m) => [m.key, m.tileKey]);
    for (const k of [...BH_UPLOAD_OUT_OF_SCOPE.tile_keys, ...BH_UPLOAD_OUT_OF_SCOPE.metric_keys]) expect(keys).not.toContain(k);
  });
});

describe("D-SWING-PEAK (not contact)", () => {
  it("still clip refuses; 914cf54c Left = frame 188 ±1 frame; never labelled contact", () => {
    expect(peak(still, "L").frame_index).toBeNull();
    const p = peak(A, "L");
    expect(p.frame_index).toBe(188);
    expect(p.anchor).toBe("swing_peak_frame_not_contact");
    expect(p.diagnostics.is_contact).toBe(false);
    expect(p.anchor_uncertainty_ms).toBeCloseTo(41.6667, 3);
  });
  it("wrong side / no rotation refuse with a real reason", () => {
    expect(peak(A, "R").diagnostics.reason).toBe("swing_start_missing");
    expect(peak(B, "R").diagnostics.reason).toBe("no_rotation_above_still_floor");
  });
});

describe("head discipline (tile 4, body only)", () => {
  it("owner doctrine: still refuses; 914cf54c Left head passed com_at_p2 by 13.1342% → P1 fault; Right refuses; 9d2e117e refuses", () => {
    for (const side of ["L", "R"] as const) expect(runHittingPoseTiles(still, { side }).head_discipline.value).toBeNull();
    const h = runHittingPoseTiles(A, { side: "L" }).head_discipline;
    expect(h.value).toBe(13.1342);
    expect(h.verdict).toBe("fail");
    expect(h.lineage.root_pattern_key).toBe("back_leg_did_not_hold_load");
    expect(h.lineage.attributed_to).toBe("P1");
    expect((h.lineage.late_head_pull_pct_ungraded as { value: number }).value).toBe(-6.4467);
    expect((h.lineage.head_turn_jerk_pct_s2 as { value: number }).value).toBe(175.9032);
    expect(runHittingPoseTiles(A, { side: "R" }).head_discipline.value).toBeNull();
    for (const side of ["L", "R"] as const) expect(runHittingPoseTiles(B, { side }).head_discipline.value).toBeNull();
  });
});

describe("hand_load, p2/p3", () => {
  it("still refuses everything", () => {
    for (const side of ["L", "R"] as const) { const r = runHittingPoseTiles(still, { side }); for (const t of [r.hand_load, r.p2_timing, r.p3_timing]) expect(t.value).toBeNull(); }
  });
  it("914cf54c Left reference; Right refuses (side is used)", () => {
    // Former −39.8% was the wrists converging (50.5% of stature apart in the stance lock), not a load.
    // 2026-09-28: stance lock (54–67) landed before the grip; baseline now the first gripped run (77–82).
    const h = runHittingPoseTiles(A, { side: "L" }).hand_load;
    expect(h.value).toBe(-19.0842);
    expect(h.verdict).toBe("pass");
    expect(h.lineage.grip_baseline_frames).toEqual([77, 82]);
    expect(String(h.lineage.verification)).toContain("unverified");
    expect(runHittingPoseTiles(A, { side: "R" }).hand_load.value).toBeNull();
  });
  it("pitcher timing refuses honestly", () => {
    const r = runHittingPoseTiles(A, { side: "L" });
    expect(r.p3_timing.missingness?.missing_reason).toBe("pitcher_release_frame_missing");
    expect(String(r.p2_timing.lineage.reason)).toContain("pitcher_not_in_frame");
  });
  it("deterministic ×3", () => {
    const s = [0, 1, 2].map(() => JSON.stringify([runHittingPoseTiles(A, { side: "L" }), peak(A, "L")]));
    expect(new Set(s).size).toBe(1);
  });
});
