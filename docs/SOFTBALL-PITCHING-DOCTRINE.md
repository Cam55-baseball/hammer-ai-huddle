# Softball Windmill Pitching — Doctrine

**Status:** Research-sourced. Every item marked SOURCED or PROPOSED.

**Primary source:** Friesen KB, Butler LS, Bordelon NM, Downs-Talmage JL, Fleisig GS, Ulman S, Oliver GD. *Biomechanics of Fastpitch Softball Pitching: A Practitioner's Guide.* Sports Health, 2025. Clinical review, Level 4. https://journals.sagepub.com/doi/10.1177/19417381251323610

**Supporting:** Werner SL et al., *Biomechanics of Youth Windmill Softball Pitching*, Am J Sports Med 2005;33(4):552–560 · *Kinematics and Kinetics of Elite Windmill Softball Pitching*, 2006 · PubMed 30038835 · PubMed 34250163 · PubMed 31460954

## THE GOVERNING RULE
The windmill is NOT a baseball delivery with a different arm path. It is a distinct motion with its own phases, anchors and standards. Baseball anchors do not transfer. There is no peak leg lift. **The 12 o'clock arm position is the windmill's equivalent of baseball's maximum external rotation.** The arm travels a circle, not an arc.
Per owner rule: never grade a softball athlete against a baseball-converted number. Where no softball benchmark exists, record the measurement and give no grade.

## THE FOUR PHASES — SOURCED
| Phase | Begins | Ends |
|---|---|---|
| Wind-up | first movement | end of loaded position, drive leg about to extend |
| Stride | drive-leg triple extension begins | stride foot contact (SFC) |
| Acceleration | SFC | ball release |
| Follow-through | ball release | return to balance |

## EIGHT ANCHORS — NONE EXIST YET
| Anchor | Definition | Detection |
|---|---|---|
| `wu_first_move` | first movement out of stillness | D-STILL exit |
| `wu_end` | "sprinter-like position" reached | drive-knee flexion minimum + back heel off ground |
| `stride_start` | drive leg begins triple extension | hip/knee/ankle extension onset |
| `top_of_backswing` | top of the back of the circle | throwing wrist highest point behind body |
| `arm_12_oclock` | arm at 12 o'clock — windmill's MER equivalent | throwing wrist directly above shoulder |
| `sfc` | **stride foot contact — the pivotal anchor** | stride-ankle vertical velocity zero-crossing with load |
| `release` | ball leaves the hand | throwing wrist lowest point near hip, arm decelerating |
| `ft_end` | follow-through complete | return to stillness |

**`sfc` is to the windmill what front-foot plant is to baseball. Five of thirteen tiles hang off it.**

## THE 13 TILES

**1. `windup_trunk_tibia`** — SOURCED (Friesen 1A). At end of wind-up, the trunk line and the drive-leg tibia line should remain roughly parallel. Measure the absolute angle between them at `wu_end`. Threshold ≤10° PROPOSED — the paper gives no number. Camera: side-on.

**2. `windup_hip_square`** — SOURCED (Friesen 1B). At end of wind-up the hips should be relatively square to home plate. Measure hip-line angle to the plate line at `wu_end`. Threshold ≤10° PROPOSED. Camera: **plate line** — frontal plane, cannot be read side-on.

**3. `windup_knee_over_foot`** — SOURCED (Friesen 1C). A vertical line from the drive-leg knee joint centre to the heel should fall in line with the middle of the drive foot. Measure horizontal offset of knee centre from foot midline as a fraction of foot length. Threshold ≤10° equivalent PROPOSED. **Clinical note SOURCED:** knee valgus indicates poor lumbo-pelvic-hip stability and raises injury risk (PubMed 34250163) — this is a SAFETY FLAG as well as a mechanics tile. Camera: **plate line**.

**4. `windup_foot_power_line`** — SOURCED (Friesen 1D). Drive foot pointed toward home plate and placed directly on the power line. Measure foot yaw relative to the plate line plus lateral offset from the power line. Threshold ≤10° PROPOSED. Camera: plate line preferred.

**The "sprinter-like position" — SOURCED.** Target end-of-wind-up posture: both knees flexed, back heel off the ground, slight forward trunk lean, body squared to home plate. These four tiles decompose it, and force generated in this phase correlates with pitch velocity.

**5. `stride_triple_extension`** — SOURCED (Friesen 1E). At stride start the drive leg undergoes forceful triple extension pushing away from the mound; shoulders and trunk remain facing home plate; shoulders and stride-leg hip flex toward home plate. Three channels: (a) hip/knee/ankle extension all occurring, (b) trunk still facing the plate, (c) forward flexion toward the plate. Pass/fail PROPOSED. Camera: side-on for (a) and (c), plate line for (b).

**6. `stride_profile`** — SOURCED. Stride length as a percentage of body height at three moments:
| Moment | Youth | Collegiate |
|---|---|---|
| Top of backswing | ≈98% | ≈93% |
| Stride foot contact | ≈89% | ≈89% |
| Release | ≈68% | ≈73% |
**Pitch-type adjustments SOURCED:** drop ball → shortened stride; rise ball → lengthened; curveball → toward the pitching-arm side; screwball → toward the glove-arm side. **The tile must know the pitch type or report the profile ungraded.** Camera: side-on. **Fatigue note SOURCED:** stride length correlates with pitch volume (Werner) — a shortening stride across a session is a fatigue signal.

**7. `sfc_foot_angle`** — **SOURCED, the only published numeric band.** At SFC the stride foot should be angled **0–45° toward the pitching-arm side. DO NOT ALTER THIS THRESHOLD.** Camera: overhead or plate line.

**8. `sfc_arm_path`** — SOURCED in principle (Friesen 1F). Arm path stays close to the body. Measure perpendicular distance from throwing wrist to trunk line at SFC, normalised by arm length. Threshold ≤15° PROPOSED. Camera: **plate line** — side-on foreshortens the circle. **Clinical note SOURCED:** at SFC a horizontal adduction torque is present and the shoulder is externally rotating; arm path here has injury meaning.

**9. `sfc_trunk_alignment`** — SOURCED. Trunk position at SFC. Pass/fail PROPOSED. **CRITICAL, SOURCED:** in youth pitchers greater trunk flexion at top of backswing, at SFC and at release all correlate with GREATER ball velocity (PubMed 30038835, r = 0.42–0.48). **More flexion is not a fault. DO NOT GRADE FLEXION AS AN ERROR.**

**10. `sfc_knee_ankle`** — SOURCED. Knee and ankle alignment at SFC. Threshold ≤10° PROPOSED. **Clinical note SOURCED:** stride-knee valgus at foot contact indicates poor lumbo-pelvic-hip stability and is associated with injury risk. **Flag as a safety concern carrying NO grading weight.** Camera: **plate line** — valgus is frontal-plane and invisible side-on.

**11. `sfc_hip_shoulder_rotation`** — PROPOSED AND FLAGGED. Separation between pelvis and shoulder lines at SFC. Threshold ≥20° PROPOSED. **⚠️ Baseball's ≥50° is NOT transferable. No published softball minimum exists. This is the single largest open number in the card.** Camera: **plate line**.

**12. `accel_arm_path`** — SOURCED (Friesen 1F). During acceleration the arm stays close to the body and the back leg stays close to the power line. Two channels: (a) wrist-to-trunk distance from 12 o'clock to release, (b) drive-leg lateral deviation from the power line. Pass/fail PROPOSED. Camera: plate line for (a), side-on for (b) — **needs both angles**.

**13. `ft_knee_ankle`** — SOURCED. Knee and ankle alignment through follow-through. Threshold ≤10° PROPOSED. **Fatigue note SOURCED:** trunk flexion at follow-through correlates with pitch volume (Werner).

## CAMERA REQUIREMENTS
Side-on: `windup_trunk_tibia`, `stride_profile`, `sfc_trunk_alignment`
Plate line: `windup_hip_square`, `windup_knee_over_foot`, `windup_foot_power_line`, `sfc_foot_angle`, `sfc_arm_path`, `sfc_knee_ankle`, `sfc_hip_shoulder_rotation`, `ft_knee_ankle`
Both: `stride_triple_extension`, `accel_arm_path`

**Eight of thirteen need a plate-line camera. A side-on-only softball card can honestly produce five tiles at most.** Softball pitching capture should default to two clips of the same pitch — one side-on, one plate line — with the card drawing from both.

## WHAT IS MISSING
Only three items carry a published figure: the 0–45° stride foot angle, the stride-length percentages, and the trunk-flexion velocity correlations. Every other threshold is a reading of a qualitative description and must be labelled PROPOSED in the app.
No AUSL distributions exist. Per owner approach: record raw, percentile against Hammers' own accumulating softball population, use AUSL published figures directly where they exist, let a 20–80 scale emerge over years. **No softball tile gets a 20–80 grade until a real reference population exists.**

---

## BUILD RECORD — 2026-09-30 (engineering, not doctrine)

Code: `src/lib/biomech/anchors/windmillAnchors.ts`, `src/lib/biomech/metrics/softballPitchingTiles.ts`, `src/lib/reportCard/softballPitchingCopy.ts`, test `src/lib/biomech/__tests__/softballPitchingTiles.test.ts`. **UNVALIDATED — no softball pitching clip has ever been run through it. Not wired to live analysis; softball remains locked pre-launch.**

### Noise floors (still clip 15d75bc9, p2–p98, measured before any threshold)
Drive/stride knee angle 5.4° · hip angle 2.5° · trunk angle 2.0° · wrist height 3.9 % of stature · inter-ankle distance 0.9 % of stature. None exceeds a standard it gates: the stride-profile window is ±10 pp (PROPOSED) against a 0.9 % floor. Knee-valgus and foot-angle floors cannot be measured until a plate-line clip exists.

### Anchor detection as built
- `wu_first_move` — shared D-FIRST-MOVE (one implementation).
- `sfc` — stride foot travels forward ≥ 20 % of stature (PROPOSED, ≫ floor), then settles on both axes for two frames.
- `wu_end` — drive-knee angle minimum before SFC, more than the knee floor below stance, back heel raised > 1.5 % stature (PROPOSED).
- `stride_start` — drive knee back above minimum + floor for two frames.
- `arm_12_oclock` — throwing wrist above the shoulder by more than the wrist floor, nearest the shoulder vertical, before SFC.
- `top_of_backswing` — wrist highest while behind the shoulder; honestly missing when a pitcher has no backswing.
- `release` — wrist lowest near the hip within 0.35 s after SFC, and the shared slot-free hands-apart gate must pass.
- `ft_end` — first return to stillness after release.
Drive leg = throwing side, stride foot = the other, from `strideSide.ts`.

### Elite filter (owner standing rule) — 13 doctrine tiles → 7 card items
| Doctrine tile | Decision | Why |
|---|---|---|
| `stride_profile` | KEEP, graded | Published figures. Graded only when pitch type is fastball and age band known; otherwise recorded ungraded. Pass window ±10 pp is PROPOSED. |
| `sfc_foot_angle` | KEEP (0–45° untouched) | Only published band. Refuses until a plate-line/overhead clip exists. |
| `stride_triple_extension` | KEEP, ungraded one-view | Genuine athletic fault (no drive). Side-on reads (a) and (c); (b) needs the plate line, so it is never graded from one camera. |
| `sfc_arm_path` + `accel_arm_path`(a) | MERGED → `arm_path` | Same fault, sourced injury meaning. Plate line only. |
| `sfc_trunk_alignment` | RECORD ONLY → `trunk_flexion` | More flexion ↔ more velocity. Never graded, never a fault. |
| `windup_knee_over_foot` | SAFETY FLAG → `windup_knee_valgus_flag` | Weight 0, ends with the qualified-professional line. Plate line. |
| `sfc_knee_ankle` | SAFETY FLAG → `sfc_knee_valgus_flag` | Weight 0, same framing. Plate line. |
| `windup_trunk_tibia` | CUT | "Roughly parallel" with a proposed ≤10° — Level 4 qualitative, depends on build, edges uncallable. |
| `windup_hip_square` | CUT | Proposed ≤10° on a qualitative description; posture/style; frontal only. |
| `windup_foot_power_line` | CUT | Foot placement on a line is style; proposed number only. |
| `sfc_hip_shoulder_rotation` | CUT | No softball number exists at all; ≥20° is invented and baseball's ≥50° does not transfer. |
| `ft_knee_ankle` | CUT | Follow-through alignment, proposed number, weakest evidence. |
| `accel_arm_path`(b) | CUT | Drive-leg drift off the power line is style. |

Side-on today can produce at most three items: stride profile, drive-leg push (recorded, ungraded), forward lean (recorded).

### Fixture results
Still 15d75bc9 — every anchor and tile missing (`no_windmill_delivery:wu_first_move:…`; `throwing_side_unknown` with no side). Swings 914cf54c and 9d2e117e, both sides — `no_windmill_delivery:sfc:no_stride_foot_contact` (a hitter's stride never reaches a windmill stride).
