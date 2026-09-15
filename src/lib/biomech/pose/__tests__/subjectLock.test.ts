import { describe, expect, it } from "vitest";
import {
  SUBJECT_SELECTION_RULE,
  SubjectTracker,
  candidateFeatures,
  selectSubject,
  type PoseCandidate,
} from "../subjectLock";

/**
 * Build a synthetic 33-landmark person: a vertical bar of height `h` centred on
 * `cx`, with the hips at `hipY`. Enough structure for selection and tracking,
 * which only read bbox, mid-hip and visibility.
 */
function person(opts: {
  cx: number;
  top: number;
  bottom: number;
  hipY?: number;
  vis?: number;
}): PoseCandidate {
  const { cx, top, bottom } = opts;
  const vis = opts.vis ?? 0.9;
  const hipY = opts.hipY ?? (top + bottom) / 2;
  const normalized: number[] = [];
  const world: number[] = [];
  const visibility: number[] = [];
  for (let i = 0; i < 33; i++) {
    // Spread landmarks between top and bottom so the bbox is exact.
    const y = i === 0 ? top : i === 32 ? bottom : hipY;
    normalized.push(cx, y, 0);
    world.push(0, 0, 0);
    visibility.push(vis);
  }
  // hips (23, 24)
  normalized[23 * 3] = cx - 0.01;
  normalized[23 * 3 + 1] = hipY;
  normalized[24 * 3] = cx + 0.01;
  normalized[24 * 3 + 1] = hipY;
  return { normalized, world, visibility };
}

describe("candidate features", () => {
  it("reads bbox, mid-hip and mean visibility", () => {
    const f = candidateFeatures(person({ cx: 0.5, top: 0.1, bottom: 0.9, hipY: 0.5 }))!;
    expect(f.bbox_height).toBeCloseTo(0.8, 6);
    expect(f.mid_hip_x).toBeCloseTo(0.5, 6);
    expect(f.mid_hip_y).toBeCloseTo(0.5, 6);
    expect(f.mean_visibility).toBeCloseTo(0.9, 6);
    expect(f.hip_visible).toBe(true);
  });
});

describe("subject selection", () => {
  it("prefers the central person over a larger one at the edge", () => {
    const coachNearLens = person({ cx: 0.08, top: 0.02, bottom: 0.98 });
    const athlete = person({ cx: 0.52, top: 0.15, bottom: 0.9 });
    expect(selectSubject([coachNearLens, athlete])).toBe(1);
  });

  it("ignores a central but tiny background figure", () => {
    const athlete = person({ cx: 0.35, top: 0.1, bottom: 0.95 });
    const bystander = person({ cx: 0.5, top: 0.4, bottom: 0.55 });
    expect(selectSubject([athlete, bystander])).toBe(0);
  });

  it("drops low-visibility candidates", () => {
    const ghost = person({ cx: 0.5, top: 0.1, bottom: 0.9, vis: 0.2 });
    expect(selectSubject([ghost])).toBeNull();
  });

  it("is deterministic and breaks exact ties on the lowest index", () => {
    const a = person({ cx: 0.4, top: 0.1, bottom: 0.9 });
    const b = person({ cx: 0.6, top: 0.1, bottom: 0.9 });
    expect(selectSubject([a, b])).toBe(0);
    expect(selectSubject([a, b])).toBe(0);
  });

  it("exposes a stable rule identity", () => {
    expect(SUBJECT_SELECTION_RULE).toBe("largest_confident_then_most_central_v1");
  });
});

describe("subject tracking", () => {
  it("holds the lock on the same body while a second person moves nearby", () => {
    const t = new SubjectTracker(30);
    const steps = [];
    for (let i = 0; i < 10; i++) {
      const athlete = person({ cx: 0.5 + i * 0.005, top: 0.15, bottom: 0.9 });
      const other = person({ cx: 0.2, top: 0.3, bottom: 0.95 });
      // Candidate ORDER flips every frame — exactly what MediaPipe does.
      steps.push(t.step(i % 2 === 0 ? [athlete, other] : [other, athlete]));
    }
    expect(steps[0].event).toBe("locked");
    const stats = t.stats();
    expect(stats.frames_locked).toBe(10);
    expect(stats.frames_lost).toBe(0);
    expect(stats.reacquisitions).toBe(0);
    expect(stats.track_reliable).toBe(true);
  });

  it("marks a frame unobserved rather than jumping to another body", () => {
    const t = new SubjectTracker(30);
    t.step([person({ cx: 0.5, top: 0.15, bottom: 0.9, hipY: 0.5 })]);
    // Only a far-away person remains: a 0.35 hip jump in one frame.
    const s = t.step([person({ cx: 0.5, top: 0.5, bottom: 0.99, hipY: 0.85 })]);
    expect(s.candidate_index).toBeNull();
    expect(s.event).toBe("lost");
  });

  it("counts a re-acquisition when the subject returns within the widened gate", () => {
    const t = new SubjectTracker(30);
    t.step([person({ cx: 0.5, top: 0.15, bottom: 0.9, hipY: 0.5 })]);
    t.step([]); // gone
    const s = t.step([person({ cx: 0.5, top: 0.15, bottom: 0.9, hipY: 0.52 })]);
    expect(s.event).toBe("reacquired");
    expect(t.stats().reacquisitions).toBe(1);
  });

  it("flags the track unreliable when it keeps breaking", () => {
    const t = new SubjectTracker(30);
    t.step([person({ cx: 0.5, top: 0.15, bottom: 0.9, hipY: 0.5 })]);
    for (let i = 0; i < 20; i++) t.step([]);
    const stats = t.stats();
    expect(stats.frames_lost).toBe(20);
    expect(stats.track_reliable).toBe(false);
  });

  it("produces identical output for identical input", () => {
    const run = () => {
      const t = new SubjectTracker(59.94);
      const out = [];
      for (let i = 0; i < 20; i++) {
        out.push(
          t.step([
            person({ cx: 0.3, top: 0.2, bottom: 0.92 }),
            person({ cx: 0.5 + i * 0.004, top: 0.15, bottom: 0.9 }),
          ]),
        );
      }
      return JSON.stringify({ out, stats: t.stats() });
    };
    expect(run()).toBe(run());
    expect(run()).toBe(run());
  });
});
