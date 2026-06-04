# Unified Constitutional Plan — PIE V2 Completion + HIE + Universal Report Card

## Part 1 — PIE V2 Completion Audit (verified from filesystem)

| Item | Status | Evidence |
|---|---|---|
| `pie-v2-constitution.md` | COMPLETED | file present |
| `pie-v2-integration-map.md` | COMPLETED | file present |
| `pieV2/types.ts` (13 signals, provenance, confidence, missingness) | COMPLETED | present |
| `data/baseball/pieV2Signals.ts` | COMPLETED | present |
| `pieV2/scoring.ts` (deterministic, pinned engine_version) | COMPLETED | present |
| `pieV2/aggregate.ts` (session weighted mean + fatigue slope) | COMPLETED | present |
| `pieV2/emit.ts` (canonical `pitching.v2.*`) | COMPLETED | present |
| `pieV2/__tests__/scoring.test.ts` | COMPLETED | present (scoring only) |
| `PitchingV2MicroInput.tsx` capture component | COMPLETED | present |
| `PieV2FrameTagger.tsx` video annotation → emit | **NOT STARTED** | missing |
| `useMicroLayerInput` extension for PIE V2 fields | **NOT STARTED** | not referenced |
| `pieV2/athleteState.ts` (priors + caution channel) | COMPLETED | present |
| `pieV2/aiHammerTalkingPoints.ts` | COMPLETED (substrate); **NOT WIRED** into actual AI Hammer surface |
| `pieV2DrillCatalog.ts` (52 drills) | COMPLETED | present |
| `pieV2VideoCatalog.ts` (65 videos) | COMPLETED | present |
| `recommendDrills.ts` / `recommendVideos.ts` | COMPLETED | present |
| `analysisToTaxonomy.ts` integration of PIE V2 bucket | **NOT STARTED** | no reference |
| `usePitchingV2Trends.ts` longitudinal hook | COMPLETED | present |
| `pieV2/longitudinal.ts` | COMPLETED | present |
| `pieV2/injuryDetection.ts` (RR-6 advisory) | COMPLETED | present |
| `PieV2CoachPanel.tsx` | COMPLETED (component); **NOT MOUNTED** in any route |
| `PieV2RecruitingCard.tsx` | COMPLETED (component); **NOT MOUNTED** in any route |
| Wave 6 schema (`pie_v2_signals`, `pie_v2_caution_state` JSONB) | **NOT STARTED** | no migration |
| `asbInvariantChecks.ts` PIE V2 updates | **NOT STARTED** |
| Replay determinism tests for PIE V2 | **NOT STARTED** |
| Final sealed ratification entry in `.lovable/plan.md` | **NOT STARTED** |

**Verdict:** Waves 0, 1, 3, 5 substrate ~complete. **Wave 2 partial** (capture done, frame tagger + hook extension missing). **Wave 4 partial** (catalogs + recommenders done, `analysisToTaxonomy` not integrated). **Wave 6 not started.** Coach + recruiting components built but **never mounted into the app**.

---

## Part 2 — Unified Constitutional Architecture

All three programs (PIE V2 finish, HIE, Universal Report Card) ship under a single sealed constitutional umbrella: **Hammers Universal Analysis Constitution (HUAC v1.0.0)**. Subordinate to Eternal Laws, Megaphase 151–160, RR-5/6/8, replay legality, demo↔production firewall. Engine versions pinned: `pie-v2.0.0`, `hie-v1.0.0`, `huac-v1.0.0`.

### 2.1 Universal Report Card (UHRC) — the new primary analysis surface

One component family `<UniversalReportCard />` driven by a sport-agnostic contract:

```text
ReportCardContract {
  engine_version, sport, discipline,
  pillars: Pillar[]            // 6–8 max
  corrective_priorities: PriorityItem[]   // top 3, ranked
  ai_hammer_brief: HammerBrief // ordered exactly per spec
  trend_window: '7d'|'30d'|'90d'
  toggles: { detailed_view_route }
}
Pillar { id, label, score_0_10, meter_state, pass_fail_components[],
         trend: 'up'|'flat'|'down', priority_rank,
         drilldown: { explanation, why_it_matters, drills[], videos[], history[] } }
```

Every analysis system (PIE V2, HIE, future) implements an adapter producing this contract. View toggle (Report Card ↔ Detailed) lives in a shared header component.

### 2.2 AI Hammer Standardization

Single `HammerBrief` schema, fixed slot order, no free-form prose outside slots:
`report_card → biggest_win → biggest_leak → priority_fix → why_it_matters → drill → video → trend`.
Deterministic envelope (LLM may only rephrase within slot). RR-5 compliant.

### 2.3 PIE V2 → Pillar mapping (8 pillars)

| Pillar | Source signals |
|---|---|
| Sequencing | separation, tempo |
| Energy Transfer | energy_angle, stride |
| Stability | head_stability, visual_stability |
| Direction | hip_alignment, front_side |
| Repeatability | within-session variance across all scored signals |
| Release Integrity | head_alignment, shoulder_level |
| Command Potential | visual_stability + repeatability composite |
| Velocity Potential | energy_angle + stride + separation composite |

Pillar scoring is pure derivation from existing `PieV2SessionAggregate`; no new measurements.

### 2.4 Hitting Intelligence Engine (HIE v1.0.0)

New `src/lib/hie/` mirroring PIE V2 architecture. Foundation model = 4 phases (P1 STABILIZE, P2 HAND LOAD, P3 BACK HIP DIRECTION, P4 HITTER'S MOVE) plus additional checkpoints (shoulder level at footstrike, hands position, head stability, separation integrity, landing posture, launch position).

**HIE Pillars (8):** Stability, Load Quality, Separation, Timing, Launch Position, Barrel Delivery, Contact Efficiency, Repeatability.

Each P-phase has non-negotiable pass/fail components + negotiable magnitude components per user spec.

### 2.5 Hitting Taxonomy Correction

Audit all hitting videos / drills / recommendations / taxonomy rows. Produce `docs/asb/hie-taxonomy-mismatch-report.md` mapping current content to P1/P2/P3/P4. Apply corrections via deterministic migration script that updates `video_tag_assignments`, `video_tag_rules`, `drillDefinitions`, and any hitting-recommendation modules. No silent reclassification — every change emits a `hitting.taxonomy.correction` event with before/after.

---

## Part 3 — System Impact Map

| System | PIE V2 finish | HIE | UHRC |
|---|---|---|---|
| Database | +2 JSONB cols on `performance_sessions`, `athlete_foundation_state` | +2 JSONB cols (hie_signals, hie_caution_state) | none (pure derivation) |
| ASB topics | `pitching.v2.*` | `hitting.v1.*` | none |
| Athlete State | adds caution priors | adds caution priors | none |
| Drill library | catalog already exists, wire recommender | new 32-drill catalog (4 phases × 8 tiers) + recommender | surfaces drills via pillar drilldown |
| Video library | catalog exists, wire recommender + retag audit | new 40-video catalog + tagging correction migration | surfaces videos via pillar drilldown |
| Coach dashboard | mount `PieV2CoachPanel` | mount `HieCoachPanel` | unified `<UniversalReportCard />` page |
| Recruiting | mount `PieV2RecruitingCard` (RR-9 gated) | mount `HieRecruitingCard` (RR-9 gated) | unified card variant |
| AI Hammer | wire `aiHammerTalkingPoints` into existing Hammer surface | new `hammerTalkingPoints` | standard `HammerBrief` slot renderer |
| `analysisToTaxonomy` | add pitching.v2 bucket | add hitting.v1 bucket | reads via adapter |
| Demo↔prod firewall | already inherited | inherited via `prepareRows` | inherited |

---

## Part 4 — Exact Implementation Order (no incremental rollout)

**Wave A — PIE V2 closeout (sealed first, no HIE work begins until A done)**
1. `PieV2FrameTagger.tsx` + `useMicroLayerInput` extension.
2. `analysisToTaxonomy.ts` PIE V2 bucket integration.
3. Mount `PieV2CoachPanel` on `CoachAthleteDetail` (toggle gated); mount `PieV2RecruitingCard` on recruiting profile (RR-9 gated).
4. Wire `aiHammerTalkingPoints` into the live AI Hammer surface behind `HammerBrief` slot contract.
5. Schema migration: `pie_v2_signals` (JSONB) on `performance_sessions`, `pie_v2_caution_state` (JSONB) on `athlete_foundation_state`. Grants + RLS verified.
6. `asbInvariantChecks.ts` updates + replay determinism tests for scoring, aggregate, longitudinal.
7. Sealed ratification entry in `.lovable/plan.md`.

**Wave B — HUAC substrate (Universal Report Card)**
8. `docs/asb/huac-constitution.md` + `docs/asb/huac-integration-map.md`.
9. `src/lib/huac/`: `types.ts` (ReportCardContract, Pillar, HammerBrief), `pillarMath.ts`, `hammerBriefBuilder.ts`, tests.
10. `src/components/report-card/UniversalReportCard.tsx` + `ReportCardHeader` (view toggle) + `PillarCard` + `PillarDrilldownSheet` + `HammerBriefPanel`.
11. PIE V2 → UHRC adapter (`src/lib/pieV2/uhrcAdapter.ts`) emitting 8 pitching pillars.
12. Mount Report Card view on the existing pitching analysis route with toggle to Detailed Analysis.

**Wave C — HIE substrate**
13. `docs/asb/hie-constitution.md` + `docs/asb/hie-integration-map.md` (P1–P4 model, checkpoints, RR-5/6/8 compliance).
14. `src/lib/hie/`: `types.ts`, `signals.ts` (P1–P4 + checkpoints), `scoring.ts`, `aggregate.ts`, `emit.ts` (`hitting.v1.*`), `athleteState.ts`, `longitudinal.ts`, `injuryDetection.ts`, tests.
15. `src/data/baseball/hieDrillCatalog.ts` (32) + `hieVideoCatalog.ts` (40) + `recommendDrills.ts` + `recommendVideos.ts`.
16. `HitterV1MicroInput.tsx` + `HieFrameTagger.tsx` + `useHittingV1Trends.ts`.
17. `HieCoachPanel.tsx` + `HieRecruitingCard.tsx` (RR-9 gated); mount in coach + recruiting routes.
18. HIE → UHRC adapter; Report Card variant for hitting (8 pillars).
19. `aiHammerTalkingPoints` for hitting; slot into shared `HammerBrief`.
20. Schema: `hie_signals` JSONB on `performance_sessions`, `hie_caution_state` JSONB on `athlete_foundation_state`.

**Wave D — Hitting Taxonomy Correction**
21. Read-only audit script → `docs/asb/hie-taxonomy-mismatch-report.md` (COMPLETED / PARTIAL / MISCLASSIFIED per row).
22. Deterministic correction migration: updates `video_tag_assignments`, `video_tag_rules`, `drillDefinitions` (hitting). Every change emits `hitting.taxonomy.correction` event with before/after lineage.
23. Re-verify against report; seal `hie-taxonomy-correction-ratification.md`.

**Wave E — UX Consistency Sweep**
24. Replace all bespoke analysis headers with shared `ReportCardHeader`. Remove duplicate scoring surfaces. Single visual + scoring + recommendation language. Toggle Report Card ↔ Detailed everywhere.
25. Replay determinism tests across PIE V2 + HIE + UHRC adapters at pinned engine_version triple.
26. Final sealed ratification: `huac-launch-ratification.md` + `.lovable/plan.md` entry.

**Hard rule:** no wave begins until prior wave's ratification is sealed. No incremental rollout of UHRC alone — pitching and hitting both ship under UHRC together at Wave E.

---

## Technical notes (engineering)

- All engine versions pinned constants; never read at runtime from config.
- All emissions ride canonical `emitAsbEvent` → `asb_events` + `asb_event_lineage`. Zero parallel storage.
- New JSONB columns are projection cache only; canonical truth = `asb_events`.
- All RLS: existing row-owner policies cover new columns; new tables N/A.
- RR-6 supremacy: caution/injury advisories never gate execution; athlete-reported pain outranks inferred state.
- RR-9 gating: recruiting cards opt-in, parent supremacy for minors.
- Demo↔prod firewall inherited via `prepareRows`; new topics namespaced `pitching.v2.*`, `hitting.v1.*`, `huac.*`.
- Tests: pure-function determinism, replay equivalence under fixed inputs, contract validation for `ReportCardContract`.

Approve to enter build mode and execute Wave A through Wave E in order.

---

## Wave A — SEALED 2026-06-04

Pitching Intelligence Engine V2 substrate ratified per `docs/asb/pie-v2-wave-a-ratification.md`.

Completed:
- `useMicroLayerInput` PIE V2 bag + `updatePieV2` helper
- `PieV2FrameTagger` video annotation → canonical emit
- `analysisToTaxonomy.ts` PIE V2 bucket (`mapPieV2SignalToMovement`, `pieV2SignalsToTaxonomyBucket`)
- `PieV2CoachPanel` + `PieV2HammerBriefPanel` mounted on `CoachAthleteDetail` (baseball-gated)
- `PieV2RecruitingCard` mounted behind RR-9 opt-in toggle
- Schema migration: `performance_sessions.pie_v2_signals` jsonb, `athlete_foundation_state.pie_v2_caution_state` jsonb
- Replay determinism tests at pinned `pie-v2.0.0`

Wave B (HUAC / Universal Report Card) unblocked. Wave C (HIE) gated by Wave B sealing.
