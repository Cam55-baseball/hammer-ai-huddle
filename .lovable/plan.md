## Phase 45 — Release-1 Implementation and Athlete Validation

Per your answers: code execution for §1–§4 (real edits suppressing HIDDEN + SHOWCASE-FUTURE metrics from athlete-facing surfaces and coaching pipelines), then a single document `.lovable/phase-45-release-1-implementation-and-athlete-validation.md` covering §5–§10 (Universal Analysis lock, validation harness, cohort protocol, evidence-collection protocol, conditional determination — no synthetic athlete data).

### Scope lock (carried from Phase 44)

- **HIDDEN (BH):** `bat_speed_contact_mph`, `time_to_contact_ms`, `on_plane_pct`, `bat_path_score_100`, all BH 0–100 judgement tiles, all BH boolean anchors.
- **HIDDEN-via-suppression (BH discipline as a whole):** entire `BhCategoryPanels` per Phase 44 §4.
- **SHOWCASE FUTURE (BP):** `stride_pct_of_height`, `glove_drift_outside_frame_in`, `head_at_release_deg`, `p3_release_offset_ms`, `stride_dir_deg_off_square`, `front_shoulder_leak_pct_of_window`, `shoulder_to_shoulder_hold_pct_to_contact`.
- **VISIBLE (Release-1):** `tempo_sec`, `energy_angle_deg`, `lift_thrust_deg`, `premature_shoulder_open_deg`, `shoulder_tilt_deg`, `head_vertical_movement_pct`.

### §1–§4 — Code execution

Blast radius is narrow because HIDDEN keys live only in the reportCard contracts/disciplines and feed everything else through generic signal IDs.

1. **Release-1 trust constant** — new `src/lib/reportCard/release1.ts` exporting `RELEASE1_VISIBLE_METRICS`, `RELEASE1_HIDDEN_METRICS`, `RELEASE1_SHOWCASE_FUTURE`, and a `classifyRelease1(key)` helper. Single source of truth so all surfaces import from one place.

2. **BH discipline suppression** — `src/lib/reportCard/disciplines/bh.ts`: tiles list becomes empty for Release-1 (gated by a `RELEASE1_HITTING_SUPPRESSED = true` flag in `release1.ts`). The spec still exports so `getReportCardSpec` keeps shape; the tile array is `[]`.

3. **BP discipline filtering** — `src/lib/reportCard/disciplines/bp.ts`: keep tiles for the 6 VISIBLE metrics. Tiles whose `key` resolves to SHOWCASE-FUTURE render through a new `showcaseFutureState()` helper (mode preserved, status `missing`, missing_reason `"showcase_future_release"`) so they appear as a single placeholder card per Phase 44 §4, not as scored tiles.

4. **`BhCategoryPanels.tsx`** — replace category render with the Phase 44 §4 "Hitting analysis not yet released — pitching analysis available now" notice card. Guard with `RELEASE1_HITTING_SUPPRESSED` so the panel is trivially re-enabled later.

5. **`UhrcAthleteSection.tsx`** — when `RELEASE1_HITTING_SUPPRESSED`, drop `"hitting"` from the disciplines passed into `buildUhrcReport` regardless of caller, and never mount `BhCategoryPanels`.

6. **`src/lib/uhrc/buildReport.ts` (§3 UHRC recalculation)** — wrap contribution intake so any contribution whose `source_signal_id` matches a HIDDEN key is forced to `{ value: null, missing: true }` before pillar math. SHOWCASE-FUTURE contributions are also marked missing. No new math: existing `contributions.filter(c => !c.missing).length` denominator handles the rest, composite recomputes, `biggest_leak`/`biggest_win` candidate filter excludes missing contributions.

7. **Coaching pipelines (§4)** — audit and suppress HIDDEN/BH inputs in:
   - `usePitchingV2Trends` BH aggregator path — drop BH rollups.
   - Drill recommendations (`src/data/baseball/pieV2DrillCatalog.ts` consumers) — filter out drills whose trigger signals are HIDDEN.
   - `HammerDailyPlan` "Work on this" anchor (`UhrcReportCard.tsx`) — already pulls from `biggest_leak`, which is now VISIBLE-only via step 6; verify no additional path.
   - Video-suggestion surfaces — filter to VISIBLE-metric matches.
   - Coach console BH mirrors — apply the same `RELEASE1_HITTING_SUPPRESSED` guard.

8. **Coach surfaces** — apply the same hiding to any coach-console BH panel that mirrors `BhCategoryPanels`.

### `.lovable/phase-45-release-1-implementation-and-athlete-validation.md` — document for §5–§10

Single file, sections matching the prompt exactly:

- **§1–§4 Implementation Log** — every edited file with rationale and the rule it enforces (which Phase 44 row it satisfies). Reads as audit-grade evidence that the trust lock executed.
- **§5 Universal Analysis Finalization** — the locked Release-1 surface: 6 BP metrics, 3 throwing metrics, BH suppressed. Visible explanations sourced from existing contract copy. Visible recommendations: drill catalog filtered to VISIBLE keys. Visible trends: 30-day pillar trends for pillars with ≥1 VISIBLE contribution. Exact tile order, exact copy strings, exact missingness messages.
- **§6 Internal Validation Harness** — per-metric matrix for the 6 VISIBLE metrics:
  - expected behavior (value range, monotonicity, units)
  - expected failure behavior (when anchor missing → `missing: true`, never fabricated)
  - expected missingness behavior (which upstream gap surfaces which `missing_reason`)
  - expected confidence behavior (confidence bounds, what causes degradation)
- **§7 Athlete Test Cohort — protocol only** — minimum counts (e.g. ≥10 athletes, ≥30 pitching videos, 0 hitting videos for Release-1, split across youth / HS / advanced). Capture format. Marked **PENDING EXECUTION**.
- **§8 Evidence Collection Protocol** — required artifacts per video (upload hash, metric outputs, report-card JSON snapshot, athlete feedback form schema, coach feedback form schema, contradiction-report schema). Where evidence is stored. No anecdotes permitted. Marked **PENDING EXECUTION**.
- **§9 Validation Results** — empty matrix (one row per VISIBLE metric × {trust, question, fail, revise} columns) with explicit "no data — awaiting cohort execution" entries. No fabricated rows.
- **§10 Final Determination** — conditional answer: Release-1 cannot be declared trusted until §7–§9 execute against real athletes. Implementation evidence (§1–§5) confirms only that *no untrusted metric remains visible*. Trust certification requires §9 data.

### Constraints honored

- No new metrics, detectors, doctrine, architecture.
- No synthetic athlete or coach feedback.
- Hitting suppression is reversible via one flag flip in `release1.ts` once measurement gaps close.
- Every code change is removal/suppression, not new measurement.

### Out of scope

- Building D-OBJECT, D-CAL, or ball-tracking detectors.
- Running the actual athlete cohort (requires real users; you do that).
- Editing `poseRunner.ts` or pose pipeline wiring (Phase 42B territory).
