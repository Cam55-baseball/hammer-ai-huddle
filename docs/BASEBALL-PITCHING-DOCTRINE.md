# Baseball Pitching — owner coaching doctrine

**Status:** sourced coaching context, not a claim that a phone clip can measure every item. The fault checklist remains separate. Only call what the supplied frames actually show. Missing evidence is not a pass or a fault. No arm-slot prescription, diagnosis, or invented universal standard.

## Phase model

The headings below are existing editorial organization, not owner-approved phase names. Where a sequence boundary is not visible, do not infer it. Do not publish proposed names in analysis output until the owner approves them. Pitching Report Card phase names are a separate future owner decision.

**Proposed for the owner's approval — analysis only, not yet output or Report Card labels:**

| Proposed analysis name | Proposed span |
|---|---|
| Phase 1 — Create Balance | Set through gather to peak leg lift |
| Phase 2 — Load and Drive | Energy angle, with lift and thrust happening together |
| Phase 3 — Stride to Landing | Tempo, stride length and front-foot strike |
| Phase 4 — The Pitcher's Move | Release, stack and track, extension |
| The Finish | Drag line, glove and balance after release |

If approved, numbered phases must always be written with number and name, never a bare abbreviation. These boundaries and words remain proposals; they do not change any tile or standard.

### Phase 1 — Leg Lift and Direction

- **Owner-supplied:** At maximum leg lift, energy angle runs from the **back ankle of the support leg to the front hip**, at least 18°; 25° or more is the owner's elite target. This records forward intent before landing. Source: `src/lib/biomech/metrics/pitchingTiles.ts` (`ENERGY_ANGLE_ORIGIN`, 2026-09-27 owner confirmation; `PITCHING_OWNER_STANDARDS`). Do not substitute the older mid-foot definition.
- **Owner-supplied:** Lift the knee toward the back armpit while the rear hip drives forward **at the same time**. A pause between lift and thrust is the fault. This is a simultaneity check, **not** a second 18° angle; the older `lift_thrust_deg` is retired. Source: `pitchingTiles.ts` lift/thrust standard and `src/lib/reportCard/disciplines/bp.ts` lift/thrust explainer.
- **Owner-supplied:** Eyes/head face the target at peak lift; head facing is observable from a usable view, eye gaze itself is not reliably readable. Source: `src/lib/biomech/metrics/pitchingCardTiles.ts` and `bp.ts`.
- **Owner-supplied:** Tempo from peak leg lift to front-foot strike is at most 1.05 seconds. The two moments must be identifiable at the true clip frame rate. Source: `bp.ts`, `pitchingCardTiles.ts`.

### Phase 2 — Stride and Landing

- **Owner-supplied:** Stride is at least 90% of standing height, measured from rear ankle at lift to front ankle at landing where calibrated. Source: `bp.ts` stride tile. Do not infer inches or height from an uncalibrated image.
- **Owner-supplied:** Hips lead and shoulders stay closed until front-foot strike. The owner's report-card wording calls hip–shoulder separation the biggest velocity multiplier; **do not claim a measured magnitude or velocity gain from sampled frames**. Individual separation magnitude is record-only against that athlete's baseline, not a universal optimum. Sources: `bp.ts` hip/shoulder explainer; `src/lib/biomech/AGENTS.md` baseline rule.
- **Research-sourced, limited to the studied pitching population:** Aguinaldo & Chambers (2009, *American Journal of Sports Medicine*, n=69 adults) linked trunk rotation before stride-foot contact with higher elbow valgus torque. This is an association, not an injury diagnosis or an individual prediction. Source: `docs/THROWING-INJURY-RESEARCH.md`. Do not turn it into a phone-video torque measurement.
- **Owner-supplied:** At front-foot strike, balance at landing is the absolute tilt of the line between the two eyes from horizontal. Within 15° passes. It is not a head-axis or head-over-base measurement. The still-subject eye-line floor is 5.00° against the 15° standard: workable, but not generous. A side-on camera sees the eye-to-eye line end-on and cannot support this reading. It needs a camera behind or in front of the pitcher; because no confirmed on-line pitching fixture exists yet, the measurement remains missing even from that view until validation. Source: `pitchingCardTiles.ts`, `docs/landmark-noise-floors.md`, `docs/camera-requirements.md`.

### Phase 3 — Release

- **Owner-supplied:** Stack and track: shoulders and eyes stay level at release. The card specifies shoulder tilt at or under 10° and head deviation from target line at or under 15°. Head vertical travel through delivery has an owner threshold at or under 2% of height. Sources: `bp.ts` stack, shoulder, head, stability tiles; `pitchingCardTiles.ts`.
- **Owner-supplied:** Glove turns over and tucks toward the body within the shoulder frame. Do not claim to see the fingers or grade the swivel under a glove: current pose landmarks cannot resolve it. Sources: `bp.ts` glove tile, `pitchingCardTiles.ts` glove refusal.
- **Owner-supplied:** Release extension is 8–12 inches ahead of the front foot; only a clearly out-of-range reading earns a call, and calibration is required. Source: `pitchingCardTiles.ts` extension standard and noise-floor handling.

### Phase 4 — Finish

- **Owner-supplied:** Back-foot drag is straight toward the plate and no longer than two foot lengths. This reflects how the back leg finished its push; direction requires a view along the target line. Sources: `pitchingCardTiles.ts` drag standard and `bp.ts`.

## Arm-care boundaries

- **Research-sourced:** Shoulder abduction near 90° at foot contact is discussed in Matsuo et al. (2002 simulation), summarized in `docs/THROWING-INJURY-RESEARCH.md`; evidence for a phone-video fault threshold is limited. **Do not grade elbow height or cue a raised elbow.**
- **Removed, do not re-add as a standard or fault:** elbow flexion above 90° at foot contact came from research into throwing injury biomechanics, not from the owner. It varies with individual anatomy and was already cut from the throwing card by the owner's elite filter. The same exclusion applies to pitching: do not grade, flag, or cue an athlete on this structural angle.
- **Research-sourced:** Aguinaldo & Chambers (2009) connect early trunk rotation with elbow loading; an open shoulder at contact is a mechanics observation, not a diagnosis. No clip can establish individual injury risk or torque. Arm-care items are flags with zero grading weight, and advise a qualified professional where appropriate. Sources: `docs/THROWING-INJURY-RESEARCH.md`, `src/lib/biomech/AGENTS.md`.
- **Owner-supplied:** Arm slot is fascial and individually variable, never itself a fault. Elite review excludes style nitpicks; individually variable readings remain recorded for a per-athlete baseline, not discarded. Sources: `docs/THROWING-DOCTRINE.md`, `src/lib/biomech/AGENTS.md`.

## Camera and evidence

- **Existing camera requirements:** side-on for energy angle and lift/thrust; along the target line for shoulder opening and drag direction; behind or in front for shoulder/eye level. Keep the athlete and the full movement visible, with a continuous, steady shot. Source: `docs/camera-requirements.md`, `bp.ts`.
- **Existing refusal rules:** pose delivery must establish lift → plant → release within the configured gate; unreadable landmarks or insufficient calibration produce missingness, never guessed measurements. A sampled analysis can describe only visible frames. Source: `src/lib/biomech/AGENTS.md` and `src/lib/biomech/metrics/pitchingTiles.ts`.
- **Analysis is not the Report Card:** the model may describe balance at landing, head position, and visible glove action in plain coaching language when the frames actually show them. A refused eye-line or glove tile does not prohibit a qualitative observation. Do not turn that observation into an angle, calibrated distance, pass/fail measurement, or inferred unseen swivel.

## Pending owner approval and deferred Report Card work

1. **Analysis phase names and boundaries:** the five proposed names and spans above require owner approval before they appear in analysis output. Report Card phase naming is reserved for a separate ruling.
2. **Deferred Report Card measurements:** leave glove swivel, drag direction, and release extension as they are. Glove swivel needs a reliable glove/hand detector; drag direction needs a validated target-line view; extension needs reliable height calibration and a resolvable noise floor. Until then, report missingness rather than a fault. The settled eye-line definition likewise remains missing on side-on footage and awaits an on-line pitching fixture before any measurement is released.