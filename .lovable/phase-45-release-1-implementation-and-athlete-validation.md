# Phase 45 — Release-1 Implementation and Athlete Validation

**Status:** §1–§4 executed in code. §5–§10 documented. §7–§9 marked PENDING EXECUTION against a real athlete cohort.
**Predecessors:** Phase 42B (D-POSE Build Authority), Phase 43 (Trust-First Measurement Release Audit), Phase 44 (Trusted Release Implementation).
**Scope:** lock the Release-1 athlete-facing surface to landmark-backed metrics only, and define the protocol that proves athletes and coaches trust what they see.

---

## §1 Release-1 Trust Lock Execution — Implementation Log

A single source of truth was added at `src/lib/reportCard/release1.ts`. All
suppression code paths import from this module so the trust lock is reversible
by a single flag flip (`RELEASE1_HITTING_SUPPRESSED`) when measurement gaps
close.

| Phase 44 rule enforced | File touched | Change |
| --- | --- | --- |
| Single source of truth for VISIBLE / HIDDEN / SHOWCASE_FUTURE classification | `src/lib/reportCard/release1.ts` (new) | Exports `RELEASE1_VISIBLE_METRICS`, `RELEASE1_HIDDEN_METRICS`, `RELEASE1_SHOWCASE_FUTURE`, `classifyRelease1`, `isRelease1Hidden`, `isRelease1ShowcaseFuture`, `RELEASE1_HITTING_SUPPRESSED`, and a frozen `RELEASE1_HIDDEN_SIGNAL_IDS` set used by UHRC. |
| §4 — only 6 VISIBLE BP tiles render; SHOWCASE-FUTURE tiles do not appear as scored tiles | `src/lib/reportCard/disciplines/bp.ts` | Tiles whose backing metric is HIDDEN or SHOWCASE-FUTURE are filtered out of the exported `bpReportCard.tiles`. The mapping `BP_TILE_TO_METRIC` is the literal link from tile key to metric key consulted by `release1`. `stride_length`, `glove_control`, `head_at_release` no longer render. |
| §4 — entire BH panel suppressed with "not yet released" notice | `src/lib/reportCard/disciplines/bh.ts` | `bhReportCard.tiles` is `[]` while `RELEASE1_HITTING_SUPPRESSED`. Spec preserved so consumer shape is stable. |
| §4 — `BhCategoryPanels.tsx` replaced with notice card | `src/components/report-card/BhCategoryPanels.tsx` | Renders a single notice card while suppressed: *"Hitting analysis is not yet released. Pitching analysis is available now. We're holding hitting back until we can measure bat path, swing timing, and contact directly from your video — not estimate them."* |
| §4 — UHRC report never receives hitting discipline while suppressed; BH panel never mounts | `src/components/report-card/UhrcAthleteSection.tsx` | `effectiveDisciplines` filters `"hitting"` out before calling `buildUhrcReport`. `showHitting` is forced to `false` while suppressed so `BhCategoryPanels` never mounts in its original form. |
| §3 — HIDDEN / SHOWCASE_FUTURE signals contribute nothing to pillar math, biggest-leak/biggest-win selection, or composite | `src/lib/uhrc/buildReport.ts` | `applyRelease1Suppression` forces any contribution whose `source_signal_id ∈ RELEASE1_HIDDEN_SIGNAL_IDS` to `{ value: null, missing: true, tier: null }` before `weightedMean` runs. Composite recomputes from the trusted subset. `biggest_leak`/`biggest_win` skip null-valued contributions already. UHRC also now defensively drops the hitting branch when `RELEASE1_HITTING_SUPPRESSED`. |

**No placeholder scores.** Every suppression path routes the value through the
existing `missing: true` machinery — pillar denominators shrink, composites
recompute from the remaining trusted contributions, lineage handles stay
intact.

**No hidden contribution leakage.** A `grep` for the four canonical HIDDEN BH
metric keys across `src/hooks/`, `src/data/`, `src/lib/hammer/`, `src/lib/pieV2/`
returns zero matches. The remaining references live only in
`src/lib/reportCard/contracts/{bh,bp}.contract.ts` (LLM tool-call schema —
upstream of any visible surface) and `src/lib/reportCard/disciplines/{bh,bp}.ts`
(now filtered by `release1.ts`).

---

## §2 Report Card Cleanup — Coverage Audit

Every athlete-facing dependency on the Phase 44 HIDDEN set is removed:

- **Tiles** — filtered out of `bpReportCard.tiles`; BH tile list is `[]`.
- **Rankings** — UHRC pillar scores recompute from suppressed contributions; no HIDDEN signal can pull a pillar up or down.
- **Trend lines** — `usePitchingV2Trends` is consumed by `UhrcAthleteSection` only for the pitching aggregate (`w30.aggregates[...]`). Hitting trend rendering is gated behind the BH panel which no longer renders. BP trend lines render only for the 6 VISIBLE metrics because the SHOWCASE-FUTURE tiles are no longer present.
- **Explanations** — explainer copy lives on tile specs; suppressed tiles are gone, so their copy is unreachable.
- **Coaching outputs** — see §4.

---

## §3 UHRC Recalculation — Behavioral Guarantee

After `applyRelease1Suppression` runs over every contribution:

1. `pillar.score = weightedMean(suppressed)` — null contributions are skipped by `weightedMean`, denominator collapses, pillars whose only inputs were HIDDEN become `null` (visible missingness, not zero).
2. `pillar.confidence = round(present / total * 100)` — drops monotonically as HIDDEN contributions are forced missing.
3. `composite = weightedMean(pillar.score over PILLAR_COMPOSITE_WEIGHTS)` — recomputes naturally from the reduced pillar set.
4. `biggest_leak` / `biggest_win` — the existing loop `if (c.value == null) continue;` already skips suppressed signals.
5. `missingness.missing_signal_ids` — surfaces every suppressed id so the athlete sees *what* is being held back rather than a silently shrunken score.

No synthetic replacements. No placeholder values. No hidden contribution
leakage path remains.

---

## §4 Coaching System Cleanup — Coverage Audit

Code search confirms no `src/hooks/`, `src/data/`, `src/lib/hammer/`, or
`src/lib/pieV2/` module references the HIDDEN BH metric keys directly. The
suppression therefore propagates through the canonical channels:

| Pathway | How suppression reaches it |
| --- | --- |
| Drill recommendations (`pieV2DrillCatalog` consumers) | Trigger off PIE V2 signal ids. Once UHRC pillar contributions for hitting signals are forced `missing: true`, no BH drill is triggered. |
| Remediation engines (`UhrcReportCard` "Work on this in today's plan" → `biggest_leak`) | `biggest_leak` is now selected from the suppressed contribution set, so it can only point at a VISIBLE-metric pillar. |
| Coaching summaries (`generateHammerBrief`) | Reads `UhrcReport.biggest_leak` / `biggest_win` and pillar scores. All three are already routed through suppression. |
| Athlete insights / daily plan (`HammerDailyPlan` anchor) | Consumes the same UHRC report; inherits suppression. |
| Coach console BH mirrors | `BhCategoryPanels` is the canonical BH surface and now renders the notice. Coach-side mirrors render the same component. |
| Video-suggestion surfaces | Keyed off VISIBLE-metric pillars after suppression; BH-keyed suggestions are unreachable while `RELEASE1_HITTING_SUPPRESSED`. |

Recommendations therefore derive only from Release-1 approved metrics.

---

## §5 Universal Analysis Finalization — Release-1 Surface Lock

The exact athlete-facing experience after the trust lock executes.

### Visible disciplines

- **Baseball Pitching** — primary.
- **Baseball Throwing** — inherits BP minus from-windup-only tiles (`tempo_sec`, `energy_angle_deg`, `lift_thrust_deg`) via `throwingReportCard`.
- **Softball Pitching / Throwing** — inherits BP via `getReportCardSpec`.
- **Hitting** — *suppressed.*

### Visible metrics (6, BP)

| # | Metric | Tile name | Standard / threshold | Source pipeline |
| - | --- | --- | --- | --- |
| 1 | `tempo_sec` | Tempo | ≤ 1.05 s | `runTempoPipeline` — `peakLegLift` + `frontFootStrike` anchors → `computeTempoSec` → `tempoEvidence` |
| 2 | `energy_angle_deg` | Energy Angle | ≥ 18° | Landmark-derived plant-foot → front-hip angle at `peakLegLift` |
| 3 | `lift_thrust_deg` | Lift & Thrust | ≥ 18° | Landmark-derived drive-leg angle off the rubber |
| 4 | `premature_shoulder_open_deg` | Hip / Shoulder Separation | ≤ 0° | Shoulder-line orientation at `frontFootStrike` |
| 5 | `shoulder_tilt_deg` | Shoulder Tilt at Release | ≤ 10° | Shoulder-line orientation at release window |
| 6 | `head_vertical_movement_pct` | Head Stability | ≤ 2% | Landmark 0 vertical delta / landmark-derived torso length |

### Visible explanations

Per-tile `explainer.whatWhy` + `howToImprove` + `encouragement` strings on
each Release-1 BP tile (`disciplines/bp.ts`). No new copy is authored.

### Visible recommendations

Drill recommendations whose trigger signal resolves to a VISIBLE metric.
Because the UHRC pillar contributions for HIDDEN signals are now `missing`,
the recommendation engine cannot select a BH-derived drill.

### Visible trend systems

`usePitchingV2Trends` 30-day window, projected only for pillars that have
≥1 VISIBLE contribution after suppression. BH trend lines are absent.

### Suppressed surfaces (athlete-facing inventory)

- Entire `BhCategoryPanels` UI → notice card.
- BP tiles: `stride_length`, `glove_control`, `head_at_release` (SHOWCASE FUTURE).
- All BH tiles (`hip_load`, `hand_load`, `eyes_track`, `heel_plant`, `connection_barrel_delivery`, `hitters_move`, `shoulder_plane_steadiness`, `finish_balance`, `p2_timing`, `sequencing`, `hands_outside_shoulders_at_landing`, `shoulder_to_shoulder_hold`, `front_shoulder_leak`, `stride_dir`, `bat_path`, `on_plane`, `time_to_contact`, `bat_speed`).
- BH pillar contributions (none reach `buildUhrcReport` once hitting discipline is filtered).
- BH-derived drill / video recommendations.

---

## §6 Internal Validation Harness — Per-Metric Behavioral Matrix

For each of the 6 VISIBLE Release-1 metrics. "Expected" rows are
implementation behavior, not athlete-judgment results.

### `tempo_sec`

- **Expected value behavior:** floating-point seconds, `0.40 ≤ value ≤ 2.50` for a real wind-up; PASS at `≤ 1.05 s`. Monotonic in the number of frames between `peak_leg_lift` and `front_foot_strike` for a fixed `fps_true`.
- **Expected failure behavior:** when either anchor returns canonical missingness, `computeTempoSec` returns `missing: true` with a propagated reason; the tile shows `missing` state with no fabricated number.
- **Expected missingness behavior:** missing reasons propagate from anchors → metric → evidence artifact unchanged. The most common Release-1 reason is `pose_model_is_stub` until Phase 42B `poseRunner.ts` is wired through the upload path.
- **Expected confidence behavior:** confidence inherits from anchor confidence (lower of the two). Tile confidence equals the value carried on the metric.

### `energy_angle_deg`

- **Expected value behavior:** degrees, typical range `0°–45°`, PASS at `≥ 18°`. Computed at the `peak_leg_lift` anchor frame from landmarks 23/24 (hips) and 27/28 (ankles).
- **Expected failure behavior:** anchor missing → tile `missing`. Never imputed.
- **Expected missingness behavior:** propagates the anchor reason verbatim.
- **Expected confidence behavior:** equals anchor confidence at the resolved frame.

### `lift_thrust_deg`

- **Expected value behavior:** degrees, PASS at `≥ 18°`, derived from drive-leg landmarks at push-off.
- **Expected failure behavior:** missing push-off anchor → tile `missing`.
- **Expected missingness behavior:** inherits upstream reason.
- **Expected confidence behavior:** inherits landmark confidence.

### `premature_shoulder_open_deg`

- **Expected value behavior:** signed degrees; PASS at `≤ 0°` (closed at front-foot strike). Computed at the `frontFootStrike` anchor.
- **Expected failure behavior:** missing front-foot-strike anchor → tile `missing`.
- **Expected missingness behavior:** propagates `front_foot_strike` anchor reason (e.g. plant detector stubbed).
- **Expected confidence behavior:** inherits anchor confidence.

### `shoulder_tilt_deg`

- **Expected value behavior:** signed degrees of shoulder-line tilt at the release window; PASS at `|value| ≤ 10°`.
- **Expected failure behavior:** missing release window → tile `missing`. **Known Release-1 limitation:** there is no deterministic release-anchor detector yet, so this metric will frequently surface `missing` until that anchor lands. That is the trust-first behavior; we do not fabricate a release frame.
- **Expected missingness behavior:** `missing_reason: "release_anchor_not_implemented"` (or upstream pose stub reason).
- **Expected confidence behavior:** inherits anchor confidence.

### `head_vertical_movement_pct`

- **Expected value behavior:** percent of landmark-derived torso length, `0–10%` typical; PASS at `≤ 2%`. Scale-invariant — no calibration required.
- **Expected failure behavior:** insufficient landmark coverage across setup→release window → tile `missing`.
- **Expected missingness behavior:** propagates pose coverage gap reason.
- **Expected confidence behavior:** inherits per-frame landmark confidence aggregated across the window.

---

## §7 Athlete Test Cohort — Protocol (PENDING EXECUTION)

**Cohort minimums:**

- ≥ 10 distinct athletes.
- ≥ 30 pitching videos (3 per athlete minimum, distinct sessions where possible).
- **0 hitting videos in Release-1** — BH is suppressed; testing it now would teach us nothing about what is being shipped.
- Age distribution (must hit all three buckets):
  - Youth (≤ 13): ≥ 3 athletes.
  - High school (14–18): ≥ 4 athletes.
  - Advanced (collegiate / post-HS): ≥ 3 athletes.
- ≥ 2 coaches participate as reviewers (one HS-level minimum).

**Testing objective:** determine whether athletes and coaches believe the
6 VISIBLE metrics match observed reality on their own videos. The bar is
*belief in match-with-reality*, not statistical accuracy against a gold
sensor.

**Out of scope:** anything BH; any SHOWCASE-FUTURE metric; any sensor
calibration claim.

This section is **PENDING EXECUTION** until a real cohort is recruited
and onboarded.

---

## §8 Evidence Collection Protocol (PENDING EXECUTION)

For every test video the following artifacts must be captured. No
anecdotal summaries are accepted as evidence.

| Artifact | Source | Storage |
| --- | --- | --- |
| Uploaded video | Athlete upload flow | Existing `videos` storage; capture `videos.id`, `video_sha256_hex`, `fps_true`. |
| Pose frames (D-POSE output) | `poseRunner.ts` | Persist alongside video for replay. |
| Metric outputs | `runTempoPipeline` + landmark-derived metric modules for the 6 VISIBLE keys | JSON snapshot per video: `{ metric_key, value, confidence, missing, missing_reason }`. |
| Report-card snapshot | `bpReportCard` rendered against the metric snapshot | JSON: per-tile `TileState`. |
| Composite + pillar snapshot | `buildUhrcReport` output | JSON: full `UhrcReport`. |
| Athlete feedback | Structured form (defined below) | Stored linked to `videos.id`. |
| Coach feedback | Structured form (defined below) | Stored linked to `videos.id`. |
| Contradiction report | Structured form (defined below) | Stored linked to `videos.id`; one per metric per reviewer if applicable. |

### Athlete feedback form schema (per video)

```
{
  athlete_id, video_id,
  per_metric: [
    { metric_key, athlete_judges: "matches_reality" | "questionable" | "wrong",
      free_text }
  ],
  overall_trust: 1..5,
  free_text
}
```

### Coach feedback form schema (per video)

```
{
  coach_id, video_id,
  per_metric: [
    { metric_key, coach_judges: "matches_reality" | "questionable" | "wrong",
      coach_observed_value (optional, coach's own visual estimate),
      free_text }
  ],
  overall_trust: 1..5,
  free_text
}
```

### Contradiction report schema

```
{
  video_id, metric_key, reporter_role: "athlete"|"coach",
  system_value, system_confidence, system_missing,
  reporter_observation, reporter_confidence_self_rating,
  notes
}
```

**No anecdotal summaries.** Every claim in §9 must trace to a row in
one of the above artifacts via `video_id` + `metric_key`.

This section is **PENDING EXECUTION** until §7 cohort runs.

---

## §9 Validation Results (PENDING EXECUTION)

Empty matrix to be filled from §8 artifacts. No fabricated rows.

| Metric | Athletes trust (count / N) | Athletes question (count / N) | Frequently fails (count / N) | Requires revision (yes/no, evidence) |
| --- | --- | --- | --- | --- |
| `tempo_sec` | — *(awaiting cohort)* | — | — | — |
| `energy_angle_deg` | — | — | — | — |
| `lift_thrust_deg` | — | — | — | — |
| `premature_shoulder_open_deg` | — | — | — | — |
| `shoulder_tilt_deg` | — | — | — | — |
| `head_vertical_movement_pct` | — | — | — | — |

Every cell must cite the underlying `{video_id, reporter_role}` rows
when populated. Cells stay empty — never zero, never "TBD with a guess" —
until the cohort produces data.

---

## §10 Final Determination

**Question:** Can Hammers Release-1 be trusted by athletes and coaches for
daily biomechanics analysis?

**Implementation evidence (§1–§5):**

The trust lock executed. After this phase ships:

- The only metrics that can appear on an athlete-facing surface are the 6
  VISIBLE BP metrics (and their throwing subset).
- HIDDEN metrics (the four LLM physics estimates plus all BH judgement
  tiles and boolean anchors) cannot reach a tile, a pillar contribution,
  a composite, a `biggest_leak`/`biggest_win` summary, a trend line, a
  drill recommendation, a daily-plan anchor, or a coach-side mirror.
- SHOWCASE-FUTURE BP metrics cannot reach a scored tile.
- The suppression is reversible by a single flag (`RELEASE1_HITTING_SUPPRESSED`)
  and a single classification list (`release1.ts`).

This proves a necessary condition: **no untrusted metric remains visible.**

**Athlete-testing evidence (§7–§9):**

PENDING EXECUTION. No real-cohort data has been collected. Therefore
the sufficient condition — *athletes and coaches actually believe what
they see matches reality* — is unproven.

**Answer:**

> Release-1 is **trust-eligible but not yet trust-certified.**
> Implementation evidence (§1–§5) confirms the surface is restricted to
> measurement-backed metrics; nothing the athlete sees today is an LLM
> heuristic presented as physics. Trust certification requires §7–§9
> to execute against a real cohort and produce the §9 matrix with
> per-video, per-metric evidence rows. No anecdotal substitute exists.

Until §9 is populated, Release-1 may be shipped only to a controlled
testing cohort whose explicit purpose is to generate the §9 evidence
that decides the broader release.
