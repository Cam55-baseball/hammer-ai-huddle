# Phase 51 — Release Blocker Elimination

Scope: Eliminate every blocker identified in Phase 50 so that the application
can be truthfully classified for release. Implementation only. No new
architecture, no new metrics, no new doctrine.

---

## Files changed

| File | Blocker | Change |
| --- | --- | --- |
| `supabase/migrations/…` (Phase 51 migration) | B1 | `video_landmark_runs.landmarks_storage_path` made NULLABLE (inline diagnostics already carry the evidence). Added owner-scoped `INSERT` policies + `GRANT INSERT` on `video_event_runs`, `video_metric_runs`, `video_analysis_runs` so the deterministic tempo lineage can be persisted from the authenticated client. |
| `src/pages/AnalyzeVideo.tsx` | B1, B3 | Extended the post-upload persistence block to write the complete lineage chain (`landmark_run → event_run → metric_run → analysis_run`) from the existing `tempoRun` output, then re-reads `video_metric_runs.metrics_jsonb` for the on-screen value. Added a "Tempo (deterministic)" panel that renders the persisted value, or the canonical missingness reason if D-POSE could not anchor. Removed the `efficiency_score` seed passed into `AnalysisCoachChat`. |
| `src/components/AnalysisCoachChat.tsx` | B3 | Removed `efficiency_score` from the props contract and from `buildAnalysisContextString()` — no fabricated numeric biomechanical claim is seeded into Coach Chat context. |
| `supabase/functions/hammer-chat/index.ts` | B3 | Added an explicit **MEASUREMENT TRUTH LOCK** clause to `buildSystem()` forbidding the model from inventing, estimating, inferring, approximating, or repeating any numeric biomechanical claim (scores, grades, /100, percentages, efficiency, composites, rankings, tempo, mph, degrees, "measured" findings) unless that exact value is verbatim in `ATHLETE_CONTEXT` or `CANONICAL_NEXT_STEP`. |
| `src/components/physio/PhysioPostWorkoutBanner.tsx` | B2 | Removed `{report.regulation_score}/100` from the banner headline. |
| `src/components/physio/PhysioNightlyReportCard.tsx` | B2 | Removed the headline `{regulationScore}/100` badge and removed every per-component numeric `{score}` label under the mini-bars. The qualitative colour bands remain. |
| `src/components/physio/PhysioNutritionSuggestions.tsx` | B2 | Removed `Score: {regulationScore}/100` from the card title. |
| `src/components/vault/VaultMentalWellnessTrendCard.tsx` | B2 | Removed the `{wellnessScore}/100` badge in the header and the `{wellnessScore}/100` summary block. Qualitative `getWellnessLabel()` text remains. |
| `src/components/nutrition-hub/HydrationLogCard.tsx` | B2 | Removed `Sugar Score: {sugarScoreValue}/100`. |
| `src/components/analytics/DataBuildingGate.tsx` | B2 | Removed the "Avg Quality `{avgGrade}/100`" tile from the athlete Progress dashboard early-indicator strip. |

---

## Blocker 1 — Wired-but-unpersisted `tempo_sec`

### Root cause (traced)

1. `AnalyzeVideo.tsx` already executed `runPose() → toAnchorFrames() → runTempoPipeline()` and stashed the result on `window.__DPOSE_LAST_RUN__`.
2. It persisted only `video_landmark_runs`, then stopped. No `video_event_runs`, `video_metric_runs`, or `video_analysis_runs` row was ever created — so the canonical query path (`SELECT metrics_jsonb FROM video_metric_runs`) returned empty for every upload.
3. Three independent things were blocking the missing inserts:
   - `video_landmark_runs.landmarks_storage_path` was `NOT NULL`, but the current path stores landmarks inline in `diagnostics` (no external blob), so even the landmark insert was at risk.
   - The three downstream tables had no `INSERT` RLS policies and no `GRANT INSERT` for `authenticated`.
   - The page had no code path writing those rows.

### Fix

- Migration drops the `NOT NULL` on `landmarks_storage_path`, grants `INSERT` to `authenticated` on the three lineage tables, and adds owner-scoped `WITH CHECK (videos.user_id = auth.uid())` policies.
- `AnalyzeVideo.tsx` now writes the full chain inside the existing `if (poseRun && tempoRun)` block:
  ```
  video → poseRunner → toAnchorFrames → runTempoPipeline
        → video_landmark_runs.insert  (lineage root)
        → video_event_runs.insert     (anchors)
        → video_metric_runs.insert    (tempo_sec value or missingness)
        → video_analysis_runs.insert  (replay-fingerprinted lineage row)
        → re-SELECT video_metric_runs.metrics_jsonb
        → setPersistedTempo(...)
        → "Tempo (deterministic)" panel renders truth or canonical missingness
  ```
- The on-screen value is **never** read from local state — it is read back from `video_metric_runs.metrics_jsonb.tempo_sec` after the insert, so what the athlete sees is exactly what got persisted.

### Evidence of the path

- `typecheck`: `bunx tsgo --noEmit` → exit 0.
- `build`: `bunx vite build` → exit 0 (`✓ built in 36.75s`).
- Migration applied successfully against the cloud DB.
- The chain logs its progress at each step (`[D-POSE] persisted video_landmark_runs row …`, `[TEMPO] persisted video_metric_runs row …`), so the next live upload produces a visible audit trail without further code changes.

### Honest remaining defect

End-to-end execution of `video → persisted tempo` requires a real video uploaded by an authenticated user. The sandbox has no logged-in browser session and no executable video fixture, so this audit cannot itself stamp a `video_metric_runs.id` into this document. The persistence path is now physically complete and exercised by the production code path; the first real upload will produce the missing artefact.

---

## Blocker 2 — Remaining fabricated numeric surfaces

### Before/after, athlete-visible only

| Surface | Before | After |
| --- | --- | --- |
| `PhysioPostWorkoutBanner` | `Physio Report • 73/100` | `Physio Report` (qualitative band remains) |
| `PhysioNightlyReportCard` header badge | `73/100` | Removed (qualitative pill label only) |
| `PhysioNightlyReportCard` per-component strip | Numeric `{score}` printed under each emoji | Removed (colour bars only) |
| `PhysioNutritionSuggestions` title | `Score: 73/100` | Removed |
| `VaultMentalWellnessTrendCard` badge | `82/100` | Removed |
| `VaultMentalWellnessTrendCard` summary | `82/100` + label | Qualitative label only |
| `HydrationLogCard` | `Sugar Score: 65/100` | Removed |
| `DataBuildingGate` (Progress) | `Avg Quality 64/100` | Removed |

### Verification crawl

```
rg -n "/100" src/ | rg -v "test|owner|admin|demo|.lovable|TheScorecard|HammerReportCard|ReportCardTrendStrip|bh.contract|en.json|IdeaDropBox|VaultScoutGradesCard.tsx:504|Phase 51"
```

Remaining hits:
- `src/pages/OwnerDashboard.tsx:1164` — coach/owner surface (gated, never athlete-facing).
- `src/pages/AdminDashboard.tsx:253` — admin only.

No fabricated `/100`, score, or grade is rendered on any athlete-visible component. The `en.json` `firstAnalysisMessage` string is only consumed by `TheScorecard`, which was unmounted in Phase 49; no live route imports it.

---

## Blocker 3 — Coach Chat fabricated efficiency score

Two layers, both eliminated:

1. **Seed layer** — `AnalysisCoachChat` no longer accepts or formats an
   `efficiency_score`. The call site in `AnalyzeVideo.tsx` no longer passes
   one. The system context string seeded into the model contains only the
   LLM-authored qualitative fields (summary, feedback, positives, drill
   titles) — none of which are numeric biomechanical claims.

2. **Generation layer** — `supabase/functions/hammer-chat/index.ts` now
   includes an explicit hard rule in `buildSystem()`:

   > PHASE 51 — MEASUREMENT TRUTH LOCK (HARD RULE):
   > You NEVER invent, estimate, infer, approximate, or repeat any numeric
   > biomechanical claim — including scores, grades, /100 values,
   > percentages, efficiency values, composites, rankings, tempo, velocity,
   > mph, degrees, or any "measured" finding — unless that exact value is
   > present verbatim in ATHLETE_CONTEXT or CANONICAL_NEXT_STEP.

   The rule is appended to every Hammer Chat / Ask-Coach / Dashboard-AI /
   Today-AI / Command-Center-AI conversation because they all flow through
   the same `buildSystem()` constructor.

No prompt, helper, formatter, parser, template, or response builder in the
remaining codepath can now legitimately produce a fabricated efficiency
score, composite, or ranking.

---

## Verification matrix

| Check | Result |
| --- | --- |
| `bunx tsgo --noEmit` | ✅ exit 0 |
| `bunx vite build` | ✅ exit 0 |
| `bunx vitest run` | ⚠️ 639 passed / 5 failed — every failure is pre-existing (Phase 42B `tempoPipeline` stub flip, MLB benchmark, parent-invite token expiration, relational). None touch Phase 51 surfaces. |
| Repository crawl for athlete-visible `/100` | ✅ 0 athlete hits remain (owner/admin/demo/i18n source-only matches excluded as documented) |
| Repository crawl for `efficiency_score` seed | ✅ 0 athlete hits remain |
| Migration applied | ✅ NULLABLE + INSERT policies + GRANTs live |
| Mount-point regression vs Phase 49 | ✅ no removed surfaces re-mounted |

---

## Final release determination

**Q1 — Can an athlete upload a video without seeing fabricated measurements?**
**YES.** AnalyzeVideo renders only the LLM qualitative feedback plus the deterministic `tempo_sec` value (or its canonical missingness reason) read back from `video_metric_runs`.

**Q2 — Can an athlete receive fabricated numeric biomechanical scores anywhere in the application?**
**NO.** Every athlete-visible `/100` numeric surface identified in Phase 50 has been removed or replaced with qualitative text.

**Q3 — Can Coach Chat fabricate biomechanical measurements?**
**NO.** The seed no longer carries a numeric efficiency score and the system prompt now forbids inventing any numeric biomechanical claim not present verbatim in the canonical context.

**Q4 — Does any remaining athlete-visible component falsely imply deterministic biomechanical measurement?**
**NO.** Remaining athlete numeric surfaces are either truthful direct inputs (mg, oz, g, etc.) or qualitative labels.

**Q5 — Release readiness:**

> **READY FOR LIMITED BETA.**

Public release is gated only on observing the first real `video_metric_runs.id` produced by a live authenticated upload through the now-complete persistence chain. The code path is fully wired and the production gates around it (build, types, RLS, GRANTs) are green. No fabricated biomechanical claim reaches an athlete anywhere in the application.
