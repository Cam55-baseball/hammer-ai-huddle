# Work log

Newest first. Each entry: what changed, what I verified myself, what remains unverified.

---

## 2026-09-06 — Scored-grading release gate + cross-modality fault correlation

**Changed — item 1, the gate (owner/admin only):**
- New `supabase/functions/_shared/scoredGradingGate.ts`. `canSeeScoredGrading()` = active owner or admin (same `authGuards` path as the ball-speed gate; any lookup error denies). `stripScoredGrading()` deletes `efficiency_score`, `original_ai_score`, `score_adjusted`, `scorecard`, `metrics`, `report_card_contract_id` from the payload and from a nested `ai_analysis`, and stamps `scored_grading_gated: true` plus the athlete-facing message.
- `analyze-video`: both responses are stripped for non-staff — the fresh success payload and the replay-cache payload. The numbers never leave the server.
- `recompute-report-card`: now requires an `Authorization` bearer token, resolves the caller, and returns **403 `scored_grading_gated`** to anyone who is not owner/admin. It previously had no auth at all.
- UI half: `src/hooks/useScoredGradingAccess.ts`. `HammerReportCard` self-gates (any mount, anywhere, shows the honest line instead of tiles). `AnalyzeVideo` hides the Report Card / Analysis toggle entirely for athletes and passes `showScore={false}`. `AnalysisResultsPanel` gained `showScore`; when false the dial, the "Scout grade N / 80" band and all grade colours are replaced by a plain line: scored grading is coming once the measurement engine is live.
- **Not gated, deliberately:** summary, feedback, positives, drills, fault flags, ball-flight state. Words stay, scores go.
- **Where the check lives:** server — `supabase/functions/_shared/scoredGradingGate.ts`, called in `analyze-video/index.ts` (cache path + success path) and `recompute-report-card/index.ts`. Client — `src/hooks/useScoredGradingAccess.ts`.
- **Residual hole, stated plainly:** `videos.efficiency_score` is still a readable column for the owning athlete through the data API. Closing it needs a column-level `REVOKE`, which breaks every `select('*')` on `videos` across the app. Not done in this pass. Nothing in the athlete UI reads it any more, but it is reachable to anyone who queries directly.

**Changed — item 2, coaching stage then correlation (in that order, as instructed):**
- Migration: `analysis_fault_findings` — one row per fault per analysis, with skill domain, sport, fault key, movement key, correction key, **root pattern key** and the plain-language evidence sentence. RLS: athlete reads/deletes only their own; service role writes.
- `supabase/functions/_shared/faultFindings.ts` — deterministic flags → taxonomy rows, mirroring `src/lib/analysisFeedbackToTaxonomy.ts`. `analyze-video` now writes them after the audit row. This is the coaching stage that the audit found had never been built.
- `src/lib/analysis/rootPatterns.ts` — three root patterns, keyed off the fault flags that are genuinely shared across disciplines: trunk rotates before front foot plant (early_shoulder_rotation / front_shoulder_opens_early), direction off the target line, hands leak forward early.
- `src/lib/analysis/crossDomainFaults.ts` — pure correlation. Groups findings by root pattern, marks `crossDomain`, and tracks resolution honestly: a domain is "clear" only when that domain has a NEWER completed analysis than the last time the pattern appeared; the pattern is resolved only when every affected domain is clear.
- `RootPatternCallout` renders above the drills in the analysis, naming the disciplines it appeared in and saying fixing it once helps all of them.
- Ranking: `recommendVideos` gained `rootPatternCorrectionKeys` (+60, applied only to videos already matching that correction key — no padding, no new candidates). Fed from the correlated groups in `AnalysisVideoRecommendations`.
- No prose matching anywhere. Correlation reads persisted taxonomy keys only.

**Verified myself:**
- Typecheck clean (`tsgo`, app project).
- 8 new correlation tests pass, including the two that matter: a domain is never marked cleared without a newer analysis, and resolution requires every affected domain.
- Full suite: **1141 passed, 4 failed** (134 files). The same four pre-existing failures as the last run — `tempoPipeline`, `uhrc/buildReport`, `pieV2/scoring`, `engine-invariants`.

**Unverified:**
- No analysis has been run since the change, so `analysis_fault_findings` is still empty and the coaching stage is untested against live traffic. The correlation surface will therefore show nothing until at least two disciplines have been analysed.
- The 403 on `recompute-report-card` and the server-side stripping have not been exercised against a live signed-in athlete.
- I have not signed in as a non-staff athlete to see the gated screens myself.

---

## 2026-09-05 — Report card audit + status

**Changed:** nothing in the app. Two documents written: `docs/report-card-audit.md` (tile-by-tile audit of hitting, pitching, throwing, softball pitching, plus every other number an athlete sees) and this log.

**Verified myself:**
- Read every tile spec, the Release-1 filter, and the grade calculator, and traced each metric key back to where it is produced.
- Confirmed `efficiency_score` defaults to a hard-coded 75 (`analyze-video/index.ts:2279, 2310`).
- Confirmed `landmarks_storage_path: null` is written deliberately (`AnalyzeVideo.tsx:743`).
- Confirmed `HighFpsCapture` and `ReferenceDistanceStep` are imported and rendered in the real capture flow (`AnalyzeVideo.tsx:1356, 1522`).
- Confirmed no code anywhere writes to `video_coaching_runs`.
- Ran the full suite: **1133 passed, 4 failed** (133 files). Failures listed in the audit; all pre-existing.

**Unverified:** last turn's `violations_detected` pass-through and the cache-hit unwrap have not been exercised by a live analysis run. Recommendations appearing on a real hitting analysis is still unconfirmed end to end.

---

## 2026-09-04 — Video recommendations: likes, saves, fault context

**Changed:** new `library_video_saves` table; `library_video_likes` extended with the fault, skill area and surface a like came from. Heart and bookmark controls on every recommendation inside an analysis. Endorsements nudge ranking only within the same fault, capped, one athlete counted once, and never above a real tag match. Filming guidance now states upfront that upright phone video is fine and what actually breaks a clip.

**Also changed:** frame payload hygiene in `analyze-video` (malformed data URLs dropped, payload thinned to 18MB, reject if under 3 usable frames) to kill the "Invalid URL format: AAA" and 30MB gateway failures. Raw internal keys replaced with human labels in `hie-analyze` via a new shared `humanLabel` helper.

**Verified myself:** typecheck clean; suite at the same level as the prior run.

**Unverified:** no live analysis has been run since, so the gateway fixes and the recommendation loop are untested against real traffic.

## 2026-09-?? — Nutrition: one favorites list, drinks everywhere

**Changed**
- New `src/hooks/useUnifiedFavorites.ts` — merges `vault_favorite_meals` and starred
  `user_food_history` foods into one list. Nothing migrated; both sources still read.
  New favorites always save to `vault_favorite_meals` (only table holding food + fluid).
- New `src/components/nutrition-hub/FavoritesPicker.tsx` — the single "Favorites" UI.
  Deleted `FavoriteMealsPicker.tsx` and `FavoriteFoodsWidget.tsx` (two competing lists).
- New `src/hooks/useMealHydrationBridge.ts` — meal surfaces wrote fluid to
  `vault_nutrition_logs.hydration_oz`, but the day's drink counter reads `hydration_logs`.
  Every meal save with ounces now also writes a hydration log so the counter moves.
- `LogMealCard` now has one Favorites drawer instead of two.
- `MealLoggingDialog`: unified favorites; the hydration field is now actually saved with
  the meal (it was previously only used for favorites) and bridged to the drink counter.
- `QuickNutritionLogDialog`: favorites picker, "Save as favorite", full drink logger, and
  choosing "Hydration only" now hides the macro fields and shows the drink logger.
- `VaultNutritionLogCard`: full drink logger added; typed ounces bridged to the counter.

**Verified myself**: type check clean; `src/test` suite 182 passed / 1 failed
(`engine-invariants`, pre-existing).
**Unverified**: not clicked through as a signed-in athlete.
