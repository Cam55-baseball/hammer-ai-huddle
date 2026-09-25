import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { splitReps, type SampledFrame } from "@/lib/delaycam/session/repSplitter";
import { computeRepMetrics, tierMeets } from "@/lib/delaycam/session/metricRegistry";
import { buildSessionSummary } from "@/lib/delaycam/session/sessionSummary";

/** Synthetic athlete: standing still, with swings at given times (ms). */
function series(opts: { fps: number; durMs: number; bursts: [number, number][]; hideFrom?: [number, number] }): SampledFrame[] {
  const out: SampledFrame[] = [];
  const step = 1000 / opts.fps;
  for (let t = 0; t <= opts.durMs; t += step) {
    const tm = Math.round(t);
    const hidden = opts.hideFrom && tm >= opts.hideFrom[0] && tm <= opts.hideFrom[1];
    if (hidden) {
      out.push({ t_ms: tm, normalized: [], visibility: [] });
      continue;
    }
    const norm = new Array(99).fill(0);
    const vis = new Array(33).fill(0.9);
    let off = 0;
    for (const [s, e] of opts.bursts) if (tm >= s && tm <= e) off = Math.sin(((tm - s) / (e - s)) * Math.PI * 4) * 0.2;
    // shoulders y=0.2, ankles y=0.9 -> body height 0.7
    const set = (i: number, x: number, y: number) => {
      norm[i * 3] = x;
      norm[i * 3 + 1] = y;
    };
    set(11, 0.45, 0.2);
    set(12, 0.55, 0.2);
    set(15, 0.4 + off, 0.4);
    set(16, 0.6 + off, 0.4);
    set(27, 0.45 + off / 2, 0.9);
    set(28, 0.55 + off / 2, 0.9);
    out.push({ t_ms: tm, normalized: norm, visibility: vis });
  }
  return out;
}

describe("DelayCam rep splitter", () => {
  it("finds separated reps and is deterministic", () => {
    const s = series({ fps: 15, durMs: 12000, bursts: [[2000, 3500], [6000, 7500]] });
    const a = splitReps(s, "hitting");
    const b = splitReps(s, "hitting");
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.reps.length).toBe(2);
    expect(a.state).toBe("confident");
  });

  it("never guesses a rep when the athlete is occluded mid-movement", () => {
    const s = series({ fps: 15, durMs: 12000, bursts: [[2000, 3500], [6000, 7500]], hideFrom: [6100, 7200] });
    const r = splitReps(s, "hitting");
    expect(r.reps.length).toBe(1);
    expect(r.state).toBe("partial");
    expect(r.uncertain.length).toBeGreaterThan(0);
  });

  it("refuses to split when sampling is too sparse", () => {
    const s = series({ fps: 5, durMs: 12000, bursts: [[2000, 3500]] });
    const r = splitReps(s, "hitting");
    expect(r.reps.length).toBe(0);
    expect(r.state_reason).toBe("insufficient_temporal_resolution");
  });
});

describe("DelayCam metric tier gating", () => {
  it("reports missingness below the needed tier and works once met — no 60fps ceiling", () => {
    expect(tierMeets("t_low", "t_mid")).toBe(false);
    expect(tierMeets("t_high", "t_mid")).toBe(true);
    const low = computeRepMetrics("pitching", "baseball", { rows: [], fps: 30, tier: "t_low" });
    expect(low.shoulder_tilt_deg).toMatchObject({ missing: true, missing_reason: "insufficient_temporal_resolution" });
    const high = computeRepMetrics("pitching", "baseball", { rows: [], fps: 240, tier: "t_high" });
    expect(high.shoulder_tilt_deg).toMatchObject({ missing: true, missing_reason: "pitcher_release_frame_missing" });
  });

  it("summary lists every applicable metric, including unreleased ones, with a reason", () => {
    const s = buildSessionSummary({
      module: "hitting", sport: "baseball", duration_sec: 10, fps: 52, fps_tier: "t_low", coverage: 0.9,
      detection_state: "uncertain", detection_reason: null, uncertain: [], reps: [],
    });
    expect(s.metrics.length).toBeGreaterThan(0);
    expect(s.metrics.every((m) => m.status !== "not_released" || !!m.release_note)).toBe(true);
  });
});

describe("display toggle is display-only", () => {
  it("the gathering pipeline has no display input", () => {
    const src = readFileSync("src/lib/delaycam/session/sessionPipeline.ts", "utf8");
    const iface = src.slice(src.indexOf("export interface SessionPipelineInput"), src.indexOf("export interface GatheredRep"));
    expect(iface).not.toMatch(/display/i);
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(code).not.toMatch(/display/i);
  });

  it("no session code hardcodes a 60fps ceiling", () => {
    for (const f of ["sessionPipeline.ts", "repSplitter.ts", "metricRegistry.ts", "sessionSummary.ts"]) {
      const code = readFileSync(`src/lib/delaycam/session/${f}`, "utf8");
      expect(code).not.toMatch(/Math\.min\([^)]*\b60\b/);
    }
  });
});
