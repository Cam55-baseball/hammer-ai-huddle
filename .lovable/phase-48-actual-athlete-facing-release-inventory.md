# Phase 48 — Actual Athlete-Facing Release Inventory

**Scope:** product audit only. What an athlete actually sees in the running
app today. No measurement audit, no code audit, no architecture audit.
Evidence: render tree under `src/pages/AthleteCommand.tsx` +
`src/pages/AnalyzeVideo.tsx`, the report-card components, and the database
state established in Phase 46 / Phase 47 (0 rows in
`video_metric_runs`, `video_landmark_runs`, `video_event_runs`; only
`videos.ai_analysis` is populated, and that is LLM-emitted).

---

## §1 Athlete Visible Inventory

Canonical athlete surface is `/command` → `AthleteCommand.tsx`. The
report-card (`UhrcAthleteSection`) is no longer mounted on the Command
Center; it mounts inside each video analysis page.

| Surface / Tile                                | Visible | Hidden | Suppressed | Placeholder | Measurement | AI narrative | Static / Catalog |
| --------------------------------------------- | :-----: | :----: | :--------: | :---------: | :---------: | :----------: | :--------------: |
| `NotificationBell`                            |    Y    |        |            |             |             |              |        Y         |
| `HammerOnboardingChat` (until gaps closed)    |    Y    |        |            |             |             |      Y       |        Y         |
| `CommandCenterSection` — readiness/fatigue/workload grid | Y |    |            |             |     Y¹      |              |        Y         |
| `HammerDailyPlan` — 9-modality prescription   |    Y    |        |            |             |             |              |        Y         |
| `HammerChat` — Ask-Coach                      |    Y    |        |            |             |             |      Y       |                  |
| `RecentEventsPreview` — replay tail           |    Y    |        |            |             |     Y²      |              |                  |
| **Inside `AnalyzeVideo` → `UhrcAthleteSection`:** |       |        |            |             |             |              |                  |
| UHRC composite score                          |    Y    |        |            |             |     Y³      |              |                  |
| UHRC pillar tiles (5 pillars)                 |    Y    |        |            |             |     Y³      |              |                  |
| `biggest_leak` / `biggest_win` banners        |    Y    |        |            |             |     Y³      |      Y⁴      |                  |
| Missingness footer (`n/m signals present`)    |    Y    |        |            |             |     Y       |              |                  |
| "Work on this in today's plan" CTA            |    Y    |        |            |             |             |              |        Y         |
| `LineageDrilldownButton`                      |    Y    |        |            |             |     Y       |              |                  |
| `engine_version` badge                        |    Y    |        |            |             |             |              |        Y         |
| **BP report-card tiles** (`tempo_sec`, `energy_angle_deg`, `lift_thrust_deg`, `premature_shoulder_open_deg`, `shoulder_tilt_deg`, `head_vertical_movement_pct`) | Y |  |  | Y (all render "—" + missingness chip) |  |  |  |
| **BH report-card tiles** (`BhCategoryPanels`) |         |        |     Y      |             |             |              |                  |
| Sport-not-supported card (non-baseball/softball) | Y    |        |            |      Y      |             |              |        Y         |

¹ Self-reported HIE inputs + organism rollups. Not a per-video biomechanical
measurement.
² Replays a ledger of past events; the events themselves are mostly LLM-
or self-report-sourced.
³ Pillar scores are computed from PIE V2 aggregates + HIE snapshot fields,
not from the six Release-1 BP metrics. The Release-1 trust-lock suppresses
HIDDEN / SHOWCASE_FUTURE contributions to `missing: true`
(`buildReport.ts:180`, `applyRelease1Suppression`).
⁴ Banner copy is LLM-narrated; the underlying numeric source is the PIE V2
contribution with the largest delta.

---

## §2 Report Card Reality

On a freshly uploaded pitching video today, `UhrcReportCard` renders:

1. **Header line** — "Hammers Report Card", composite score, `engine_version`
   badge, lineage drill-down button. Composite is a weighted mean of the 5
   pillars (`buildReport.ts:202`).
2. **Biggest-leak / biggest-win banners** — present only when at least one
   contribution has a non-null value. With zero PIE V2 history and no HIE
   snapshot, both are absent. With prior PIE V2 sessions, both populate.
3. **5 pillar tiles** — each shows a score (or "—") plus a tier badge plus
   `signals present / total signals · confidence N`. Pillar tiles populate
   when `pieV2Latest` has aggregated signals for that pillar; otherwise the
   pillar renders "—".
4. **Missingness footer** — `n/m source signals present` with up to 4
   missing signal ids listed.
5. **"Work on this in today's plan" CTA** — always rendered, deep-links to
   `/command#hammer-plan`.
6. **Detailed analysis toggle** — opens contribution-level drill-down.
7. **BP discipline tiles** (`bp.ts` spec) — all six Release-1 BP tiles
   render with no value because:
   - 0 `video_metric_runs` rows exist for any of the six keys (Phase 46 §3).
   - The Release-1 trust lock blocks LLM-emitted values from passing
     through to athlete tiles (`release1.ts`).
   - The `tempo_sec` deterministic engine exists but is not persisted to
     `video_metric_runs` (Phase 47 §5).
8. **`BhCategoryPanels`** — not mounted. `RELEASE1_HITTING_SUPPRESSED = true`
   (`UhrcAthleteSection.tsx:113`).

---

## §3 Coaching Reality

| Output                              | Source                                                                 | Type             |
| ----------------------------------- | ---------------------------------------------------------------------- | ---------------- |
| `HammerOnboardingChat` prompts      | Onboarding director rules + LLM templating                             | Static + LLM     |
| `HammerChat` responses              | LLM via AI gateway, grounded on athlete context envelope                | LLM narrative    |
| `biggest_leak` / `biggest_win` copy | Templated narrative on top of PIE V2 contribution deltas                | LLM-templated    |
| `videos.ai_analysis` coaching text  | LLM analysis of the uploaded video (no deterministic landmarks behind it) | LLM narrative    |
| Pillar `note` strings               | Templated from `presentConfidences / suppressed.length`                 | Static template  |

There is no coaching output today that is grounded in a deterministic
per-video biomechanical measurement. The `tempo_sec` engine runs on upload
but its value is smuggled into `video_landmark_runs.diagnostics` (a table
with 0 rows in production) and never surfaces in coaching copy.

---

## §4 Recommendation Reality

| Recommendation surface                | Underlying source                                            |
| ------------------------------------- | ------------------------------------------------------------ |
| `HammerDailyPlan` modality items      | `pieV2DrillCatalog`, `pieV2VideoCatalog`, `drillBenefits`, `drillCompletionRequirements`, `trainingSchedules` |
| Drill chips on each plan card         | Same static catalogs + athlete tier/sport filters            |
| Video suggestions                     | `pieV2VideoCatalog` static catalog                           |
| "Work on this in today's plan" CTA target | Static deep link `#hammer-plan`                          |
| Chat-driven suggestions               | LLM narrative grounded on athlete envelope                   |
| Report-card pillar remediation hints  | Pillar `explanation` strings hardcoded in `pillars.ts`       |

No recommendation in production is conditioned on a deterministic per-video
biomechanical metric output. Recommendations are catalog-driven, tier-
gated, and LLM-narrated.

---

## §5 Trend Reality

| Trend surface                | Hook                       | Data source                                                                 |
| ---------------------------- | -------------------------- | --------------------------------------------------------------------------- |
| Per-video report-card trend  | `useReportCardTrend`       | `videos.ai_analysis.metrics` — LLM-emitted per video                        |
| Pitching V2 trend rollups    | `usePitchingV2Trends`      | `pie_v2_*` aggregate tables — derived from logged sessions / self-report    |
| HIE snapshot fields          | `useHIESnapshot`           | Hitting Intelligence Engine snapshot — self-report + LLM doctrine inference |
| Recent activity preview      | `useAthleteCommandRows`    | `asb_events` replay tail                                                    |

Every per-video trend point in `useReportCardTrend` originates from LLM
output, not from a deterministic measurement engine.

---

## §6 Empty-State Audit

Surfaces that today render as empty / missing / suppressed / placeholder:

- **All six Release-1 BP tiles** on every uploaded video: render the tile
  shell with "—" and a missingness chip. (0 `video_metric_runs` rows;
  trust-lock blocks LLM fallback.)
- **`BhCategoryPanels`** — never mounts (`RELEASE1_HITTING_SUPPRESSED`).
- **UHRC pillars for new athletes with no PIE V2 history** — score "—",
  `0/n signals · confidence 0`, note "Insufficient data to score this
  pillar yet."
- **`biggest_leak` / `biggest_win`** — absent when no contribution has a
  non-null value.
- **Non-baseball/non-softball sport** — entire `UhrcReportCard` replaced
  by the "waiting on projector" card.
- **`HammerOnboardingChat`** — hides itself once knowledge gaps close;
  for a brand-new athlete it dominates the surface.
- **`RecentEventsPreview`** — empty for new athletes (no events yet).

---

## §7 Public Release Candidate

Assuming no new code is written, the subset that can ship today **without
making a measurement claim** is:

- Video upload, storage, playback.
- LLM-narrated coaching text on each uploaded video — only if framed as
  "Coach Hammer's read", not as measurement.
- `HammerChat` (Ask-Coach) — already conversational.
- `HammerOnboardingChat`.
- `HammerDailyPlan` — catalog-driven, tier-gated, honest.
- `CommandCenterSection` readiness/fatigue/workload — labeled as derived
  from self-reported organism inputs.
- `RecentEventsPreview` — replay tail.
- Notifications, account/auth, settings.

What **cannot** ship as-is without misleading the athlete:

- `UhrcReportCard` composite + pillar scores, because contributions are
  mostly missing yet the surface renders integer scores with an
  `engine_version` badge implying deterministic measurement.
- The six BP report-card tiles, because they render the tile shell of a
  measurement that does not exist in `video_metric_runs`.
- `useReportCardTrend` trend chart, because it implies a measured trend
  while reading from LLM output.

---

## §8 Trust Audit — outputs that could be misread as measured

1. **Composite score and pillar tile scores** — integer rendering + tier
   badges + `engine_version` chip read as "measured" even when most
   contributions are flagged missing.
2. **`biggest_leak` / `biggest_win` banners** — phrased as findings, not as
   "largest delta in your self-reported rollup".
3. **Pillar `confidence N` line** — reads as model confidence but is just
   `presentContributions / totalContributions × 100`.
4. **`engine_version` badge** — implies a deterministic measurement engine
   behind the score.
5. **`LineageDrilldownButton`** — implies forensic lineage exists; for
   tiles whose only source is `videos.ai_analysis`, lineage terminates at
   the LLM call.
6. **`useReportCardTrend` chart** — visually identical to a measured trend.
7. **Per-video coaching text from `videos.ai_analysis`** — written in the
   tone of a coach who watched and measured the video.

---

## §9 Release Classification

Based purely on what the athlete sees today:

- **READY FOR PUBLIC RELEASE** — No. The report card and per-video trend
  surfaces would publish measurement-shaped UI on top of non-measurement
  data.
- **READY FOR LIMITED BETA** — Only if `UhrcReportCard`, the six BP tiles,
  and `useReportCardTrend` are either hidden behind a beta flag or
  explicitly relabeled as non-measured previews, and the LLM coaching text
  is framed as opinion. With those guardrails, the rest of the product
  (upload, chat, daily plan, organism readiness, onboarding, recent
  activity) is honest enough for a controlled beta.
- **NOT READY** — for any release that surfaces the report card / trend
  chart in their current measurement-shaped form.

**Classification: NOT READY for public release. Conditionally READY for
limited beta** under the gating described above.

---

## §10 Final Determination

**What Hammers can honestly claim to athletes today:**

- "Upload your video, get a conversational read from Coach Hammer."
- "Track your self-reported readiness, fatigue, sleep, hydration, and
  workload."
- "Get a daily plan across nine training modalities drawn from our drill
  catalog."
- "Ask Coach Hammer questions in chat, grounded in what you've told us."
- "Replay your recent activity timeline."

**What Hammers cannot honestly claim today:**

- That any per-video biomechanical metric — tempo, energy angle, lift /
  thrust, shoulder open, shoulder tilt, head movement, or anything on the
  hitting side — is measured. None of them populate
  `video_metric_runs`; the only metric engine that runs (`tempo_sec`) is
  not persisted to the metric table.
- That the report-card composite or pillar scores reflect measurement of
  the uploaded video. They reflect PIE V2 self-reported rollups + HIE
  snapshot fields, with all Release-1 BP / BH metric contributions forced
  to `missing` by the trust lock.
- That the per-video trend chart is a measured trend. It reads LLM
  output stored in `videos.ai_analysis.metrics`.

Hammers' honest product today is a coaching assistant + organism tracker +
daily plan, not a video-measurement product.
