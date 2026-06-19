# Phase 19 — Live Athlete Workflow Proof Audit

This audit evaluates operational workflow reality only. No architecture,
doctrine, governance, implementation, or remediation work is performed. No
metrics, detectors, anchors, validation rules, calibration rules, confidence
rules, gates, or governance are added. Every claim cites either an existing
canonical document or a repository path.

Citation keys:
- `arch`  = `.lovable/canonical-measurement-architecture.md`
- `bp`    = `.lovable/canonical-implementation-blueprint.md`
- `trace` = `.lovable/analysis-traceability.md`
- `auth`  = `.lovable/evidence-authority-resolution.md` (Cycle 6)
- `amd`   = `.lovable/canonical-authority-amendment.md`
- `clo`   = `.lovable/canonical-closure-audit.md`
- `p18`   = `.lovable/first-implementation-reality-audit.md`

---

## §1 — Audit Scope

In scope: the seven canonical artifacts (`arch`, `bp`, `trace`, `auth`, `amd`,
`clo`, `p18`) plus the live repository surfaces walked below. Expansion of the
canonical stack is forbidden by `amd §Impact Analysis` and reaffirmed by
`clo §7`; this phase performs no such expansion.

| Surface | Path |
|---|---|
| Athlete entry / mount order | `src/pages/AthleteCommand.tsx` |
| Onboarding | `src/components/hammer/HammerOnboardingChat.tsx`, `src/hooks/command/useAthleteOnboardingState.ts` |
| Daily plan surface | `src/components/hammer/HammerDailyPlan.tsx` |
| Ask-Coach surface | `src/components/hammer/HammerChat.tsx`, `src/hooks/useHammerChat.ts` |
| Evidence intake (video) | `supabase/functions/analyze-video/index.ts`, `src/lib/biomech/videoAcceptance.ts` |
| Report-card framework | `src/lib/reportCard/{types,metricReaders,grade,index}.ts`, `src/lib/reportCard/contracts/` |
| Discipline specs | `src/lib/reportCard/disciplines/{bp,bh,throwing}.ts` |
| Progress / trend | `src/hooks/useReportCardTrend.ts` |
| Intelligence hooks | `src/hooks/useMPIScores.ts`, `src/hooks/useHIESnapshot.ts`, `src/hooks/usePitchingV2Trends.ts` |
| Recommendation catalogs | `src/data/baseball/pieV2DrillCatalog.ts`, `src/data/baseball/pieV2VideoCatalog.ts`, `src/data/s2DrillRecommendations.ts` |
| Athlete-side UHRC | `src/components/report-card/UhrcAthleteSection.tsx` |

This audit reuses Phase 18's stage tagging (`p18 §2`) and tile inventory
(`p18 §3`) and does not re-derive them.

---

## §2 — Athlete Workflow Simulation

Single athlete walked end-to-end through the currently mounted surfaces in
`src/pages/AthleteCommand.tsx`.

| # | Stage | Status | Evidence |
|---|---|---|---|
| 1 | Athlete Entry | Implemented | `AthleteCommand.tsx` route + `useAuth` gating |
| 2 | Onboarding | Implemented (chat-driven) | `HammerOnboardingChat.tsx` self-hides on zero gaps; gate via `useAthleteOnboardingState.hasFirstEvent` |
| 3 | Assessment | Partial | `HammerOnboardingChat` collects context fields; no canonical evidence-intake form per `bp §H1`–`§H6` (per `p18 §6` Major Blocker 11) |
| 4 | Evidence Submission | Implemented (video only) | `supabase/functions/analyze-video/index.ts`, `videoAcceptance.ts` |
| 5 | Analysis Processing | Partial — AI-substituted | AI tool-call fills `metrics` directly (`analyze-video/index.ts` ~lines 1891–1894, 2237–2265 per `p18 §2`); no deterministic detector layer |
| 6 | Metric Generation | Partial — AI-only | `metrics` written to `videos.ai_analysis` as `MetricValue` records; not produced by certified `METRIC_ENGINE_VERSION` (still `@0.0.0-stub` per `p18 §1`, §6 Critical Blocker 1) |
| 7 | Report Card Generation | Implemented (UI) | Tile `compute(...)` in `src/lib/reportCard/disciplines/{bp,bh}.ts` reads `metrics` via `metricReaders.ts`; gracefully degrades to `status:"missing"` |
| 8 | Development Guidance | Implemented (static) | Per-tile `explainer` strings; `HammerDailyPlan.tsx`, `HammerChat.tsx` |
| 9 | Progress Tracking | Partial | `useReportCardTrend.ts` reads last N analyses for one module; no certified longitudinal surface (per `p18 §6` Major Blocker 10) |

No stage is fully Blocked at the UI level — every stage renders or degrades
visibly. The Critical-Blocker reality from `p18 §6` lives inside stages 5–6
(measurement is uncertified), not in workflow traversability.

---

## §3 — Data Flow Proof

| Stage | Input | Processing Layer | Output | Storage | Consumer |
|---|---|---|---|---|---|
| Entry | Auth session | `useAuth` | `user.id` | Supabase `auth.users` | All hooks |
| Onboarding | Chat replies | `HammerOnboardingChat` + onboarding director | `athlete_context` events | `asb_events` (per `useAthleteOnboardingState`) | `useHammerAthleteContext` |
| Evidence Submission | Uploaded video | `videoAcceptance.ts` → `analyze-video` edge function | AI tool-call args | `videos.ai_analysis` (jsonb) | `useReportCardTrend`, `UhrcAthleteSection` |
| Analysis | `videos.ai_analysis.metrics` | AI tool-call (no deterministic detector/anchor/metric engine) | `MetricsRecord` keyed by tile metric | `videos.ai_analysis` | Tile `compute()` |
| Report Card | `ai_analysis.metrics` | `getReportCardSpec` + `metricReaders.{readNumber,readScore100,readBool}` | `TileState[]` + `gradeFromTiles` | In-memory (React Query cache) | `UhrcAthleteSection`, `useReportCardTrend` |
| Guidance | Tile explainers + plan derivation | `HammerDailyPlan`, PIE v2 catalogs | UI text + drill/video chips | Static modules in `src/data/baseball/pieV2*` | Athlete UI |
| Progress | Most recent N `videos` rows | `useReportCardTrend.queryFn` | `TrendEntry[]` with `grade` | Query cache | Trend UI (if mounted) |

Observed broken / weak links (reality only, citations only):

- **AI-extractor → tile `compute()`** functions, but lineage from "athlete
  evidence → certified metric" is absent: no certificate, no
  `METRIC_ENGINE_VERSION` pin (`p18 §1`, `p18 §6` Critical Blockers 1–6).
- **`UhrcAthleteSection` removed from Command Center** (`AthleteCommand.tsx`
  comment: "UHRC report card removed from Command Center — now lives
  per-analysis under each video result"); the per-analysis mount point is the
  only path to a report card today.
- **`useReportCardTrend`** is implemented but not mounted from
  `AthleteCommand.tsx`; no athlete-visible longitudinal consumer in the
  current mount order.
- **Non-baseball/softball sports**: `UhrcAthleteSection` renders a visible
  "waiting on projector" card (lines ~83–104) — visible missingness, not a
  fabricated grade. Dead-end for that cohort.
- **Onboarding `athlete_context` events** flow to `useHammerAthleteContext`
  but do not gate or parameterize the AI extractor; intake context and
  analysis are not linked in the current code path.

---

## §4 — Report Card Proof

Per `p18 §3`, three discipline specs surface: `bpReportCard`, `bhReportCard`,
`throwingReportCard` (derived from BP). Reality of population today:

| Discipline | Data Source | Calculation | Explanation | Per-tile result today |
|---|---|---|---|---|
| BP (`disciplines/bp.ts`) | Partial — AI-emitted via `analyze-video` | Implemented — `compute(...)` via `metricReaders` | Implemented — `explainer` strings | Tiles render `pass/fail/elite/warn/missing` against AI-supplied values; `score_meter` + `raw_passed` + `pass_fail` modes from `types.ts` all execute |
| BH (`disciplines/bh.ts`, 449 lines, P1–P4 phased) | Partial — AI-emitted | Implemented | Implemented | Same as BP; gated by `groupByPhase: true` |
| Throwing (`disciplines/throwing.ts`, 21 lines) | Partial — subset of BP keys | Implemented (filtered) | Inherited from BP | Functional but minimal coverage (`p18 §6` Major Blocker 9) |

Per-category populated-state classification:

- **Fully populated (with uncertified data):** every tile whose AI-extracted
  metric key is present in `ai_analysis.metrics` and parses as a finite
  `MetricValue` — renders a real `TileState`.
- **Partially populated:** tiles where the AI returns `{ missing: true,
  missing_reason }` — `metricReaders.missingState` surfaces the reason
  verbatim.
- **Empty:** tiles whose key was not emitted at all — `compute()` returns
  `{ status: "missing" }` (no fabrication).
- **Placeholder-driven:** version triplet (`metrics@0.0.0-stub` per `p18 §1`)
  is a structural placeholder behind every populated tile; no tile has a
  certified data source today.

A report card **can** be generated today: the UI renders end-to-end. None of
the tiles are backed by certified measurement (`p18 §3`, §6 Critical
Blockers 1–7).

---

## §5 — Recommendation Proof

| Surface | Lineage | Classification |
|---|---|---|
| Per-tile `explainer.howToImprove` (discipline specs) | Hard-coded string in `bp.ts` / `bh.ts` / `throwing.ts` | Static |
| `HammerDailyPlan` (9-modality plan) | Derived by `useHammerNextStep` / daily plan hook against athlete context + signals | Rule-backed (uses live readiness/fatigue context; not tied to certified report-card metrics) |
| `HammerChat` answers | `useHammerChat` LLM with categoryFocus + identity | Rule-backed (prompt-scoped); content itself is model-generated, not evidence-deterministic |
| PIE v2 drill chips | `src/data/baseball/pieV2DrillCatalog.ts` (static map) surfaced via `DailyPlanVideoChips`/`pieV2VideoCatalog` | Static catalog + rule-backed selection |
| `s2DrillRecommendations` | `src/data/s2DrillRecommendations.ts` static map | Static |
| MPI / HIE / PIE v2 trend hooks | `useMPIScores`, `useHIESnapshot`, `usePitchingV2Trends` feed `UhrcAthleteSection`; only `UhrcAthleteSection` is downstream | Rule-backed (where mounted) |

Evidence-backed (certified): **none today** — there is no certified detector /
anchor / metric / confidence emission feeding any recommendation surface
(`p18 §5`, §6 Critical Blockers 1–7). Missing: a recommendation surface that
consumes certified report-card metrics.

Lineage trace ends at the AI tool-call output stored in `videos.ai_analysis`;
no recommendation surface today is downstream of certified evidence.

---

## §6 — Athlete Experience Audit

User-visible behavior of the currently mounted surfaces:

- **Empty state, non-baseball/softball:** `UhrcAthleteSection` shows the
  explicit "waiting on projector" card — visible missingness, athlete is not
  blocked but cannot get a report card.
- **Empty state, no analyses yet:** `useReportCardTrend.queryFn` returns
  `[]`; any consumer renders empty. `UhrcAthleteSection` early-returns
  `null` when `report` is null.
- **Empty state, analysis with no `metrics`:** tile `compute()` returns
  `{ status: "missing" }`; `gradeFromTiles` degrades gracefully. The trend
  hook flags `hasMetrics: false` and `grade: null` so the UI can offer a
  recompute affordance (comment in `useReportCardTrend.ts`), but no such
  affordance is mounted today.
- **Confusing transition:** Comment in `AthleteCommand.tsx` states the UHRC
  report card was removed from the Command Center and "now lives per-analysis
  under each video result" — athletes who expect a top-level report card on
  the command center will not find one.
- **Onboarding self-hide:** `HammerOnboardingChat` self-hides on zero gaps,
  but does not gate downstream surfaces beyond the `hasFirstEvent` redirect
  to `/onboarding/athlete`.
- **HammerChat error path:** `chat.error` rendered as a small destructive
  caption; no recovery flow beyond resubmit.
- **Confidence opacity:** Tiles surface `confidence` numerically via
  `TileState.confidence` but the value originates from the model
  self-report (`p18 §2` Confidence Production = Partial-AI-only) — athlete
  has no signal that the number is uncertified.
- **Broken loop:** Progress tracking exists as a hook but is not mounted
  from `AthleteCommand.tsx` — submitting more videos does not surface a
  visible trend on the command center.
- **Dead-end (per `p18 §6` Major Blocker 11):** onboarding does not enforce
  the canonical evidence intake form from `bp §H1`–`§H6`.

No outright crash paths were identified in the audited surfaces; degradations
are visible (missingness cards, `null` early-returns, `status:"missing"`
tiles).

---

## §7 — Operational Blocking Audit

Reality-only; no solutions proposed. Inherits and re-cites `p18 §6`.

### Critical (block real-world operational use)

1. No certified detector/anchor/metric/confidence layer — all measurements are
   AI-emitted (`p18 §6` Critical Blockers 1–7; this audit §2 stages 5–6,
   §3 broken-link 1, §5 lineage).
2. Version triplet pinned to `@0.0.0-stub` — no replay-safe pin governs
   produced metrics (`p18 §1`, §6 Critical Blocker 1).
3. Self-reported model confidence presented to athletes without an
   uncertified-data signal (this audit §6 Confidence opacity).

### Major (block confident athlete-facing workflow)

4. UHRC report card removed from Command Center; no athlete-visible top-level
   report-card surface (this audit §3, §6 Confusing transition).
5. `useReportCardTrend` implemented but not mounted from athlete pages — no
   visible longitudinal progress loop (this audit §3, §6 Broken loop;
   `p18 §6` Major Blocker 10).
6. Throwing discipline spec covers only a filtered subset of BP keys
   (`p18 §6` Major Blocker 9).
7. Onboarding does not enforce canonical intake per `bp §H1`–`§H6`
   (`p18 §6` Major Blocker 11; this audit §6 Dead-end).
8. Non-baseball/softball sports have no projector — visible missingness only
   (this audit §3, §6 Empty-state).

### Minor (degrade experience without blocking)

9. Static per-tile `explainer` copy — same text per athlete regardless of
   evidence (`p18 §6` Minor Blocker; this audit §5).
10. Softball-specific deltas not enumerated (`p18 §6` Minor Blocker).
11. Onboarding context not piped into the AI extractor (this audit §3
    broken-link 5).

---

## §8 — Internal Test Readiness Verification

**Answer: YES.**

Justification (evidence-based, reality-only):

- All nine workflow stages (§2) reach the UI; none crash and all degrade
  visibly when data is missing.
- A real athlete can sign in (`AthleteCommand.tsx` + `useAuth`), complete
  onboarding (`HammerOnboardingChat` + `useAthleteOnboardingState`), submit
  a video (`videoAcceptance.ts` → `analyze-video`), see a generated report
  card via the per-analysis UHRC mount point (`UhrcAthleteSection`,
  `disciplines/{bp,bh,throwing}.ts`), receive static guidance
  (`explainer` + `HammerDailyPlan` + `HammerChat`), and have their video
  recorded in `videos.ai_analysis` for later trend queries
  (`useReportCardTrend`).
- Internal supervision compensates for the Critical Blockers in §7:
  supervisors know measurement is uncertified and can interpret tile values
  accordingly. This is the exact posture Phase 18 ratified
  (`p18 §7`: "Internal Testing **Eligible**"; `p18 §9`: `LIMITED INTERNAL
  ATHLETE TESTING READY`).
- Alpha / beta / public posture remains blocked by §7 Critical Blockers 1–3
  and Major Blockers 4–8.

---

## §9 — Final Determination

**WORKFLOW PROVEN FOR INTERNAL TESTING.**

Supported exclusively by:
- §2 (every stage reaches the UI; degradations are visible, not silent).
- §3 (data flows end-to-end from intake to report card; broken links are
  documented but not crash-inducing).
- §4 (report card renders today for the supported sports with full tile
  coverage of the BP/BH/Throwing specs, against uncertified data).
- §5 (recommendation surfaces operate as static/rule-backed; no surface
  fabricates evidence-backed claims it cannot support).
- §6 (athlete experience degrades visibly; no crash paths identified in the
  audited surfaces).
- §7 (Critical Blockers gate non-internal posture; Major/Minor blockers
  degrade but do not break the supervised internal loop).
- §8 (YES, supervised internal completion is reachable today).

This determination introduces no new metrics, detectors, anchors, validation
rules, calibration rules, confidence rules, gates, governance, doctrine, or
architecture, per `amd §Impact Analysis` and `clo §7`.
