import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs"; import { gunzipSync } from "node:zlib"; import { join } from "node:path";
import { decodeLandmarkSeriesText } from "@/lib/biomech/pose/landmarkSeriesFormat";
import { runHittingPoseTiles } from "@/lib/biomech/metrics/hittingPoseTiles";
import { runHittingCardTiles } from "@/lib/biomech/metrics/hittingCardTiles";
import { runHittingOwnerTiles } from "@/lib/biomech/metrics/hittingOwnerTiles";
import { runFrontLegGather } from "@/lib/biomech/metrics/frontLegGather";
import { runActiveStride, runMicroPauses } from "@/lib/biomech/metrics/strideRhythm";
import { HIP_LOAD_ATHLETE_UNLOCKED } from "@/lib/biomech/metrics/hipLoadVisibility";
import { runPitchingTiles } from "@/lib/biomech/metrics/pitchingTiles";
import { runPitchingCardTiles } from "@/lib/biomech/metrics/pitchingCardTiles";
import { runThrowingTiles } from "@/lib/biomech/metrics/throwingTiles";
import { runSoftballPitchingTiles } from "@/lib/biomech/metrics/softballPitchingTiles";
import { scoreCard, bandProximity, INCOMPLETE_MIN_SHARE } from "../categories/scoring";
import { HITTING_CATEGORIES, PITCHING_CATEGORIES, THROWING_CATEGORIES, WINDMILL_CATEGORIES } from "../categories/specs";

const load = (n: string) => decodeLandmarkSeriesText(gunzipSync(readFileSync(join(__dirname, "../../biomech/__tests__/fixtures", n))).toString("utf8"));
const still = load("still-subject-15d75bc9.ndjson.gz"), A = load("swing-24fps-914cf54c.ndjson.gz"), B = load("swing-24fps-9d2e117e.ndjson.gz");
type S = ReturnType<typeof load>;
const hitting = (s: S, side: "L" | "R") => ({ pose: runHittingPoseTiles(s, { side }), card: runHittingCardTiles(s, { side }), owner: runHittingOwnerTiles(s, { side, athlete_height_in: null }), gather: runFrontLegGather(s, { side }), rhythm: { active: runActiveStride(s, { side }), pauses: runMicroPauses(s, { side }) } });
const pitching = (s: S) => ({ tiles: runPitchingTiles(s, { throwing_side: "R" }), card: runPitchingCardTiles(s, { throwing_side: "R", athlete_height_in: null }) });
const summary = (c: ReturnType<typeof scoreCard>) => ({ total: c.total, totalReason: c.totalReason, cats: c.categories.map((x) => [x.key, x.status, x.score, x.points, x.incompleteReason, x.measuredShare]) });

describe("category scoring", () => {
  it("weights: hitting 99 + 3 bonus; pitching 100; allocations sum", () => {
    for (const spec of [HITTING_CATEGORIES, PITCHING_CATEGORIES, THROWING_CATEGORIES, WINDMILL_CATEGORIES])
      for (const c of spec.categories) expect(c.tiles.reduce((a, t) => a + t.points, 0)).toBe(c.points);
    expect(HITTING_CATEGORIES.categories.filter((c) => !c.additive).reduce((a, c) => a + c.points, 0)).toBe(99);
    expect(PITCHING_CATEGORIES.categories.reduce((a, c) => a + c.points, 0)).toBe(100);
    expect(INCOMPLETE_MIN_SHARE).toBe(0.6);
  });

  it("record-only proximity: inside band 1, zero two widths out", () => {
    expect(bandProximity(5, { low: 4, high: 6, n: 8 })).toBe(1);
    expect(bandProximity(10, { low: 4, high: 6, n: 8 })).toBe(0);
    expect(bandProximity(7, { low: 4, high: 6, n: 8 })).toBe(0.75);
  });

  it("STILL clip: every card incomplete, no category score, no total — never zero", () => {
    for (const [spec, raw] of [
      [HITTING_CATEGORIES, hitting(still, "L")], [HITTING_CATEGORIES, hitting(still, "R")],
      [PITCHING_CATEGORIES, pitching(still)], [THROWING_CATEGORIES, runThrowingTiles(still, "R")],
      [WINDMILL_CATEGORIES, runSoftballPitchingTiles(still, { throwing_side: "R" } as never)],
    ] as const) for (const aud of ["athlete", "staff"] as const) {
      const c = scoreCard(spec, raw, { audience: aud });
      expect(c.total).toBeNull();
      for (const cat of c.categories.filter((x) => !x.additive)) { expect(cat.status).toBe("incomplete"); expect(cat.score).toBeNull(); }
      const bonus = c.categories.find((x) => x.additive); if (bonus) expect(bonus.score).toBe(0);
    }
  });

  it("swing clips never score pitching, throwing or windmill categories", () => {
    for (const s of [A, B]) {
      for (const [spec, raw] of [[PITCHING_CATEGORIES, pitching(s)], [THROWING_CATEGORIES, runThrowingTiles(s, "R")], [WINDMILL_CATEGORIES, runSoftballPitchingTiles(s, { throwing_side: "R" } as never)]] as const) {
        const c = scoreCard(spec, raw, { audience: "staff" });
        expect(c.total).toBeNull();
        for (const cat of c.categories) expect(cat.score).toBeNull();
      }
    }
  });

  it("914cf54c Left hitting — report", () => {
    const raw = hitting(A, "L");
    const staff = scoreCard(HITTING_CATEGORIES, raw, { audience: "staff" });
    const athlete = scoreCard(HITTING_CATEGORIES, raw, { audience: "athlete" });
    console.log("914 STAFF", JSON.stringify(summary(staff)));
    console.log("914 ATHLETE", JSON.stringify(summary(athlete)));
    console.log("914 TILES", JSON.stringify(staff.categories.map((c) => [c.key, c.tiles.map((t) => [t.key, t.outcome.status, "frac" in t.outcome ? t.outcome.frac : ("reason" in t.outcome ? t.outcome.reason : "why" in t.outcome ? t.outcome.why : null)])])));
    // Staff-only non-negotiable → athlete P3 incomplete (owner ruling 1).
    expect(athlete.categories.find((c) => c.key === "p3")!.status).toBe("incomplete");
    // Pitcher-absent tiles are not applicable, never missing.
    expect(staff.categories.find((c) => c.key === "p2")!.notApplicable).toContain("Hand load timing vs the pitcher");
    // Gather never deducts.
    expect(staff.categories.find((c) => c.key === "front_leg_gather")!.score).toBeGreaterThanOrEqual(0);
    // Deterministic.
    expect(JSON.stringify(scoreCard(HITTING_CATEGORIES, hitting(A, "L"), { audience: "staff" }))).toBe(JSON.stringify(staff));
  });

  it("hip-load switch: off today; flipping it recomputes athlete P1 and P3 from the same clip", () => {
    expect(HIP_LOAD_ATHLETE_UNLOCKED).toBe(false);
    const raw = hitting(A, "L");
    const off = scoreCard(HITTING_CATEGORIES, raw, { audience: "athlete" });
    const on = scoreCard(HITTING_CATEGORIES, raw, { audience: "athlete", unlock: { hip_load: true, back_hip_socket_hold: true } });
    const staff = scoreCard(HITTING_CATEGORIES, raw, { audience: "staff" });
    for (const k of ["p1", "p3"]) {
      const o = off.categories.find((c) => c.key === k)!, n = on.categories.find((c) => c.key === k)!, st = staff.categories.find((c) => c.key === k)!;
      expect(o.tiles.find((t) => t.key === (k === "p1" ? "hip_load" : "back_hip_socket_hold"))!.outcome).toEqual({ status: "missing", reason: "staff_only_until_validated" });
      expect(n.tiles.find((t) => t.key === (k === "p1" ? "hip_load" : "back_hip_socket_hold"))!.outcome.status).not.toBe("missing");
      // Head path (tile 19) stays on its own 10-clip rule, so unlocked P3 differs from staff only by that tile.
      if (k === "p1") expect(n.score).toBe(st.score);
    }
    console.log("SWITCH", JSON.stringify({ off: summary(off), on: summary(on) }));
  });

  it("stride rhythm: still refuses; swing clips record, never graded", () => {
    for (const side of ["L", "R", null] as const) {
      expect(runActiveStride(still, { side }).value).toBeNull();
      expect(runMicroPauses(still, { side }).value).toBeNull();
    }
    const a = runActiveStride(A, { side: "L" }), p = runMicroPauses(A, { side: "L" });
    console.log("RHYTHM 914 L", JSON.stringify({ a: { pattern: a.pattern, value: a.value, why: a.missing_reason, l: a.lineage }, p }));
    expect(a.root_evidence?.emitted ?? false).toBe(false);
    expect(JSON.stringify(runMicroPauses(A, { side: "L" }))).toBe(JSON.stringify(p));
  });

  it("windmill: Wind-up and Follow-through exist, record-only, never scored on these fixtures", () => {
    const keys = WINDMILL_CATEGORIES.categories.map((c) => c.key);
    expect(keys).toEqual(["windup", "stride", "acceleration", "follow_through"]);
    for (const c of WINDMILL_CATEGORIES.categories.filter((c) => c.key === "windup" || c.key === "follow_through")) for (const t of c.tiles) expect(t.recordOnly).toBe(true);
  });
});
