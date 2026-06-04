# PIE V2 — Pitching Intelligence Engine Constitutional Expansion

**Scope: Baseball only. Softball untouched.**

This is a constitutional expansion explicitly overriding the Architecture Program Closure Stop Gate (2026-06-04). A sealed override entry will be appended to `.lovable/plan.md` before any code is written. All work remains subordinate to Eternal Laws, Megaphase 151–160, RR-5/6/8, replay legality, lineage completeness, survivability precedence, and the demo↔production firewall.

---

## Constitutional preamble

1. PIE V2 is an **additive** layer. No existing pitching scoring is mutated; new scores are introduced under a new `pie_v2.*` namespace and combined into existing surfaces via versioned weights pinned to `engine_version`.
2. All new metrics are **interpretive signals**. They never author `organism_truth`, `athlete_intent`, `authority_override`, `hard_stop`, or `rehabilitation_state`. RR-6 supremacy: any injury-adjacent signal (arm slot drift, hip/shoulder separation regression) routes through safeguarding orchestration — never auto-diagnoses.
3. All metric emissions ride canonical `emitAsbEvent` / `buildAsbRow` / `asb_events` + `asb_event_lineage`. Zero parallel storage. Topic prefix reserved: `pitching.v2.*`.
4. Confidence + missingness are first-class on every metric. Manual entry vs. video-derived vs. sensor-derived provenance is preserved end-to-end.
5. Two tracked-only signals (Release Extension Consistency, Arm Slot Consistency) are **never** pass/fail. They feed AI Hammer + reports + injury risk lineage only.

---

## The 13 PIE V2 signals (baseball)

| # | Signal | Type | Target | Topic |
|---|---|---|---|---|
| 1 | Energy Angle | scored | ≥18°, ideal 25° | `pitching.v2.energy_angle` |
| 2 | Target Visual Stability | scored | eyes on target at peak lift | `pitching.v2.visual_stability` |
| 3 | Hip/Shoulder Separation Integrity | scored | no early opening | `pitching.v2.separation` |
| 4 | Leg Lift → Foot Strike Time | scored | ≤1.05s | `pitching.v2.tempo` |
| 5 | Stride Length Efficiency | scored | ≥100% body height | `pitching.v2.stride` |
| 6 | Head Stability (vertical) | scored | ≤2% drop | `pitching.v2.head_stability` |
| 7 | Hip Alignment | scored | hips fired, shoulders closed | `pitching.v2.hip_alignment` |
| 8 | Front Side Control | scored | glove inside frame | `pitching.v2.front_side` |
| 9 | Head Alignment at Release | scored | ≤15° belly-line | `pitching.v2.head_alignment` |
| 10 | Shoulder Level at Release | scored | ≤10° horizontal | `pitching.v2.shoulder_level` |
| 11 | Rear Foot Drag Efficiency | scored | ~2 foot-lengths toward target | `pitching.v2.rear_foot_drag` |
| 12 | Release Extension Consistency | tracked-only | variance/trend | `pitching.v2.extension_consistency` |
| 13 | Arm Slot Consistency | tracked-only | variance/trend, fatigue/pain correlation | `pitching.v2.arm_slot_consistency` |

---

## Execution structure — 6 sealed waves

Each wave ends with build, regression, and a sealed entry in `.lovable/plan.md`. Waves are sequential; each is independently rollback-safe.

### Wave 0 — Constitutional override + foundation docs (governance)
- Write `docs/asb/pie-v2-constitution.md` covering: scope (baseball-only), 13 signal definitions, scoring rubrics, tier severity (clean / minor / major / critical), confidence model, missingness model, RR-6 safeguarding routing, RR-5 narrative restraint (no destiny framing), longitudinal interpretation rules, AI Hammer talking-point bounds.
- Write `docs/asb/pie-v2-integration-map.md` cataloging every impacted system (analysis, athlete state, readiness, drills, videos, AI Hammer, dashboards, recruiting, longitudinal, injury detection).
- Append sealed entry to `.lovable/plan.md`: **OVERRIDE — Architecture Program Closure (2026-06-04) reopened for PIE V2**.
- Update `mem://index.md` with PIE V2 memory reference.

### Wave 1 — Canonical signal substrate
- `src/data/baseball/pieV2Signals.ts` — single source of truth: 13 signal definitions, scoring rubrics, severity tiers, root-cause catalog, ideal/deficient pattern strings, units, target/acceptable bands, score-to-tier mappings.
- `src/lib/pieV2/types.ts` — `PieV2SignalId`, `PieV2RepInput`, `PieV2RepScore`, `PieV2SessionAggregate`, `PieV2Provenance` ("manual" | "video_derived" | "sensor_derived"), `PieV2Confidence`, `PieV2Missingness`.
- `src/lib/pieV2/scoring.ts` — pure deterministic scorers per signal (input → score 0–100 + severity tier + confidence + missingness). No side effects. Pinned to `PIE_V2_ENGINE_VERSION = 'v2.0.0'`.
- `src/lib/pieV2/aggregate.ts` — session/window aggregators: average, best, worst, variance, consistency, pitch-to-pitch variance, fatigue slope (within-session degradation), pain-correlation hook (joins RR-6 athlete-reported pain windows, observational only).
- `src/lib/pieV2/emit.ts` — wraps `emitAsbEvent` to publish `pitching.v2.<signal>` events with full provenance, confidence, missingness, lineage parent (parent rep, parent session, parent video frame range when video-derived).
- Tests under `src/lib/pieV2/__tests__/` covering every scorer, every tier boundary, missingness paths, and replay determinism (identical input → identical output across calls).

### Wave 2 — Capture surface (micro-layer + video annotation)
- Extend `src/hooks/useMicroLayerInput.ts` with optional `pie_v2` block (all fields optional; missingness preserved). No existing fields touched.
- New `src/components/micro-layer/PitchingV2MicroInput.tsx` — collapsible "Advanced Mechanics (PIE V2)" panel inside the existing `PitchingMicroInput`. Fields: energy angle band, eyes-on-target boolean, separation boolean, tempo seconds, stride %BH, head drop %, hip-fired/shoulders-closed booleans, glove-frame boolean, head-alignment degrees, shoulder-level degrees, rear-foot-drag length band, extension feet, arm-slot degrees. Each field has a "not measured" affordance that marks missingness explicitly.
- `src/components/video-annotations/PieV2FrameTagger.tsx` — frame-range tagger that maps video annotations to PIE V2 signals (uses existing `video_annotations` table; no schema change). Video-derived annotations call `pieV2/emit.ts` with `provenance: "video_derived"` and frame-range lineage.
- Sport-gate: capture surfaces only render when `useSportConfig().sport === 'baseball'`.

### Wave 3 — Athlete state, readiness, AI Hammer integration
- `src/lib/pieV2/athleteState.ts` — derives PIE V2 contribution to athlete state under the existing Engine Input Contract V2 envelope:
  - Mechanics-derived fatigue signal (tempo degradation + head-stability degradation within session) feeds `freshness_6h` and `volatility` as additive priors, never overwriting.
  - Arm-slot drift + extension regression contribute to a **new** `arm_health_caution` advisory channel surfaced through `safeguarding_notifications` (RR-6: advisory only, never diagnostic, never authoritative).
- `src/lib/pieV2/aiHammerTalkingPoints.ts` — deterministic, bounded talking-point generator: maps tier × signal → constitution-approved coaching language (no fabrication, no destiny framing per RR-5). AI Hammer reads from this table; LLM may rephrase only within constraint envelope.
- Surface in existing AI Hammer pipeline (`src/lib/coachingReportTypes.ts`, `src/hooks/useCoachingReport.ts`): add PIE V2 section under "Mechanics" with deficiency prioritization, root cause, drill prescription handle, video prescription handle.
- `src/hooks/usePitchingV2Trends.ts` — exposes session, 7d, 30d, 90d aggregates for every signal; powers dashboards, reports, recruiting cards.

### Wave 4 — Drill + video recommendation expansion
- `src/data/baseball/pieV2DrillCatalog.ts` — for each of the 13 signals, four tiers:
  - L1 Awareness · L2 Patterning · L3 Integration · L4 Velocity/Game-Speed.
  Each drill has: id, name, signal_id, tier, deficiency_targets[], severity_floor, video_refs[], cues, common-mistake list, progression-next handle.
- `src/data/baseball/pieV2VideoCatalog.ts` — for each signal: education / demonstration / corrective / advanced / elite-example. Each entry has signal_id, severity_targets[], deficiency_pattern_targets[], length tier, prerequisite handle.
- `src/lib/pieV2/recommendDrills.ts` — deterministic recommender: session aggregate → ranked drill set, respecting athlete cumulative load (reads existing `athlete_load_tracking`), survivability (RR-6 caution dampens velocity-tier drills), and progression history.
- `src/lib/pieV2/recommendVideos.ts` — deterministic video recommender mirroring drill logic; wires into `VideoSuggestionsPanel` and `PostSessionVideoSuggestions` through a new taxonomy bucket `pitching_mechanics_v2`.
- Extend `src/lib/analysisToTaxonomy.ts` to fold PIE V2 deficiencies into the existing taxonomy without breaking current taxonomy consumers.

### Wave 5 — Longitudinal, recruiting, coach dashboards, injury detection
- `src/lib/pieV2/longitudinal.ts` — replay-safe longitudinal model: per-signal trajectory, regression detection, improvement detection, fatigue-correlation snapshot, pain-window correlation snapshot. Pure derivation from `asb_events`; no new storage.
- `src/components/recruiting/PieV2RecruitingCard.tsx` — opt-in recruiting surface (subordinate to RR-9 visibility ethics — gated; not auto-published). Shows aggregate tier per signal, trajectory arrow, confidence bands, missingness state.
- `src/components/coach/PieV2CoachPanel.tsx` — coach-facing panel embedded in `CoachAthleteDetail.tsx`: per-signal heatmap, recent session sparklines, deficiency queue, drill/video recommendation tray, safeguarding flags (RR-6 caution surfacing).
- `src/lib/pieV2/injuryDetection.ts` — bounded heuristic that combines arm-slot drift trend + extension regression + within-session tempo decay + athlete-reported pain (RR-6) → emits `safeguarding_notification` of type `mechanics_injury_caution`. Never auto-diagnoses; routes through existing safeguarding orchestration (signal → classify → contain → notify role → arbitrate). Always advisory, always rollback-capable.
- Coach notification: new `coach_notifications` payload type `pie_v2_caution` (no schema change; uses existing JSON payload).

### Wave 6 — Storage, observability, replay, sealing
- **Schema migration (single migration):**
  - Add JSONB column `pie_v2_signals` to `performance_sessions` (nullable, default null) — session aggregate snapshot for fast read paths.
  - Add JSONB column `pie_v2_caution_state` to `athlete_foundation_state` (nullable) — current advisory state for athlete state surfaces.
  - Both denormalizations are projections only; `asb_events` remains canonical (per persistence authority doctrine — storage never authors truth).
  - No new tables. No RLS changes (existing row owners cover both columns). No GRANT changes needed.
- Register topic IDs in `src/lib/asb/topicLabels.ts`.
- Extend `src/lib/asb/invariants/asbInvariantChecks.ts` with PIE V2 invariants (provenance required, confidence bounded, missingness preserved, never authors organism_truth).
- Update `src/lib/runtime/projections/types.ts::prepareRows` only if a new visibility scope is required (it is not — PIE V2 inherits standard demo/parent/athlete scopes via existing firewall).
- Replay test: full session round-trip through `pieV2/emit` → `asb_events` → `useAsbTimeline` → reconstructed aggregate equals original aggregate byte-for-byte at pinned `PIE_V2_ENGINE_VERSION`.
- Append sealed ratification entry to `.lovable/plan.md`: **PIE V2 — sealed, baseball-only, additive-only, RR-5/6/8/9 compliant, demo↔production firewall preserved.**

---

## Impact map (referenced in detail in `docs/asb/pie-v2-integration-map.md`)

| Surface | Change |
|---|---|
| Analysis | `analysisToTaxonomy.ts` folds PIE V2 deficiencies; existing taxonomy unchanged |
| Scoring | Existing pitching composites unchanged; new `pie_v2_composite` exposed alongside |
| Athlete State | Additive priors to `freshness_6h`/`volatility`; new `arm_health_caution` advisory channel |
| Readiness | Caution states dampen velocity-tier drill recommendations |
| AI Hammer | New PIE V2 section bounded by `aiHammerTalkingPoints.ts` constraint envelope |
| Drills | 13 × 4 = 52 drill definitions + deterministic recommender |
| Videos | 13 × 5 = 65 video slots + deterministic recommender |
| Progress reports | Per-signal trajectory in `useCoachingReport.ts` |
| Recruiting | Opt-in `PieV2RecruitingCard`, RR-9 gated |
| Coach Dashboard | `PieV2CoachPanel` in `CoachAthleteDetail.tsx` |
| Development Plans | Drill prescriptions feed `drill_prescriptions` via existing pipeline |
| Trend Analysis | `usePitchingV2Trends.ts` |
| Injury Detection | Bounded `injuryDetection.ts` advisory; RR-6 supremacy |
| Confidence Scores | First-class on every PIE V2 emission |
| Longitudinal | `pieV2/longitudinal.ts` pure derivation from `asb_events` |

---

## What this plan does NOT touch

- Softball pitching paths.
- Existing scoring formulas (`gradeEngine.ts`, `eliteScore.ts`, etc.). PIE V2 surfaces alongside them, never mutates.
- RR-7 / RR-9 / RR-10 implementation (RR-9 only referenced as a gate for recruiting visibility; no new RR-9 capabilities built).
- Sensor adapter layer (remains deferred per `sensorContract.ts`).
- Demo/production firewall logic.
- Authority hierarchy, replay engine semantics, kernel invariants.

---

## Technical notes for the engineer

- **Engine version pinning:** `PIE_V2_ENGINE_VERSION = 'v2.0.0'` exported from `src/lib/pieV2/types.ts`. Every emit and every aggregator carries this version.
- **Provenance enum** is closed: `"manual" | "video_derived" | "sensor_derived"`. Sensor path remains capability-flagged off (sensor adapter still deferred); the enum value exists so future activation needs no schema mutation.
- **Missingness model:** `{ field: string; reason: "not_captured" | "not_visible_in_video" | "athlete_declined" | "sensor_unavailable" }[]` — never imputed.
- **Confidence model:** `{ score: 0–100; basis: "manual_single_rep" | "manual_aggregate" | "video_frame_range" | "video_aggregate" | "sensor_calibrated" | "sensor_uncalibrated" }`.
- **Replay determinism guarantee:** all scoring is pure, deterministic, version-pinned. Replay tests live in `src/lib/pieV2/__tests__/replay.test.ts`.
- **Safeguarding routing:** `injuryDetection.ts` calls into the existing safeguarding orchestration sub-route (Megaphase 151 doctrine). It never writes `rehabilitation_state` and never bypasses Phase 31 arbitration.

---

## Stop Gate (post-Wave-6)

After Wave 6 seals, PIE V2 enters the same post-coherence stability-guard regime as the rest of the platform: additive-only, replay-stable, no structural mutation, no parallel surfaces. Future PIE V3 requires a separate constitutional override.
