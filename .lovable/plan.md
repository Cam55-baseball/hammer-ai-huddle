# Hitting 1-2-3-4 Framework — End-to-End Integration

## Doctrine (locked, single source of truth)

The 1-2-3-4 sequence becomes the canonical phase model for every hitting touchpoint. Existing kinetic-chain rules are **kept verbatim** and **re-tagged** into the phases below. Style variants (toe tap, leg kick, hover, coil, hinge, no-stride, slap) are equivalent valid expressions inside each phase.

```
Phase 1 — HIP LOAD (NN)
  Back-hip load executed slow, controlled, balanced, BEFORE the hand load,
  timed to the pitcher's delivery start. Bigger hip load = more swing power
  regardless of stride style (no-stride / toe tap / high pick-up).
  Failure visual: hand load happens first, head drifts toward pitcher,
  no separation, jammed elbow.

Phase 2 — HAND LOAD (style-permitted; flagged when consequences appear)
  Bat/scap/knob load behind the head, locks the balance Phase 1 created.
  Only graded when its absence is causing: long over-stride, head drift to
  pitcher, weight falling forward on front knee, front shoulder pulling out, chest/shoulders
  not staying square.

Phase 3 — STRIDE / LANDING (style-permitted; flagged when consequences appear)
  Short controlled back-hip step, "punch the back glute through the inside
  of the ball." Lands SIDEWAYS, chest+shoulders square to plate, both feet
  down, core max-tensioned, hips do NOT turn shoulders. Only graded when
  its absence shows: stuck on back side, can't reach outside pitch, can't get elbow through/elbow jammed behind hands, late foul ball/jammed/late swing and miss, late on high velocity pitches
  foot down too late, off balance at contact.

Phase 4 — HITTER'S MOVE (NN, MOST IMPORTANT)
  Knob = fulcrum. Back elbow drives forward FIRST while hands stay back
  and shoulders stay closed; barrel catapults last. Hitter "lines hands
  up with the ball" and tries to make contact with the hands — extension
  comes naturally after contact from leftover core tension.
  Failure visual: hands lead elbow, casting, early barrel flip, rollover, weak pop up to opposite field, swing and miss, late, foul ball opposite field, foul ball ground ball pull side,
  swing-and-miss on offspeed away.
```

All current checks (front-foot-plants, hip-shoulder separation, back-elbow-past-belly-button, hands-stay-back, shoulders-open-last, head stability) remain in force and are now phase-tagged: front foot landing → P3, separation/elbow/hands/shoulder timing → P4, head stability → P1+P3.

## Score caps (additive to existing caps; lower cap wins)


| Violation                                             | Cap    |
| ----------------------------------------------------- | ------ |
| P1: hand-load-before-hip-load OR no balanced hip load | 80     |
| P2: missing hand load AND P2 consequences visible     | 85     |
| P3: not sideways at landing / shoulders not square    | 75     |
| P4: hands lead elbow / early barrel flip / cast       | **50** |
| Two or more phase violations                          | 65     |


Sport scope: identical for baseball + softball **except** softball slap-progression at-bats use a relaxed P2 and P3 (lack of hand load and front-foot drift allowed); P1 and P4 unchanged.

Existing caps from `analyze-video` (early shoulder rotation 70, hands drift 75, elbow tucked 75, two+ critical 60) remain and stack — the lowest cap applies.

## What changes, file by file

### 1. Analysis engine — `supabase/functions/analyze-video/index.ts`

- Extend the `module === "hitting"` system prompt with the four-phase doctrine, phase-tagged checkpoints, the new caps table, and slap-hitter exception.
- Add the "bigger hip load = more power, kept early and quiet" rule explicitly.
- Output JSON additions: `phase_scores: { p1, p2, p3, p4 }`, `phase_violations: string[]`, `dominant_failed_phase`, `style_detected` (toe-tap / leg-kick / hover / coil / no-stride / slap).
- Phase-aware corrective feedback templates (varied wording, dialogue-style for P2/P3 to invite hitter conversation).

### 2. Shared hitting doctrine — new `supabase/functions/_shared/hittingPhases.ts` + `src/lib/hittingPhases.ts`

- Single exported constant `HITTING_PHASES` (id, name, NN flag, failure symptoms, style variants, score cap).
- Symptom→phase attribution map used by inference engine.
- Imported by analyze-video, ai-chat, ai-helpdesk, session-insights, generate-vault-recap, video recommendation engine, drill catalogs.

### 3. Drill catalog — `src/data/baseball/drillDefinitions.ts` + `src/data/softball/drillDefinitions.ts`

- Add `phasesTrained: ('P1'|'P2'|'P3'|'P4')[]` to every existing hitting drill (tee_work, front_toss, soft_toss, flips, machine_bp, bp_rounds, live_abs, slap_progression, reaction_speed).
- Add new phase-isolation drills:
  - `hip_load_iso` (P1) — back-hip load only, hands frozen, mirror/video.
  - `load_sequence_pause` (P1+P2) — hip load → 1-count pause → hand load.
  - `sideways_landing_check` (P3) — stride-and-freeze, photo on landing.
  - `elbow_first_fulcrum` (P4) — knob-tied tee drill, elbow leads, hands trail.
  - `catch_the_ball` (P4) — soft toss, "catch with hands, line them up."
  - `no_stride_power` (P1) — stanceless reps to prove hip load = power.

### 4. Symptom→phase inference for practice + game logs

- New helper `attributePhaseFromSymptoms(symptoms[])` in shared lib.
- Wired into:
  - **Practice**: session-insights, calculate-session, generate-vault-recap — when at-bat tags include `rollover`, `swing_miss_offspeed_away`, `late`, `jammed`, `front_shoulder_pull`, `weight_forward`, `stuck_back_side`, `cant_reach_outside`, `foot_down_late`, attribute to most likely failed phase, surface in session feedback.
  - **Game**: game-scoring richSummary post-AB hooks — same attribution, contributes to per-game "phase weakness trend" so the roadmap recommends drills that match.
- No data-loss: existing scores untouched; phase attribution is metadata layered on top.

### 5. Roadmap / drill recommendation

- `videoRecommendationEngine.ts` and the drill recommender consume `dominant_failed_phase` + recent phase-trend to surface drills tagged with that phase first, then library videos tagged with that phase.

### 6. Video Library auto-tagging

- Video taxonomy gains four phase tags: `hitting_phase_1_hip_load`, `hitting_phase_2_hand_load`, `hitting_phase_3_stride_landing`, `hitting_phase_4_hitters_move`.
- Owner-uploaded hitting videos: extend the AI tag-suggestion pipeline (generate-video-tags / Gemini description) to assign one or more phase tags from the description.
- `recompute_library_video_tier` requires no schema change — phase tags ride existing `video_tag_assignments`.

### 7. Hammer chat (`supabase/functions/ai-chat/index.ts`)

- System prompt for `hitting` topics gains the full 1-2-3-4 doctrine, the symptom dictionary, the "dialogue first for P2/P3" instruction, and the "bigger early hip load = more power" rule.
- Hammer must always answer hitting questions through the phase lens and may ask clarifying questions to diagnose phase failure.

### 8. Memory updates

- Replace `mem://features/hitting-analysis/elite-hitting-mechanics-formula` with the 1-2-3-4 doctrine (NN flags, caps, style variants, symptom map, slap exception, "bigger hip load = more power" rule).
- Add Core line: `Hitting analysis uses 1-2-3-4 phases (P1 Hip Load NN, P2 Hand Load, P3 Stride/Land, P4 Hitter's Move NN); P4 cap 50.`

## Non-changes (explicit)

- No DB migration. No score recomputation of historical sessions. No removal of existing kinetic-chain rules, caps, or feedback templates. No change to grading bands. Slap-hitter rule is the only sport-specific divergence.

## Acceptance checks

1. `analyze-video` hitting response now returns `phase_scores`, `phase_violations`, `dominant_failed_phase`, `style_detected` and respects every cap (including P4=50).
2. A swing where hands lead elbow caps at 50 even if everything else is perfect.
3. A no-stride athlete with a strong hip load is **not** penalized on P3.
4. A softball slap rep with front-foot drift is **not** penalized on P3.
5. Logging "rollover" + "swing-miss offspeed away" on a practice rep surfaces a P4 attribution and recommends `elbow_first_fulcrum` / `catch_the_ball` drills + a P4-tagged library video.
6. Asking Hammer "I keep pulling off the ball" returns a P2-anchored dialogue, not generic advice.
7. Existing hitting drills retain every existing field and now carry `phasesTrained`.