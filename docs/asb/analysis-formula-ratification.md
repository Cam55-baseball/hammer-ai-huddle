# Analysis Engine, Report Card System & Correction Engine — Ratification Audit

**Date:** 2026-06-08
**Phase:** A (audit-only, no code changes)
**Status:** Awaiting user sign-off before Phase B
**Constitutional subordination:** Eternal Laws + all immutable invariants Phases 1–151. Additive-only. Replay-safe. Missingness preserved. No certainty fabrication.

---

## 0. Why this document exists

The user (system owner) escalated a major interpretation gap:

1. The **Universal Hammer Report Card (UHRC)** has been misidentified as "the report card." It is not. UHRC is a cross-discipline pillar projection.
2. Real **per-analysis report cards** (Baseball Pitching, Baseball Hitting, Softball Hitting, Baseball Throwing, Softball Throwing, Softball Pitching) **do not exist** in the codebase. They were never built.
3. The **standards** the user previously declared — for pitching, hitting, and throwing — exist in the codebase to varying degrees of completeness. This document **proves** which.
4. The **correction engine** is partially implemented (registry-level root_causes / teaching_progression for pitching; full causal chains for hitting) but is not surfaced as a unified athlete-legible correction loop.

This audit is the prerequisite for any further work. Nothing in the implementation phases (B–F) begins until the user signs off on this document.

---

## 1. Per-system canonical mapping

### 1.1 Baseball Pitching — **PRESENT, REPLAY-SAFE**

**Authority files:**
- `src/data/baseball/pieV2Signals.ts` (305 lines) — signal definitions, target/acceptable bands, root causes, teaching progressions, composite weights.
- `src/lib/pieV2/scoring.ts` (205 lines) — pure deterministic scorers per signal, version-pinned at `PIE_V2_ENGINE_VERSION`.
- `src/lib/pieV2/aggregate.ts` (150 lines) — session aggregate + composite score.
- `src/lib/pieV2/recommendDrills.ts` (105 lines) — drill recommendations from signal tier.
- `src/lib/pieV2/recommendVideos.ts` (89 lines) — video recommendations from signal tier.
- `src/lib/pieV2/longitudinal.ts` — trend tracking.
- `src/data/baseball/pieV2DrillCatalog.ts` — drill catalog.
- `src/data/baseball/pieV2VideoCatalog.ts` — video catalog.

**Standard-by-standard proof** (user-declared standards mapped to file:line and engine field):

| # | User-Declared Standard | Engine ID | Target | Acceptable | File:Line | Scored? | Weight |
|---|---|---|---|---|---|---|---|
| 1 | Energy Angle | `energy_angle` | 25° | ≥18° | `pieV2Signals.ts:36` | ✅ scored | 12 |
| 2 | Eyes On Target | `visual_stability` | locked through lift | no break before forward move | `pieV2Signals.ts:57` | ✅ scored | 7 |
| 3 | Hip/Shoulder Separation | `separation` | hips lead, shoulders closed to foot plant | no early shoulder opening | `pieV2Signals.ts:78` | ✅ scored | 14 |
| 4 | Timing (1.05 s or less) | `tempo` | ≤1.05 s | ≤1.20 s | `pieV2Signals.ts:99` | ✅ scored | 10 |
| 5 | Stride Length | `stride` | (see file) | (see file) | `pieV2Signals.ts:120` | ✅ scored | 10 |
| 6 | Stride Consistency | folded into `extension_consistency` | — | — | `pieV2Signals.ts:259` | tracked_only | 0 |
| 7 | Posture Stability | `head_stability` | (head ≤2% vertical drift) | — | `pieV2Signals.ts:140` | ✅ scored | 8 |
| 8 | Front Side Control | `front_side` | glove inside body frame | — | `pieV2Signals.ts:179` | ✅ scored | 9 |
| 9 | Head Direction | `head_alignment` | ≤15° off belly-button at release | — | `pieV2Signals.ts:199` | ✅ scored | 7 |
| 10 | Shoulder Plane | `shoulder_level` | horizontal ≤10° | — | `pieV2Signals.ts:219` | ✅ scored | 7 |
| 11 | Rear Foot Drag | `rear_foot_drag` | — | — | `pieV2Signals.ts:239` | ✅ scored | 7 |
| — | Hip alignment to target | `hip_alignment` | hips fire in line with target | — | `pieV2Signals.ts:160` | ✅ scored | 9 |
| — | Arm slot consistency | `arm_slot_consistency` | — | — | `pieV2Signals.ts:279` | tracked_only | 0 |

**Composite weights** sum to 100 across the 11 scored signals.

**Pipeline:** signal definitions → `scoring.ts` per-rep deterministic scorers → `aggregate.ts` session aggregate → `recommendDrills.ts` + `recommendVideos.ts` outputs → `persistSession.ts` writes to `performance_sessions_ledger` + `asb_events` (`pitching.v2.*` topic).

**Verdict:** ✅ **Every user-declared pitching standard exists in the formula engine** with a target band, scoring function, drill mapping, video mapping, and replay-safe ledger emission.

**Gap:** No per-analysis Athlete-View Report Card surface. Output today renders inside coach panels (`PieV2CoachPanel.tsx`) and a recruiting card. There is no parent/athlete-legible 1–10 / pass-fail / degree / timing display.

---

### 1.2 Baseball/Softball Hitting — **PRESENT but TAGGING CONFLICT**

**Authority files (correct doctrine):**
- `src/lib/hittingPhases.ts` (298 lines) — phase definitions: P1 Hip Load (NN, cap 80) · P2 Hand Load (cap 85) · P3 Stride/Landing (cap 75) · P4 Hitter's Move (NN, cap 50). Includes failure symptoms, style variants, slap-context detection (`isSlapContext`, `evaluateSlapEliteGates`), elite gate logic.
- `src/lib/hittingCausalChains.ts` (219 lines) — full **athlete + coach_note** causal chains per phase: `trigger / cause / mechanism / result / fix`. Also includes 4-step **roadmaps** per phase (`feel / iso / constraint / transfer`) with drill ids and athlete cues.
- `supabase/functions/_shared/hittingPhases.ts` + `hittingCausalChains.ts` — edge-function mirrors.

**Conflicting tagging registry:**
- `src/lib/formulaPhases.ts:31-35` declares the Video Library tagger taxonomy as:
  ```ts
  { id: 'p1_hip_load',       label: 'P1 Hip Load' },
  { id: 'p2_heel_plant',     label: 'P2 Heel Plant' },     // ❌ should be P2 Hand Load
  { id: 'p3_launch',         label: 'P3 Launch' },         // ❌ should be P3 Stride
  { id: 'p4_hitters_move',   label: "P4 Hitter's Move" },
  ```

**Production database tag inventory (`library_videos.formula_phases`):**

| Tag | Video count |
|---|---|
| `{p1_hip_load}` | 1 |
| `{p4_hitters_move}` | 1 |
| `{p2_heel_plant}` | **0** |
| `{p3_launch}` | **0** |

✅ **No production video uses the conflicting tags.** Migration is mechanically free; we only need to rewrite `formulaPhases.ts` and the edge-function mirror, plus rename any internal references. **Zero remap of actual data is required.**

**Pipeline:** `hittingPhases.attributePhaseFromSymptoms()` and `prioritizePhasesForRoadmap()` consume failure symptoms → render in `HittingCausalChainCard.tsx`, `HittingDoctrineBlock.tsx`, `HittingRoadmapLadder.tsx`, `HittingRecruitingCard.tsx`. Drill recommendations flow from `PHASE_ROADMAPS[].drillId` to existing drill surfaces.

**Verdict:** ✅ Doctrine fully encoded. ❌ Tagger taxonomy is **out of date** but unused. Easy migration.

**Gap:** No per-analysis Athlete-View Report Card. Causal chains and roadmaps render in technical components, not in a parent-friendly 1–10/pass-fail surface.

---

### 1.3 Baseball/Softball Throwing — **GAP: NO MEASUREMENT STANDARDS**

**Present:**
- `src/lib/formulaPhases.ts:38-43` declares 4 phase tags only (`th_p1_grip_setup`, `th_p2_stride`, `th_p3_lateral_shoulder`, `th_p4_release`). Used for video tagging.

**Absent:**
- No `throwingSignals.ts` registry.
- No per-signal scoring function.
- No drill or video recommendation engine specific to throwing measurements.
- No aggregate, no longitudinal, no replay-safe ledger emission topic.

**User-supplied standards (provided 2026-06-08, this sprint):**
| # | Standard | Target / band |
|---|---|---|
| 1 | Eyes on target at peak leg lift before moving forward | Eyes locked on target through lift |
| 2 | Hips fire & shoulders stay closed (no shoulder rotation open before landing) | Hips lead, shoulders closed to foot plant |
| 3 | Stride length vs height + consistency | ≥100% height (back ankle at foot raise → front ankle at landing); consistent across pitches |
| 4 | Head on stable vertical line throughout delivery | ≤2% vertical movement |
| 5 | Hips fully fired in line with target & shoulders still closed | Hips aligned to target; shoulders closed until landing |
| 6 | Front-side glove control (fascial activity; glove involuntary back, pinky to body, within shoulder frame) | Glove stays within frame of body |
| 7 | Head at release ≤15° off belly-button line | 1° off doubles head weight; each degree of L/R head movement = 2" off extension length |
| 8 | Shoulders horizontal at release | ≤10° tilt; eyes level laterally |

These are pitcher-specific in language ("extension to the plate"). **Open question (Q2 in plan):** branch by position (pitcher vs catcher vs infielder vs outfielder) or one universal v1?

**Verdict:** ❌ **Throwing formula engine does not exist.** Phase D will build it modeled exactly on PIE V2 (same shape: `target / acceptable / measurement / purpose / common_deficiencies / root_causes / teaching_progression / composite_weight`), pinned at `THROWING_V1_ENGINE_VERSION`.

---

### 1.4 Softball Pitching — **GAP: NO STANDARDS YET**

- `src/data/softball/` has velocity bands, drill defs, outcome tags, steal analytics. No equivalent of PIE V2.
- Windmill mechanics require their own measurement set.
- **User declared:** "Softball pitching has its own standards" — will be provided in a follow-up sprint.

**Verdict:** ❌ Out of scope this sprint. Deferred.

---

### 1.5 UHRC (Universal Hammer Report Card) — **MISALIGNED, TO BE REMOVED**

**Authority files:**
- `src/lib/uhrc/types.ts` — 6 pillars: `mechanics / command / stuff / movement_quality / decision_quality / durability`.
- `src/lib/uhrc/pillars.ts` (90 lines) — pillar definitions, sources from PIE V2 + HIE + foundation + athlete_state + longitudinal.
- `src/lib/uhrc/buildReport.ts` (226 lines) — projection builder.
- `src/lib/uhrc/generateHammerBrief.ts` — AI brief.
- `src/components/report-card/UhrcReportCard.tsx`, `UhrcAthleteSection.tsx`, `UhrcDetailedAnalysis.tsx` — render surfaces.

**Consumer surfaces (5):**
- `src/pages/AthleteCommand.tsx` — Command Center mount.
- `src/pages/ProgressDashboard.tsx`.
- `src/pages/CoachAthleteDetail.tsx`.
- `src/components/coach/PieV2HammerBriefPanel.tsx` — calls `generateHammerBrief`.
- Two test files.

**What UHRC actually is:** a cross-discipline organism-level pillar projection. NOT a per-analysis report card. The system owner confirms UHRC was a misinterpretation of the "report card" concept and authorizes deletion.

**Verdict:** ❌ Remove entirely in Phase B. Replace consumer mount points with a small "Open latest analysis report card" affordance once Phase F surfaces exist. For sites that need a cross-discipline summary (Progress Dashboard, Coach Athlete Detail), the existing PIE V2 longitudinal + hitting causal panels remain — no functionality lost because UHRC was a roll-up layer over those.

---

### 1.6 Correction Engine — **PARTIAL**

**Present in registry today:**
- Pitching (`pieV2Signals.ts`): each signal has `purpose`, `questions_engine_answers`, `required_outputs`, `ideal_pattern`, `common_deficiencies`, `root_causes`, `teaching_progression`.
- Hitting (`hittingCausalChains.ts`): each phase has full `trigger / cause / mechanism / result / fix` in both athlete and coach voice, plus 4-step roadmaps with drill ids and athlete cues.

**Missing for both:**
- No unified `correction` block shape: `{ what_happened, why_it_matters, how_it_affects_performance, how_to_fix, drill_ids[], video_ids[], roadmap_step, motivational_text }`.
- No motivational coaching paragraph per signal.
- No cached athlete-facing rendering of "what happened / why / how / fix / drills / videos / roadmap / motivation" as a single drawer.

**Decision (user-confirmed):** **Hybrid registry+AI**. Registry holds canonical facts (never AI-authored). AI writes ONLY the motivational paragraph, cached once per analysis row, never regenerated → replay-safe.

---

## 2. Proposed Display Format Table (awaiting your row-by-row ratification)

For each category, mark ✅ to approve or write a replacement format. Multiple formats per row are allowed (e.g. "raw + 1–10").

### 2.1 Baseball Pitching

| Standard | Engine ID | Proposed Athlete-View display | Approve? |
|---|---|---|---|
| Energy Angle | `energy_angle` | **Raw degrees** + 1–10 + pass-fail badge (pass if ≥18°) | ☐ |
| Eyes On Target | `visual_stability` | **Pass / Fail** badge (binary observation) | ☐ |
| Hip/Shoulder Separation | `separation` | **Pass / Fail** badge | ☐ |
| Timing | `tempo` | **Raw seconds (e.g. 1.07s)** + pass-fail at ≤1.05s + 1–10 | ☐ |
| Stride Length | `stride` | **% of height** + 1–10 | ☐ |
| Posture / Head Stability | `head_stability` | **% vertical drift** + pass-fail at ≤2% + 1–10 | ☐ |
| Hip Alignment | `hip_alignment` | **Pass / Fail** (in line with target) | ☐ |
| Front Side Control | `front_side` | **Pass / Fail** (glove within body frame) | ☐ |
| Head Direction | `head_alignment` | **Raw degrees off belly-button** + pass-fail at ≤15° + 1–10 | ☐ |
| Shoulder Plane | `shoulder_level` | **Raw degrees tilt** + pass-fail at ≤10° + 1–10 | ☐ |
| Rear Foot Drag | `rear_foot_drag` | **1–10** only (qualitative) | ☐ |
| **Overall Pitching Score** | composite | **0–100 percent** + letter grade + 1 motivational sentence | ☐ |

### 2.2 Baseball/Softball Hitting

| Phase | Proposed Athlete-View display | Approve? |
|---|---|---|
| P1 Hip Load (NN) | **Pass / Needs Work** + 1–10 (cap 80) + 1-line cue | ☐ |
| P2 Hand Load | **Pass / Needs Work** + 1–10 (cap 85) | ☐ |
| P3 Stride / Landing | **Pass / Needs Work** + 1–10 (cap 75) | ☐ |
| P4 Hitter's Move (NN) | **Pass / Needs Work** + 1–10 (cap 50; elite +5 bonus) | ☐ |
| **Overall Hitting Score** | weighted from 4 phases | **0–100** + letter grade | ☐ |

Notes:
- "NN" badge surfaces visually on P1 and P4 (non-negotiable).
- Slap-context auto-switches the P4 elite gate per `evaluateSlapEliteGates` (open Q3 — confirm auto-switch is desired).

### 2.3 Baseball/Softball Throwing (Phase D registry)

| Standard | Proposed Athlete-View display | Approve? |
|---|---|---|
| Eyes on target at peak lift | **Pass / Fail** | ☐ |
| Hips fire / shoulders closed | **Pass / Fail** | ☐ |
| Stride length vs height | **% of height** + pass-fail at ≥100% + 1–10 | ☐ |
| Stride consistency | **σ across reps** + 1–10 | ☐ |
| Head vertical stability | **% drift** + pass-fail at ≤2% + 1–10 | ☐ |
| Hips aligned to target | **Pass / Fail** | ☐ |
| Front-side glove control | **Pass / Fail** (within shoulder frame) | ☐ |
| Head at release | **Degrees off belly-button** + pass-fail at ≤15° + 1–10 | ☐ |
| Shoulder horizontal at release | **Degrees tilt** + pass-fail at ≤10° + 1–10 | ☐ |
| **Overall Throwing Score** | composite | **0–100** + grade | ☐ |

---

## 3. Conflicts & Gaps Summary

| # | Type | Description | Resolution Phase |
|---|---|---|---|
| C1 | Conflict | `formulaPhases.ts` hitting taxonomy (P2 Heel Plant / P3 Launch) contradicts canonical `hittingPhases.ts` (P2 Hand Load / P3 Stride). 0 production videos use the wrong tags. | C |
| G1 | Gap | No Throwing formula registry. 7 standards provided this sprint. | D |
| G2 | Gap | No Softball Pitching standards. Owner to provide. | DEFERRED |
| G3 | Gap | Correction engine lacks unified `{what/why/how/fix/drills/videos/roadmap/motivation}` block per signal. | E |
| G4 | Gap | No per-analysis Athlete-View Report Card UI. Only technical PIE V2 / hitting causal pages exist. | F |
| M1 | Misalignment | UHRC misidentified as "the report card"; it is a cross-discipline pillar projection. | B (delete) |

---

## 4. Open questions (user must answer before each Phase begins)

These are the same five from `.lovable/plan.md` §5, repeated here for sign-off.

1. **Display Format Table (§2 above)** — ratify each row, including the composite score format (0–100? Letter grade? Both?).
2. **Throwing position branching** — One universal Throwing Report Card v1, or branch by pitcher / catcher / infielder / outfielder?
3. **Hitting Slap variant** — Auto-switch when slap context detected (per `evaluateSlapEliteGates`), or always show standard P4?
4. **Motivational voice** — One coaching voice across all sports, or per-sport tone (e.g. softball hitting separate from baseball hitting)?
5. **Hitting tag migration confirmation** — Production has 0 videos tagged `p2_heel_plant` / `p3_launch`. Safe to overwrite the taxonomy with no data migration. Confirm?

---

## 5. Exit criteria for Phase A (this document)

- [x] Every user-declared pitching standard mapped to file:line.
- [x] Hitting phase doctrine + tagger conflict documented with production tag counts.
- [x] Throwing gap identified; 7 new user-supplied standards captured.
- [x] Softball pitching gap acknowledged + deferred.
- [x] UHRC misalignment documented + delete decision recorded.
- [x] Correction engine state documented; hybrid registry+AI decision recorded.
- [x] Display Format Table drafted with ratification checkboxes.
- [x] Conflicts & Gaps consolidated.
- [x] Open questions enumerated.
- [ ] **User sign-off pending — required before Phase B (UHRC deletion).**

---

## 6. Constitutional notes

- Every phase B–F output (registry blocks, AI motivational paragraphs, report card render) preserves missingness as a first-class state — never imputed, never smoothed, never collapsed into false certainty (EE-1, FC-3, FC-4, RE-5, SF-5, AR-3).
- AI motivational paragraphs are interpretive translations of replay-derived state per RW-4 (human coaching translation); they may never author organism truth, never substitute for canonical antecedents, and are cached once per analysis to preserve replay equivalence (RE-1, ES-5).
- Report Cards are derived projections over the canonical analysis ledger; they never write to `asb_events` and never mutate organism truth (DG-3, SG-3).
- Phase B (UHRC deletion) is constitutionally legal because UHRC is itself a derived projection with no ledger authorship — its removal does not break replay equivalence.
