# Landmark noise floors — still-subject reference clip

**Date measured:** 2026-09-26 · **Status: PROVISIONAL** — one clip, one subject, one lighting condition, 29.97 fps. Measure again across more subjects and conditions, and at higher frame rates once the native camera plugin lands.

## Source clip
- Video `15d75bc9-07e8-4adb-9eb1-e1fbf3d59efa`, landmark run `ca0ec35f-5410-4394-aebd-8fb42442aa02`, owner account, created 2026-09-26 18:34 UTC, module hitting / baseball.
- Capture: 1080×1920 portrait, inference 360×640, fps_true **29.97** (measured_rvfc), 328 frames, pose on 328/328, mean visibility 0.974. Model `blazepose_full@0.10.35-mediapipe-tasks-vision`.
- Subject stands still for ~10.9 s. Body scale = median shoulder-mid → ankle-mid distance = **952.1 px**.
- Copied into the repo as `src/lib/biomech/__tests__/fixtures/still-subject-15d75bc9.ndjson.gz` (permanent regression fixture).
- Note: the most recent owner run (`4e7b83fe…`, video `edf45130`) is **not** a still clip. It's 185 frames at 59.94 fps with real movement and an unreliable subject track. It's used only as the movement gate's positive control.

All pixel figures are in source pixels. Percentiles use linear interpolation (numpy).

## Head-centroid jitter (mean of nose, both eyes, both ears)
Frame-to-frame displacement, n = 327:

| | mean | median | p95 | p99 | max |
|---|---|---|---|---|---|
| horizontal px | 0.47 | 0.27 | 1.75 | 2.16 | 3.09 |
| vertical px | 0.77 | 0.42 | 2.97 | 4.46 | 4.85 |
| 2D px | 0.98 | 0.74 | 3.20 | 4.68 | 5.06 |

- Drift from the first frame to the last: dx **+23.6 px**, dy **+11.6 px**. Position SD: x 7.9 px, y 9.7 px.
- Displacement across a lag (p95 / p99 px): 15 frames (0.5 s) 10.6 / 12.1 · 30 frames 16.8 / 20.7 · 60 frames 28.1 / 32.5.
- Any-two-frames displacement: p95 35.0 px (3.68 % body), p99 39.5 px (**4.15 % body**), max 43.7 px.
- **Plausibility flag:** the slow drift is far larger than the frame-to-frame jitter. That pattern looks like real postural sway, or a slow camera shift, not model noise. Either way it's what "standing still" looks like to the tracker.

## Nose alone (for comparison)
| | mean | median | p95 | p99 | max |
|---|---|---|---|---|---|
| horizontal px | 0.68 | 0.36 | 2.44 | 3.24 | 4.49 |
| vertical px | 0.85 | 0.48 | 3.15 | 4.75 | 5.99 |
| 2D px | 1.20 | 0.89 | 3.62 | 4.97 | 7.49 |

Drift dx +26.0, dy +10.8 px. The centroid cuts frame-to-frame p95 jitter by about 12 % (3.62 → 3.20 px) and max jitter by about 32 %. It doesn't reduce the drift.

## Pelvis angle (left hip → right hip vector vs horizontal, folded to ±90°)
- n = 328, mean −0.00°, **SD 0.59°**, full range 2.90°.
- Frame-to-frame change: mean 0.23°, median 0.14°, p95 0.82°, **p99 1.10°**, max 1.44°.

## Rear-hip proxy candidates (for D-COIL — not built)
| signal | SD | Δ/frame p95 | Δ/frame p99 | max |
|---|---|---|---|---|
| left knee-over-hip x offset (body units) | 0.0026 | 0.005 | 0.007 | 0.008 |
| right knee-over-hip x offset (body units) | 0.0039 | 0.004 | 0.006 | 0.011 |
| left knee angle (°) | 1.40 | 2.09 | 2.52 | 3.37 |
| right knee angle (°) | 1.31 | 1.71 | 2.51 | 2.73 |
| hip-width / body height | 0.0016 | 0.003 | 0.004 | 0.006 |

## Whole-body movement (movement gate basis)
Robust excursion per body landmark = hypot(p98−p2 of x, p98−p2 of y) / body scale:
shoulders 0.048 / 0.038 · elbows 0.054 / 0.035 · wrists **0.064** / 0.053 · hips 0.040 / 0.035 · knees 0.044 / 0.036 · ankles 0.047 / 0.039. Max **0.064**, median 0.042.
Ankle vertical range: left 0.047, right 0.038 body heights.
Positive control (real movement, `edf45130`): max 1.61, median 1.02.

## Recommendations and thresholds now in code
| item | value | basis |
|---|---|---|
| Movement gate (`gates/movementGate.ts`) | refuse if max landmark excursion < **0.20 body** | ≈3× the still-clip maximum (0.064) |
| D-PEAK-LIFT noise gate | lift ankle must rise ≥ **0.10 body heights** above its median | ≈2× still ankle range (0.047) |
| D-PLANT (tempo) noise gate | front ankle raised ≥ **0.10 body heights** before landing | same basis |
| D-LOAD-APEX min displacement | 0.02 → **0.10 body** | old value was below wrist noise (0.064) |
| **Head-movement floor (recommended, not in code)** | **4.2 % body height** (~40 px here) | any-two-frames p99 of head centroid (4.15 %). Stricter event-window option: 1.3 % body, the 15-frame-lag p99 (12.1 px) |
| **Pelvis deadband (recommended, not in code)** | **3.0°** | ≥ full still range (2.90°), ≈ p99 frame-to-frame Δ (1.10°) × 2.7, ≈ 5 × SD |

No tile, formula or threshold other than the four gate rows above was changed. The head floor and pelvis deadband are recommendations only.

## Addendum 2026-09-26 — D-COIL proxy signal (rear thigh angle) on the still clip
Tile 20 measures the rear-thigh angle (hip→knee vs vertical, toward the pitcher), not the hip-line angle the 3.0° deadband was sized on.
- Left thigh: SD 0.48°, full range **2.53°** — inside 3.0°.
- Right thigh: SD 0.70°, full range **3.35°** — **exceeds 3.0°**. On a right-side rear hip, noise alone can cross the deadband. Owner decision needed: keep 3.0°, or size a proxy-specific deadband (e.g. ≥3.4°, full observed range).
- Label correction: 4.2 % is the p99 of head movement between **any two frames**, not frame-to-frame (frame-to-frame p99 is 0.49 % body).
