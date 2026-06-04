# PIE V2 — Wave A Ratification

**Sealed:** 2026-06-04
**Engine version:** `pie-v2.0.0`
**Status:** APPROVED

## Scope

Wave A closes out the Pitching Intelligence Engine V2 substrate to a production-ready state. Subordinate to Eternal Laws, Megaphase 151–160, RR-5/6/8/9, replay legality, demo↔production firewall.

## Completed in Wave A

1. **Capture surface** — `useMicroLayerInput` extended with `pie_v2` field bag and `updatePieV2` helper.
2. **Video annotation** — `PieV2FrameTagger` component emits canonical `pitching.v2.<signal>` events with `video_frame_range` lineage and optional `parent_video_event_id` derivation refs.
3. **Taxonomy bridge** — `analysisToTaxonomy.ts` exposes `mapPieV2SignalToMovement` and `pieV2SignalsToTaxonomyBucket` so the canonical video recommender surfaces correct mechanics videos. No new pipeline.
4. **Coach mount** — `PieV2CoachPanel` + `PieV2HammerBriefPanel` mounted on `CoachAthleteDetail`. Sport-gated to baseball.
5. **AI Hammer wiring** — `PieV2HammerBriefPanel` consumes `talkingPointsForSession` and renders the deterministic envelope (RR-5 compliant). HUAC slot-order schema lands in Wave B; this panel pre-anticipates it.
6. **Recruiting mount** — `PieV2RecruitingCard` mounted on `CoachAthleteDetail` behind an explicit RR-9 opt-in toggle. Visibility off by default.
7. **Schema migration** — `pie_v2_signals` JSONB on `performance_sessions`, `pie_v2_caution_state` JSONB on `athlete_foundation_state`. Projection-cache only; canonical truth remains `asb_events`. Existing row-owner RLS policies cover the new columns.
8. **Replay determinism tests** — `src/lib/pieV2/__tests__/replay.test.ts` verifies scoring + aggregation are byte-deterministic across runs at pinned engine_version, and that missingness suppresses scoring without fabricating confidence.

## Invariants preserved

- Zero parallel storage — all PIE V2 events ride canonical `emitAsbEvent` → `asb_events` + `asb_event_lineage`.
- Replay-safe — `engine_version = pie-v2.0.0` pinned at every emission and aggregation site.
- RR-5 — AI Hammer talking points generated from deterministic envelope; no destiny framing, no invented feelings.
- RR-6 — caution state advisory only; never gates execution. Athlete-reported pain outranks inferred mechanical state.
- RR-8 — life-context never authors organism truth.
- RR-9 — recruiting card visibility off by default; explicit opt-in required at the mount surface; minor-athlete supremacy assumed at the parent consent layer.
- Demo↔production firewall inherited via `prepareRows`.

## Deferred to Wave B (HUAC substrate)

- Universal `<UniversalReportCard />` component family and `ReportCardContract`.
- Pillar mapping (PIE V2 → 8 pitching pillars).
- Shared `HammerBrief` slot renderer replacing `PieV2HammerBriefPanel`.
- Detailed Analysis ↔ Report Card toggle on the pitching analysis route.

Wave B is unblocked. Wave C (HIE) does not begin until Wave B is sealed.
