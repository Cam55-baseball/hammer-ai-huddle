# Single-camera 3D — licence paths and the licence-free parts

as_of: 2026-09-30 · status: research; no model chosen

## Licence findings (read from licence text)
| Asset | Licence | Commercial product? |
|---|---|---|
| BEDLAM (synthetic) | MPI "non-commercial scientific research"; explicitly bars "incorporation in a commercial product" | No |
| AGORA (synthetic) | Same MPI non-commercial text | No |
| SURREAL (synthetic) | INRIA/MPI non-commercial; bars commercial products | No |
| SMPL / SMPL-X body model | Non-commercial; commercial licence sold via Meshcapade | Only with paid licence |
| Human3.6M, AMASS | Research-only | No |
| CMU Graphics Lab mocap | "free for all uses… may include this data in commercially-sold products, but may not resell this data directly" | Yes (with no-resale condition) |
| MediaPipe BlazePose GHUM (already in app) | Apache-2.0 per MediaPipe repo; model card says depth trained on Google's synthetic GHUM data | Yes — confirm model-card terms in writing |

Conclusion: no off-the-shelf lifting model (MotionBERT, VideoPose3D, BEDLAM-trained regressors) has clean weights. Synthetic datasets do not fix it — the major ones are all non-commercial and are built on SMPL.

## Paths
- A (clean pretrained weights): none found for temporal lifting. The only clean 3D estimate in hand is MediaPipe's own.
- B (MotionBERT architecture, own training): feasible on CMU mocap (~2,500 clips, ~9 h, some athletic motion, little throwing/swinging). Synthesise 2D by projecting mocap through random virtual cameras. Compute ~1–3 GPU-days. Expect worse than published MPJPE on H36M (no H36M), roughly 50–70 mm; accuracy on pitching/swinging unknown until tested on our own capture.
- C (licensed mocap): commercial libraries (Rokoko, Mixamo, ActorCore, Movella/Xsens content) — check each licence explicitly permits ML training; most are licensed for animation, not model training. Cost ranges from free-with-account to custom quotes. Sport content is thin.
- D (own multi-phone capture): see report in chat; recommended long-term asset.

## Built now (licence-free)
- `src/lib/biomech/camera/fieldPnP.ts` — camera pose from plate (5 pts), rubber, or bases. Normalised DLT → focal recovery → LM refinement. Refuses on <4 pts, collinear, focal unrecoverable, camera below ground, reprojection > 3 px.
- `src/components/biomech/TapPlateCorners.tsx` — tap-the-corners fallback (not yet placed in the upload flow).
- `src/lib/biomech/lift3d/constraintStage.ts` — model-agnostic correction: height scale, fixed bone lengths from Stance Lock, ground plane; frames needing > 8 % of stature correction are marked missing, never repaired.

Measured (synthetic, known focal, ±2 px taps, camera 25 ft behind plate): median camera-position error 8.5 in, 200/200 solved. Side-on low cameras see the plate edge-on and are refused or weak. Automatic corner detection is NOT built: the cleared BaseballCV classes return boxes, not corners.

## Path research (2026-09-30)
- OpenBiomechanics (Driveline): data CC BY-NC-SA 4.0 + professional-organisation exclusion; code MIT. Commercial use and derived works (trained weights) NOT permitted without a paid commercial licence from Driveline. 100 pitchers / 98 hitters, 411 fastball trials, marker C3D + force plates. Baseball only; no softball equivalent found. Action: request commercial-licence quote.
- Pose2Sim: BSD-3; ≥2 calibrated cameras; validated vs markers CMC >0.9 sagittal (walking/running/cycling, one subject), 15° hip offset in running. Needs a rig.
- Synthetic (BEDLAM/AGORA/SURREAL): all non-commercial, SMPL-based. Own pipeline possible on CMU mocap + a commercially licensed body model.
- Clean pretrained weights: none found for temporal lifting.
- Paid APIs (DeepMotion, Plask, Move AI, PoseTracker): pricing/terms not verified this pass.
