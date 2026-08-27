# `shoulder_tilt_deg` — MediaPipe vs AI-vision validation

Status: **validation reported, swap NOT applied.** The live baseball-pitching tile
still shows the AI-vision value. `MEDIAPIPE_SHOULDER_TILT_ENABLED` is `false`.

## What was run

22 real baseball-pitching clips pulled from storage (the full available sample).
Both methods run on the identical clip set:

- **MediaPipe path**: BlazePose Heavy over every frame; release anchored at peak
  wrist speed; tilt = angle of the left↔right shoulder line vs horizontal,
  folded into [0, 90]. Repeatability probed by shifting the release window 1 frame.
- **AI-vision path**: 12 evenly sampled frames per clip → Gemini 2.5 Flash with the
  same tile definition used in production, temperature 0.

## Results

| Clip | MediaPipe | 1-frame shift | AI-vision | Note |
|---|---|---|---|---|
| c01 | 2.1° | 27.8° | 15° | MP anchor unstable |
| c02–c04 | 25.7° | 22.6° | MISSING | rear angle |
| c05 | MISSING (0 pose frames) | — | MISSING (blank frames) | both correctly missing |
| c06 | 32.2° | 32.2° | 15° | MP stable |
| c07 | 13.4° | 13.4° | 15° | MP stable |
| c08 | 43.4° | 86.8° | MISSING | MP anchor unstable |
| c09 | 41.4° | 41.4° | MISSING | MP stable |
| c10 | 32.6° | 31.9° | 15° | MP stable |
| c11 | 71.4° | 71.4° | 15° | MP stable, value implausible |
| c12 | 68.9° | 64.3° | MISSING | |
| c13 | 10.6° | 10.6° | MISSING (dry drill) | AI read the context better |
| c14 | 14.9° | 88.5° | MISSING | MP anchor unstable |
| c15 | 11.3° | 15.8° | MISSING (dry drill) | AI read the context better |
| c16–c17 | 1.3° | 1.3° | MISSING (dry drill) | AI read the context better |
| c18 | 3.2° | 1.8° | MISSING | |
| c19 | 12.5° | 3.9° | MISSING | MP release_frame=5, implausible |
| c20–c21 | 9.4° | 8.1° | MISSING | |
| c22 | 42.3° | 7.6° | 15° | MP anchor unstable |

## Honest read

**AI-vision is not usable for this tile.** Every single non-missing AI answer was
exactly `15` with confidence `0.8` — 6 of 6. That is a round-number prior, not a
measurement. It never produced a distinct value on any clip. Where it *is*
valuable is context judgment: it correctly refused on the dry-drill / towel-drill
clips (c13, c15, c16, c17) that are not pitches at all, and MediaPipe happily
returned a number for those.

**MediaPipe geometry is sound; the release anchor is the weak link.** On 12 of 21
clips the value moved ≤1.5° under a 1-frame window shift — that is real
repeatability, and far better than the AI path could ever demonstrate since it has
no distinct values to compare. But on 5 clips (c01, c08, c14, c19, c22) a 1-frame
shift moved the answer 9–74°. Those are anchor failures, not landmark failures:
peak-wrist-speed picks the wrong frame on rear-angle and low-frame-rate footage.
c11's 71.4° and c19's release at frame 5 of 715 are both anchor artifacts.

## Recommendation

Do not flip the tile on the strength of this alone. The geometry module is built,
tested and inert; what it still needs before going live is:

1. A release anchor with a stability guard — reject the measurement when the
   1-frame-shift spread exceeds a threshold (the data suggests ~5°) rather than
   showing a number.
2. A pitch-vs-drill gate, since MediaPipe alone cannot tell a towel drill from a
   pitch and will confidently measure the drill.

With those two in place the MediaPipe path is clearly the more trustworthy of the
two. Without them it trades a fake-precise constant for an occasionally
wildly-wrong measurement, which is not an improvement users would feel as one.

## Code

- `src/lib/biomech/metrics/shoulderTiltDeg.ts` — pure geometry + canonical
  missingness, behind `MEDIAPIPE_SHOULDER_TILT_ENABLED = false`. Nothing reads it.
- `src/lib/biomech/metrics/__tests__/shoulderTiltDeg.test.ts` — 9 tests, passing.

---

## Addendum — pre-flip guards (built, flag still off)

Both guards named in this report now exist. Neither is on the athlete path;
`MEDIAPIPE_SHOULDER_TILT_ENABLED` is still `false`.

### Guard 1 — stability under a 1-frame shift
`src/lib/biomech/metrics/shoulderTiltGuarded.ts`

The metric is recomputed on the release frame's neighbour (release ± 1) using
the identical pure function. If the two readings differ by more than
`SHOULDER_TILT_STABILITY_TOLERANCE_DEG` (5°, a starting estimate from this
report's data — tune with more sessions), the result is withheld:
`insufficient_temporal_resolution`, guard `stability_1_frame_shift`, with the
observed delta in lineage. No neighbour pose, or an unmeasurable neighbour, is
also a withhold — the guard is never assumed satisfied.

### Guard 2 — live pitch vs. dry/towel drill
`src/lib/biomech/gates/livePitchGate.ts`

Uses ball evidence from the existing pitch-velocity detection frames
(`BallDetectionFrame`, same shape for hosted Roboflow and the on-device
detector): ≥3 ball detections at ≥0.2 confidence within ±12 frames of release,
with travel ≥12% of the frame diagonal. Verdicts:

| Verdict | Condition | Effect |
| --- | --- | --- |
| `live_pitch` | ball present and travelling | measurement allowed |
| `not_a_pitch` | no ball, or ball present but static | withheld, `ball_not_detected` |
| `indeterminate` | no detection data at all | withheld, `ball_not_detected` |

Absence of detection data is never a pass. The gate is evaluated before the
stability guard so drill clips are never described as "unstable".

Tests: `src/lib/biomech/metrics/__tests__/shoulderTiltGuarded.test.ts` (12
cases, covering both guards, ordering, determinism, and base-missingness
pass-through). No new missingness reasons were introduced; the canonical set is
unchanged and the specific guard is carried in `guard` / `guard_detail`.

### Still outstanding before a flip
- Tolerance calibration on more real sessions (5° is provisional).
- Gate parameters validated against real drill clips vs. real bullpens.
- Detection frames must be available to the pose path at measurement time;
  today they are produced by the velocity pipeline only.
