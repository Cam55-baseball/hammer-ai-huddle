# PIE V2 — Wave A Forensic Verification Audit

Scope: prove integration, not file existence. Wave B (HUAC) blocked until items in §7 are sealed.

---

## 1. Wave A forensic verification report

Legend: ✅ wired end-to-end · ⚠️ substrate only / not consumed · ❌ missing.

| Artifact | Path | Upstream | Downstream | Test | Replay | Prod status |
|---|---|---|---|---|---|---|
| Types | `src/lib/pieV2/types.ts` | — | all PIE V2 modules | typecheck | engine_version pinned `pie-v2.0.0` | ✅ |
| Scoring | `src/lib/pieV2/scoring.ts` | types | aggregate, emit | `scoring.test.ts` | ✅ deterministic test | ✅ |
| Aggregate | `src/lib/pieV2/aggregate.ts` | scoring | CoachPanel, HammerBrief, athleteState, recommenders | `replay.test.ts` | ✅ byte-equal | ✅ |
| Emit | `src/lib/pieV2/emit.ts` | scoring | `asb_events` ledger | ❌ no emit test | ⚠️ topic `pitching.v2.*` not lineage-verified | ⚠️ |
| Athlete state | `src/lib/pieV2/athleteState.ts` | aggregate, injuryDetection | `pie_v2_caution_state` JSONB | ❌ | ⚠️ projection not consumed by any UI | ⚠️ |
| Injury detection | `src/lib/pieV2/injuryDetection.ts` | aggregate, athlete-reported pain | athleteState | ❌ | ⚠️ safeguarding route not wired to Phase 31 escalation | ⚠️ |
| Recommend drills | `src/lib/pieV2/recommendDrills.ts` | aggregate, drill catalog | none mounted | ❌ | ⚠️ no UI consumer | ⚠️ |
| Recommend videos | `src/lib/pieV2/recommendVideos.ts` | aggregate, video catalog | none mounted | ❌ | ⚠️ no UI consumer; not bridged to `videoRecommendationEngine` | ⚠️ |
| Longitudinal | `src/lib/pieV2/longitudinal.ts` | `asb_events` | `usePitchingV2Trends` | ❌ | ⚠️ replay-derived but untested | ⚠️ |
| Hammer talking points | `src/lib/pieV2/aiHammerTalkingPoints.ts` | aggregate | HammerBriefPanel | ❌ | ✅ deterministic envelope | ⚠️ |
| Drill catalog | `src/data/baseball/pieV2DrillCatalog.ts` | — | recommendDrills | ❌ coverage matrix | — | ⚠️ 52 slots — coverage of 13 signals × 4 tiers unverified |
| Video catalog | `src/data/baseball/pieV2VideoCatalog.ts` | — | recommendVideos | ❌ | — | ⚠️ 65 slots — same |
| Frame tagger | `src/components/micro-layer/PieV2FrameTagger.tsx` | `useMicroLayerInput.updatePieV2` | emit | ❌ | ❌ not mounted in any capture route | ❌ |
| Micro input | `src/components/micro-layer/PitchingV2MicroInput.tsx` | useMicroLayerInput | emit | ❌ | ❌ not mounted in pitching session route | ❌ |
| Coach panel | `src/components/coach/PieV2CoachPanel.tsx` | usePitchingV2Trends, aggregate | CoachAthleteDetail | ❌ render test | ⚠️ mounted but data path from sessions → aggregate not verified | ⚠️ |
| Hammer brief panel | `src/components/coach/PieV2HammerBriefPanel.tsx` | aggregate | CoachAthleteDetail | ❌ | ⚠️ aggregate prop source unverified | ⚠️ |
| Recruiting card | `src/components/recruiting/PieV2RecruitingCard.tsx` | aggregate | CoachAthleteDetail (RR-9 opt-in) | ❌ | ⚠️ opt-in toggle present, audit trail of opt-in not emitted as relational event | ⚠️ |
| Hook trends | `src/hooks/usePitchingV2Trends.ts` | `asb_events` query | CoachPanel | ❌ | ⚠️ | ⚠️ |
| Taxonomy bridge | `src/lib/analysisToTaxonomy.ts` | signals | video recommender | ❌ | ⚠️ mapping exists but not invoked in production recommend path | ⚠️ |
| Migration | `supabase/migrations/…_pie_v2_signals.sql` | — | `performance_sessions.pie_v2_signals`, `athlete_foundation_state.pie_v2_caution_state` | manual | — | ✅ schema deployed, ⚠️ no writer wired |

**Verdict:** substrate complete; **no end-to-end capture→ledger→aggregate→UI path is wired in production routes**. Wave A is **substrate-sealed, integration-incomplete**.

---

## 2. PIE V2 consumption matrix (13 signals × 12 surfaces)

A=capture B=storage C=scoring D=surface E=trend F=athlete-state G=AI Hammer H=drills I=videos J=recruiting K=coach K2=report card

| # | Signal | A | B | C | D | E | F | G | H | I | J | K | L (RC) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | energy_angle | ⚠️* | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | ❌ |
| 2 | visual_stability (eyes_on_target) | ⚠️* | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | ❌ |
| 3 | separation (shoulders closed) | ⚠️* | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | ❌ |
| 4 | tempo (≤1.05s) | ⚠️* | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | ❌ |
| 5 | stride (%BH) | ⚠️* | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | ❌ |
| 6 | head_stability (≤2%) | ⚠️* | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | ❌ |
| 7 | hip_alignment | ⚠️* | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | ❌ |
| 8 | front_side (glove in frame) | ⚠️* | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | ❌ |
| 9 | head_alignment (≤15° belly line) | ⚠️* | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | ❌ |
| 10 | shoulder_level (≤10°) | ⚠️* | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | ❌ |
| 11 | rear_foot_drag | ⚠️* | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | ❌ |
| 12 | release_extension (tracked) | ⚠️* | ✅ | ✅ tracked-only | ⚠️ | ✅ | ⚠️ advisory | ⚠️ | n/a | n/a | ⚠️ | ⚠️ | ❌ |
| 13 | arm_slot (tracked) | ⚠️* | ✅ | ✅ tracked-only | ⚠️ | ✅ | ⚠️ advisory | ⚠️ | n/a | n/a | ⚠️ | ⚠️ | ❌ |

*Capture exists in components but components are not mounted in any production pitching capture route. **Universally orphaned at capture-entry and report-card surfaces.**

---

## 3. Throwing efficiency hardening matrix (baseball + softball)

| Item | Baseball PIE V2 | Softball | Status |
|---|---|---|---|
| 1. Eyes on target @ peak leg lift | `visual_stability` (boolean eyes_on_target) | ❌ no softball engine | **Partial** — baseball-only; softball substrate absent |
| 2. Hips fire, shoulders closed to landing | `separation` (shoulders_closed_to_footstrike) | ❌ | Partial |
| 3. ≤1.05s lift→strike | `tempo` (leg_lift_to_footstrike_sec, threshold pinned) | ❌ | Partial |
| 4. Stride length + repeatability | `stride` (%BH + within-session variance via `consistency`) | ❌ | Partial; landing-spot repeatability not separately tracked — folded into `consistency` only |
| 5. Head stability ≤2% | `head_stability` (head_vertical_drop_pct) | ❌ | Partial |
| 6. Directional hip alignment | `hip_alignment` (hips_fired_toward_target boolean) | ❌ | Partial — boolean is coarse; no angular signal |
| 7. Front side control (glove in body frame) | `front_side` (glove_inside_frame boolean) | ❌ | Partial — Open→Target→Closed→Body sequence not modeled, lateral glove swing not detected |
| 8. Head alignment @ release ≤15° belly line | `head_alignment` (head_offset_from_belly_line_deg) | ❌ | Partial |
| 9. Shoulder level @ release ≤10° | `shoulder_level` (shoulder_horizontal_offset_deg) | ❌ | Partial |
| 10. Rear foot drag efficiency | `rear_foot_drag` (length + direction_clean) | ❌ | Partial |
| 11. Release extension consistency | `extension_consistency` tracked-only | ❌ | Partial |
| 12. Arm slot consistency | `arm_slot_consistency` tracked-only | ❌ | Partial |

**Gaps to seal before Wave B:**
- G1: Softball throwing has no PIE V2 mirror. Baseball-only constitution conflicts with the request that #1–#12 hold for both sports.
- G2: Front-side sequence (Open→Target→Closed→Body) and lateral-swing detection not modeled.
- G3: Hip direction is boolean; needs angular signal to enable trajectory.
- G4: Landing-spot repeatability not a first-class signal (currently inferred from `consistency`).

---

## 4. HIE readiness verification (pre-Wave C)

Code state: **HIE substrate does not exist yet** (no `src/lib/hie/`, no `src/data/baseball/hieFoundation.ts`). Verifications below are doctrinal readiness, not implementation.

| Phase | Requirement | Doctrine present | Code present |
|---|---|---|---|
| **P1 Stabilize** | stability, head control, rear-foot pressure scored + pass/fail + recommendation + report-card | ✅ in HUAC plan | ❌ |
| **P2 Hand Load** | bow-and-arrow, scap load, barrel-behind-head, head/forward drift, load integrity | ✅ in HUAC plan | ❌ |
| **P3 Back Hip Direction** | hip→release vector, front shoulder closed, separation, landing posture, launch position | ✅ | ❌ |
| **P4 Hitter's Move** | knob retention, elbow path, hand path, barrel delivery, contact efficiency, palms-up/down, fair-territory delivery | ✅ | ❌ |

**Verdict:** HIE is **doctrinally specified but uncoded**. Wave C must produce a `hie/` parallel to `pieV2/` with identical replay/lineage discipline.

---

## 5. Universal Report Card (UHRC) pillar mapping

Proposed canonical pillars (6, capped for cognitive load):

| # | Pillar | Pitching (PIE V2) | Hitting (HIE) | Softball Throwing | Future systems |
|---|---|---|---|---|---|
| 1 | **Sequencing** | tempo, separation, hip_alignment | P3 back-hip direction, separation | mirror PIE V2 | movement-chain signals |
| 2 | **Stability** | visual_stability, head_stability, head_alignment | P1 head control, rear-foot pressure | mirror | balance/posture signals |
| 3 | **Direction** | hip_alignment, energy_angle, rear_foot_drag direction | P3 hip-to-launch vector | mirror | trajectory signals |
| 4 | **Load / Repeatability** | stride, rear_foot_drag length, consistency | P2 hand load, load integrity | mirror | load-pattern signals |
| 5 | **Delivery / Finish** | front_side, shoulder_level, extension, arm_slot | P4 knob/elbow/hand/barrel path, palms relationship | mirror | finishing signals |
| 6 | **Outcome Integrity** | composite + outcome-tag lineage | contact efficiency + fair-territory delivery | mirror | outcome signals |

**Orphan / duplicate / conflict audit:**
- No PIE V2 signal is orphaned — each maps to exactly one pillar.
- No HIE phase is orphaned — P1→2, P2→4, P3→1+3, P4→5+6.
- No duplicate scoring: each signal contributes weight to exactly one pillar (separation appears in Sequencing only; hip_alignment appears in Direction only — even though both reference hips).
- No conflict: composites computed at pillar level, never cross-pillar.
- Cognitive load: 6 pillars ≤ 7±2; one-line label + score + tier per pillar.

---

## 6. Architectural bypass audit

Possible bypass paths discovered:

| # | Bypass | Where | Seal |
|---|---|---|---|
| B1 | Components write `pie_v2_signals` JSONB directly without `emitPieV2RepScore` | future writers | **Constitutional rule:** projection columns are read-only outside the emit pipeline; enforce via DB trigger that rejects writes not stamped with `engine_version`. |
| B2 | Video recommender consumes raw signals instead of `analysisToTaxonomy` bridge | `videoRecommendationEngine` callers | Force all PIE V2→video paths through `pieV2SignalsToTaxonomyBucket`. |
| B3 | AI Hammer free-form prose around PIE V2 talking points | future Hammer surfaces | All Hammer output for PIE V2 signals must originate from `talkingPointsForSession`; lint rule forbidding string concatenation around signal labels. |
| B4 | Recruiting card surfaces signals without RR-9 opt-in event | future recruiting routes | Mount must emit `relational.exposure.opt_in` ledger event; render guarded by query of that event, not local boolean. |
| B5 | Athlete-state writer bypasses `pie_v2_caution_state` and writes to legacy state | future state-engine refactors | Caution projection is single-writer (`pieV2/athleteState.ts`); add invariant test. |
| B6 | Injury advisory routed to UI without safeguarding orchestration | future injury surfaces | All `arm_health_caution` surfaces must traverse Phase 31 safeguarding sub-route (RR-6 supremacy). |
| B7 | UHRC pillar score computed outside canonical pillar reducer | future report-card consumers | Single reducer `uhrc/computePillars.ts`; report cards may only render its output. |

---

## 7. Remaining risks (blocking Wave B)

1. **Capture surfaces unmounted** — `PieV2FrameTagger` and `PitchingV2MicroInput` exist but are not rendered in any pitching capture route. No production data can enter the engine.
2. **Emit not lineage-verified** — `emitPieV2RepScore` lacks a test proving `asb_events` lineage parents resolve and `engine_version` stamps round-trip.
3. **Projection caches have no writer** — `pie_v2_signals` and `pie_v2_caution_state` columns exist but nothing writes to them on session close.
4. **CoachPanel data path unproven** — `usePitchingV2Trends` queries the ledger; no fixture proving signals show up after a real capture session.
5. **Safeguarding route not wired** — injury detection produces advisories but they do not reach the safeguarding orchestration route.
6. **Drill/video catalog coverage matrices unaudited** — 52/65 slots claimed but no test asserts every (signal × tier) cell is filled.
7. **Softball throwing parity absent.**
8. **RR-9 opt-in not ledger-backed.**

---

## 8. Constitutional hardening recommendations (Wave A.5 — pre-Wave B)

Sequenced; each item produces evidence, not just code.

**A.5.1 Capture mount + emit lineage**
- Mount `PieV2FrameTagger` and `PitchingV2MicroInput` in the pitching session capture route.
- Add `emit.test.ts` proving: rep input → `asb_events` row with `topic='pitching.v2.rep_score'`, parent lineage to session event, `engine_version='pie-v2.0.0'`, replay-safe payload.

**A.5.2 Projection writer**
- Add `pieV2/persistSession.ts` that, on session close, writes aggregate to `performance_sessions.pie_v2_signals` and caution state to `athlete_foundation_state.pie_v2_caution_state`. Single-writer invariant test.

**A.5.3 Coach data path proof**
- Fixture test: seed 3 reps → emit → aggregate → `usePitchingV2Trends` returns expected series → `PieV2CoachPanel` renders all 13 signals.

**A.5.4 Safeguarding wire**
- Route `arm_health_caution` through Phase 31 safeguarding sub-route; emit `relational.safeguarding.signal` event; never surface caution UI without traversing the route.

**A.5.5 Catalog coverage matrix**
- `pieV2DrillCatalog.test.ts` asserts every (signal × tier) cell is filled; same for videos.

**A.5.6 Softball throwing parity (G1)**
- Create `src/lib/pieV2-softball/` mirroring baseball with identical signal set 1–13 and engine_version `pie-v2-sb.0.0`. Same emit topic prefix `pitching.v2.softball.*`. Same scoring discipline. Required because items 1–12 are sport-agnostic mechanical truths.

**A.5.7 Front-side & directional refinement (G2–G4)**
- Extend `front_side` with sequence-state signal (Open→Target→Closed→Body) and lateral-swing detection.
- Promote `hip_alignment` from boolean to angular degrees.
- Promote landing-spot repeatability to a first-class signal `landing_repeatability` (scored from across-rep stride end-point variance).

**A.5.8 Bypass seals (B1–B7)**
- DB trigger rejecting non-engine writes to projection columns.
- Lint rule on Hammer prose.
- RR-9 opt-in ledger event + render guard.
- Invariant tests for single-writer state and pillar reducer.

**A.5.9 UHRC pillar reducer skeleton (Wave B entry condition, not Wave B itself)**
- `src/lib/uhrc/computePillars.ts` with pure mapping from PIE V2 + HIE (when present) into the 6 pillars. Used to prove no orphans/duplicates at type level.

---

## 9. Wave B entry gate

Wave B (HUAC / Universal Report Card) begins **only after** A.5.1–A.5.5 produce green evidence and A.5.6–A.5.8 are sealed in code (A.5.9 is the handoff). Until then, HUAC would consume an engine that has no production data flowing through it.

---

## 10. Technical appendix (file deltas at Wave A.5 close)

```text
src/lib/pieV2/
  emit.ts                         (+ lineage test)
  persistSession.ts               (NEW — single projection writer)
  __tests__/emit.test.ts          (NEW)
  __tests__/persistSession.test.ts(NEW)
  __tests__/catalogCoverage.test.ts (NEW — drills + videos)
src/lib/pieV2-softball/           (NEW — mirror of pieV2/)
src/lib/uhrc/
  computePillars.ts               (NEW — skeleton reducer)
  __tests__/pillarMapping.test.ts (NEW — orphan/duplicate guard)
src/components/micro-layer/
  PitchingV2MicroInput.tsx        (mounted in capture route)
  PieV2FrameTagger.tsx            (mounted in capture route)
src/pages/<pitching capture route>.tsx  (edited to mount)
src/lib/safeguarding/             (route arm_health_caution through Phase 31)
supabase/migrations/<new>.sql     (trigger: projection columns single-writer + engine_version stamp required)
docs/asb/pie-v2-wave-a5-hardening.md (NEW ratification doc)
.lovable/plan.md                  (Wave A.5 sealed; Wave B unblocked)
```

Approve to proceed with Wave A.5 hardening, after which Wave B (HUAC) opens.
