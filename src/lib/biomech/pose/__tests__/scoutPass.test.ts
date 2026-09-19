import { describe, expect, it } from "vitest";
import {
  SCOUT_SAMPLE_BUDGET,
  deriveScoutFindings,
  placeDenseWindowFromScout,
  selectScoutFrameIndices,
  type ScoutObservation,
} from "../scoutPass";

function obs(
  frame_index: number,
  fps: number,
  opts: { locked?: boolean; hipX?: number; hipY?: number; vis?: number } = {},
): ScoutObservation {
  const locked = opts.locked ?? true;
  const hipX = opts.hipX ?? 0.5;
  const hipY = opts.hipY ?? 0.5;
  const normalized: number[] = [];
  for (let i = 0; i < 33; i++) normalized.push(hipX, hipY, 0);
  return {
    frame_index,
    timestamp_seconds: frame_index / fps,
    subject_locked: locked,
    mean_visibility: locked ? (opts.vis ?? 0.9) : 0,
    normalized: locked ? normalized : [],
    candidates_detected: locked ? 1 : 0,
  };
}

describe("scout sampling", () => {
  it("spreads samples across the WHOLE clip", () => {
    const idx = selectScoutFrameIndices(60, 18, SCOUT_SAMPLE_BUDGET);
    expect(idx[0]).toBe(0);
    expect(idx[idx.length - 1]).toBe(Math.floor(18 * 60) - 1);
    expect(idx.length).toBe(SCOUT_SAMPLE_BUDGET);
  });

  it("never samples more frames than the clip has", () => {
    expect(selectScoutFrameIndices(30, 0.3, 32).length).toBeLessThanOrEqual(9);
  });

  it("is deterministic", () => {
    expect(selectScoutFrameIndices(59.94, 12).join()).toBe(
      selectScoutFrameIndices(59.94, 12).join(),
    );
  });
});

describe("scout findings", () => {
  it("reports the presence span of the locked subject only", () => {
    const fps = 60;
    const o = [
      obs(0, fps, { locked: false }),
      obs(300, fps),
      obs(600, fps),
      obs(900, fps, { locked: false }),
    ];
    const f = deriveScoutFindings(o);
    expect(f.presence!.start_frame).toBe(300);
    expect(f.presence!.end_frame).toBe(600);
    expect(f.samples_with_subject).toBe(2);
  });

  it("refuses a span when the athlete is never confidently locked", () => {
    const f = deriveScoutFindings([obs(0, 60, { locked: false }), obs(60, 60, { locked: false })]);
    expect(f.presence).toBeNull();
    expect(f.motion_centre_frame).toBeNull();
  });

  it("finds the region of highest movement, not the clip midpoint", () => {
    const fps = 60;
    const o: ScoutObservation[] = [];
    for (let i = 0; i < 20; i++) {
      // Still for most of the clip; a burst of movement near the end.
      const moving = i >= 15 && i <= 17;
      o.push(obs(i * 60, fps, { hipX: moving ? 0.5 + (i - 14) * 0.08 : 0.5 }));
    }
    const f = deriveScoutFindings(o);
    expect(f.motion_centre_frame).toBeGreaterThan(14 * 60);
    expect(f.motion_peak_per_sec).toBeGreaterThan(0);
  });
});

describe("window placement", () => {
  const fps = 60;
  const duration = 18;

  function findingsPresent(startF: number, endF: number, motion: number) {
    return deriveScoutFindings([
      obs(startF, fps, { hipX: 0.5 }),
      obs(motion - 30, fps, { hipX: 0.5 }),
      obs(motion, fps, { hipX: 0.8 }),
      obs(motion + 30, fps, { hipX: 0.5 }),
      obs(endF, fps, { hipX: 0.5 }),
    ]);
  }

  it("fails honestly instead of falling back to the midpoint", () => {
    const f = deriveScoutFindings([obs(0, fps, { locked: false })]);
    const r = placeDenseWindowFromScout({
      fps_true: fps,
      duration_sec: duration,
      budget: 110,
      landingTimeSec: null,
      findings: f,
    });
    expect("failed" in r).toBe(true);
    if ("failed" in r) expect(r.reason).toBe("pose_not_detected");
  });

  it("centres the dense window on the scouted motion, inside the presence span", () => {
    const f = findingsPresent(600, 900, 780);
    const r = placeDenseWindowFromScout({
      fps_true: fps,
      duration_sec: duration,
      budget: 110,
      landingTimeSec: null,
      findings: f,
    });
    if ("failed" in r) throw new Error("expected a window");
    expect(r.source).toBe("scout_motion");
    expect(r.frame_count).toBe(110);
    expect(r.start_frame).toBeGreaterThanOrEqual(600);
    expect(r.end_frame).toBeLessThanOrEqual(900);
  });

  it("keeps a landing mark the scout confirms", () => {
    const f = findingsPresent(600, 900, 780);
    const r = placeDenseWindowFromScout({
      fps_true: fps,
      duration_sec: duration,
      budget: 110,
      landingTimeSec: 13, // frame 780
      findings: f,
    });
    if ("failed" in r) throw new Error("expected a window");
    expect(r.source).toBe("landing_mark");
    expect(r.rule).toContain("scout_validated");
  });

  it("rejects a landing mark where the athlete is not present", () => {
    const f = findingsPresent(600, 900, 780);
    const r = placeDenseWindowFromScout({
      fps_true: fps,
      duration_sec: duration,
      budget: 110,
      landingTimeSec: 1, // frame 60 — far outside the presence span
      findings: f,
    });
    if ("failed" in r) throw new Error("expected a window");
    expect(r.source).toBe("landing_mark_rejected_scout_motion");
  });

  it("is deterministic", () => {
    const f = findingsPresent(600, 900, 780);
    const call = () =>
      JSON.stringify(
        placeDenseWindowFromScout({
          fps_true: fps,
          duration_sec: duration,
          budget: 110,
          landingTimeSec: null,
          findings: f,
        }),
      );
    expect(call()).toBe(call());
  });
});
