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

## Pitching v2 — rigid-body shoulder, robust head, Stance Lock (2026-09-27)

Source: still clip 15d75bc9 (29.97 fps, 328 frames, one subject, facing camera). PROVISIONAL — re-measure across more subjects, camera angles and, once the native camera plugin lands, higher frame rates.

### Shoulder rotation (rigid-body length preservation)
| Method | max−min | p2–p98 | tracking failures |
|---|---|---|---|
| Old: MediaPipe z line angle | 12.7° | — | — |
| Rigid solve, L = median 3-D length in stance | **14.1°** | 10.9° | 0/328 |
| Rigid solve, L = median 2-D width in stance | 14.7° | 13.1° | 0/328 |
| Same, relative to pelvis (horizontal dot product) | 13.7° | 10.2° | — |

Result: **no improvement.** The observed 2-D shoulder width itself varies 4.9 % (p2–p98) on a still subject, and θ = acos(d/L) is flattest at θ≈0 — exactly the closed position a side-on camera sees. A 1.5 % width error there is already ~10°. Sign cannot be resolved by continuity at θ≈0 (touching the image plane and crossing it look identical). Floor set to 14.1°; a pass is not measurable from a side-on camera. A camera on the rubber–plate line (behind the plate or centre field) puts closed shoulders along the depth axis, where d = L·sin θ is best-conditioned; untested, needs a clip.

### Head vertical movement (% of stature, stance-lock stature, roll-corrected)
| Step | whole clip max−min | whole p2–p98 | worst 1.5 s window max−min | worst 1.5 s p2–p98 |
|---|---|---|---|---|
| Old (max−min, 3-frame median) | 3.13 | — | 2.31 | — |
| 2A robust range | — | 2.82 | — | 2.30 |
| 2B zero-phase One Euro, gate closed | 2.79 | 2.75 | 2.03 | 1.97 |
| 2B filter forced open (delivery-like) | 3.07 | 2.82 | 2.26 | 2.22 |
| 2C rigid neck/ear rejection | 0/328 frames rejected — no change |
| Jitter only (raw − <0.5 Hz trend) | 0.79 | 0.49 | **0.69** | 0.62 |
| Slow trend only (<0.5 Hz) | 2.61 | 2.59 | 1.76 | 1.71 |

Result: tracking **jitter** is 0.7 % — below the owner's 2 %, so a pass is measurable. The rest is a slow component (≤1.8 % per 1.5 s) that no filter can remove, because it is not jitter: it is either real postural sway or slow model drift, and this clip cannot separate the two. Floor set to 0.7 % (jitter); the slow component is stated, not hidden. The tile uses the p2–p98 statistic after all three fixes.

### Stance Lock
Lower-body speed on the still clip: p99 0.143, max 0.190 body-heights/s → micro-threshold 0.20, min 0.5 s. Camera pitch is not observable from one 2-D view (reported null). The still clip has no lock by default (nothing moves after it) — correct.

### Rear-hip thrust onset
Rear-hip horizontal speed on the still clip: max 0.124 body-heights/s (p99 0.092) → onset threshold 0.15, persisting ≥ 0.06 s.

## Hitting pose tiles (2026-09-27, still clip 15d75bc9, PROVISIONAL)
Statistic: p99 of |3-frame median − clip median|, stance-unrolled, % of stature.
- hip_load (hip-mid fore–aft): p95 0.67, **p99 0.80**, max 0.87 → floor 0.8 %.
- hands_outside (rear wrist − rear shoulder, fore–aft): left wrist p99 2.28, right 0.96 → floor 2.3 % (worst side).

## Energy angle origin change (2026-09-27)
Owner confirmed back ankle → front hip. Measured at the peak-lift frame (delivery gate bypassed; none of the fixtures is a pitch, so the tile itself still refuses on all):
| Clip / side | back ankle (±1-frame Δ) | old mid-foot (±1-frame Δ) |
|---|---|---|
| 914cf54c L (lift 177) | 20.94° (0.31) | 18.75° (0.13) |
| 914cf54c R (lift 214, walk-off) | 13.69° (5.44) | 16.52° (4.24) |
| 9d2e117e R (lift 34) | 31.49° (1.03) | 29.00° (0.79) |
The ankle reads ~2.2–2.5° higher; ±1-frame stability is slightly looser but well inside the 5° limit.

## Shoulder opening — five-signal fusion (2026-09-27, provisional)
Still clip 15d75bc9, |median3 − Stance Lock median|, % of stature unless noted. p99 / max.
| Signal | p99 | max | Equivalent at closed | Used |
|---|---|---|---|---|
| S1 far-shoulder visibility | 0.0002 | 0.0003 | n/a | NO — visibility stays ≥0.996 through the whole 914cf54c swing; model does not report occlusion |
| Width alone (reference) | 0.59 | 0.61 | ≈13.9° | width family |
| S2 shoulder/hip ratio | 0.062 | 0.064 | ≈15.9° | width family |
| S3 torso triangle area (%stature²) | 0.150 | 0.152 | ≈16.4° | width family |
| S4 shoulder-mid vs hip-mid offset | 0.69 | 0.75 | not an angle (signed) | yes |
| S5 glove wrist vs shoulder-mid | 0.96–2.05 | 1.26–2.28 | not an angle | yes (opening direction unconfirmed) |
Fusion (≥2 independent votes agree): with p99 floors 2/326 still frames falsely read "opening"; with max floors 0/326. Pass resolution = 13.9°. No single signal clears the 0° standard in degrees.

## Hitting card batch 1 (2026-09-27, provisional)
- D-SWING-PEAK (torso rotation peak — NOT contact): still clip 15d75bc9 unwrapped shoulder-line rate max 0.315 rad/s, p99 0.270. Floor 4.0 rad/s (≈ half a 90° turn in 0.2 s); frames with 2-D shoulder length < 35 % of clip median are masked (edge-on, ill-conditioned).
- hand_load: hands-mid forward p99 1.35 % of stature (vertical 2.72 %). Floor 1.35 %. Ungraded — owner number needed.

## 2026-09-27 — D-SWING-PEAK threshold (measured, provisional)
Shoulder-line angular rate (rad/s, ±2-frame zero-phase smoothing, edge-on frames masked).
- Still clip 15d75bc9: max 0.315, p99 0.258, median 0.098 — noise ceiling.
- 914cf54c Left (confirmed swing): peak 7.056 at frame 188.
- 9d2e117e Right: in-window max 0.744 — no confirmed swing peak; still refuses.
- Threshold 1.5 rad/s = geometric midpoint (≈1.49): 4.8× above the still ceiling, 4.7× below the swing peak. Replaces the earlier reasoned 4.0. One confirmed swing only — re-measure as clips arrive.

## 2026-09-27 — Head discipline (hitting tile 4, body only)
Still clip, whole-clip stance baseline, 0.7 s windows, worst batting side.
- Head-centroid minus rear-shoulder forward change: p99 0.52, max 0.733 % stature → floor 0.75.
- Head-turn jerk (nose − ear-mid forward offset, 2nd diff × fps²): p99 42.92, max 46.70 %stature/s² → floor 47.

## 2026-09-27 — Hand-load grip gate
Wrist separation, still clip median 10.7% of stature (subject not gripping a bat). Gate 15% (reasoned: hands on one handle ≈5% + 2× the 2.3% wrist floor). 914cf54c Left reads 50.5% apart in the stance lock and 7.1% at the load apex — the earlier −39.8% "hand load" was the wrists coming together, not the hands loading. Hand load now refuses on that clip.
