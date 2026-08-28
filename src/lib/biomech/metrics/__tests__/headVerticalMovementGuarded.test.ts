import { describe, it, expect } from "vitest";
import {
  computeGuardedHeadVerticalMovementPct,
  HEAD_MOVEMENT_STABILITY_TOLERANCE_PCT,
} from "../headVerticalMovementGuarded";
import {
  computeHeadVerticalMovementPct,
  NOSE_INDEX,
  LEFT_ANKLE_INDEX,
  RIGHT_ANKLE_INDEX,
  type HeadMovementFrame,
} from "../headVerticalMovementPct";
import type { BallDetectionFrame } from "@/lib/cv/ball/types";

/** One pose frame with the nose at `noseY` (normalized) and ankles on the floor. */
function poseFrame(
  frame_index: number,
  noseY: number,
  opts: { visibility?: number; pose_detected?: boolean } = {},
): HeadMovementFrame {
  const { visibility = 1, pose_detected = true } = opts;
  const lm = Array.from({ length: 33 }, () => ({
    x: 0.5,
    y: 0.5,
    visibility,
  }));
  lm[NOSE_INDEX] = { x: 0.5, y: noseY, visibility };
  lm[LEFT_ANKLE_INDEX] = { x: 0.48, y: 0.95, visibility };
  lm[RIGHT_ANKLE_INDEX] = { x: 0.52, y: 0.95, visibility };
  return { frame_index, pose_detected, landmarks: lm };
}

function ballFrame(
  frame_index: number,
  ball: { x: number; y: number } | null,
): BallDetectionFrame {
  return {
    frame_index,
    timestamp_seconds: frame_index / 30,
    image_width: 1920,
    image_height: 1080,
    predictions: [],
    chosen: ball
      ? { ...ball, width: 12, height: 12, confidence: 0.8, class: "baseball" }
      : null,
  };
}

const flightFrames: BallDetectionFrame[] = [
  ballFrame(18, { x: 400, y: 500 }),
  ballFrame(19, { x: 700, y: 520 }),
  ballFrame(20, { x: 1000, y: 545 }),
  ballFrame(21, { x: 1300, y: 570 }),
];

const drillFrames: BallDetectionFrame[] = [18, 19, 20, 21, 22].map((i) =>
  ballFrame(i, null),
);

/** A steady delivery: the head drifts smoothly, so a 1-frame shift barely moves it. */
const steadyFrames: HeadMovementFrame[] = Array.from({ length: 24 }, (_, i) =>
  poseFrame(i, 0.3 + i * 0.001),
);

const base = {
  start_frame_index: 2,
  release_frame_index: 20,
  shift_frames: 1 as const,
  frame_height: 1000,
  detectionFrames: flightFrames,
};

describe("guarded head movement — happy path", () => {
  it("passes a stable measurement through on a live pitch", () => {
    const result = computeGuardedHeadVerticalMovementPct({
      ...base,
      frames: steadyFrames,
    });

    expect(result.value).not.toBeNull();
    expect(result.guard).toBeNull();
    expect(result.missingness).toBeNull();
    expect(result.value).toBe(
      computeHeadVerticalMovementPct({
        frames: steadyFrames,
        start_frame_index: 2,
        release_frame_index: 20,
        frame_height: 1000,
      }).value,
    );
  });

  it("records the window delta in lineage", () => {
    const result = computeGuardedHeadVerticalMovementPct({
      ...base,
      frames: steadyFrames,
    });
    expect(result.lineage.delta_pct).not.toBeNull();
    expect(result.lineage.delta_pct!).toBeLessThanOrEqual(
      HEAD_MOVEMENT_STABILITY_TOLERANCE_PCT,
    );
    expect(result.lineage.base.tracked_frames).toBeGreaterThan(5);
  });
});

describe("guarded head movement — live-pitch gate", () => {
  it("withholds the value on a dry drill with no ball", () => {
    const result = computeGuardedHeadVerticalMovementPct({
      ...base,
      frames: steadyFrames,
      detectionFrames: drillFrames,
    });

    expect(result.value).toBeNull();
    expect(result.guard).toBe("live_pitch_gate");
    expect(result.lineage.primary_value).not.toBeNull();
  });
});

describe("guarded head movement — stability guard", () => {
  it("withholds when one extra frame swings the answer past tolerance", () => {
    // Frame 21 carries a large head drop. Including it (via the +1 shift)
    // changes the measured travel dramatically — the window is not resolving
    // the delivery.
    const spiky = steadyFrames.map((f) =>
      f.frame_index === 21 ? poseFrame(21, 0.75) : f,
    );

    const result = computeGuardedHeadVerticalMovementPct({
      ...base,
      frames: spiky,
    });

    expect(result.value).toBeNull();
    expect(result.guard).toBe("stability_1_frame_shift");
    expect(result.lineage.delta_pct!).toBeGreaterThan(
      HEAD_MOVEMENT_STABILITY_TOLERANCE_PCT,
    );
    expect(result.guard_detail).toContain("setup→release window");
  });

  it("withholds when the shifted window is unmeasurable", () => {
    // Only 5 posed frames: shifting the window forward drops it below the
    // minimum tracked-frame count, so stability cannot be checked.
    const sparse: HeadMovementFrame[] = [2, 3, 4, 5, 6].map((i) =>
      poseFrame(i, 0.3 + i * 0.001),
    );
    const result = computeGuardedHeadVerticalMovementPct({
      ...base,
      frames: sparse,
      release_frame_index: 6,
      shift_frames: -1,
      // Ball in flight around this clip's release so the pitch gate passes and
      // the stability guard is the thing under test.
      detectionFrames: [4, 5, 6, 7].map((i, n) =>
        ballFrame(i, { x: 400 + n * 300, y: 500 + n * 20 }),
      ),
    });
    expect(result.value).toBeNull();
    expect(result.guard).toBe("stability_1_frame_shift");
  });
});

describe("guarded head movement — guards never invent a value", () => {
  it("passes base missingness through when no pose was tracked", () => {
    const result = computeGuardedHeadVerticalMovementPct({
      ...base,
      frames: [],
    });
    expect(result.value).toBeNull();
    expect(result.guard).toBeNull();
    expect(result.missingness?.emitted_by).toBe("D-POSE");
  });

  it("passes base missingness through when too few frames are tracked", () => {
    const result = computeGuardedHeadVerticalMovementPct({
      ...base,
      frames: [poseFrame(3, 0.3), poseFrame(4, 0.31)],
    });
    expect(result.value).toBeNull();
    expect(result.guard).toBeNull();
  });
});
