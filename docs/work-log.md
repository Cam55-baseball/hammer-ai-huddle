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

## 2026-09-05 — Watch this next, role gating, nutrition totals

### Item 3 — "Watch this next" showed no videos
- `supabase/functions/analyze-video/index.ts`: coaching-stage fault write now records
  `faultPersistence { persisted, attempted, error }`. On failure the audit run's
  `outcome_reason` is set to `coaching_stage_write_failed: <error>` and the same object is
  returned to the client as `fault_persistence`. The write keeps using the service-role
  client — chosen deliberately over adding an INSERT policy, since an athlete should be able
  to read and delete their own findings but never author them.
- `src/pages/AnalyzeVideo.tsx`: "Watch this next" moved directly beneath the detailed
  analysis panel, above ball flight, root pattern and drills.
- In-memory matching from the current run was already in place via
  `src/lib/analysisFeedbackToTaxonomy.ts` (structured `violations_detected` + scorecard areas
  only, never prose), so a first-ever analysis can match without persisted history.
- NOT VERIFIED: no live hitting analysis was run this round, so the row count in
  `analysis_fault_findings` and the returned video titles remain unconfirmed.

### Item 2 — Scouts and coaches must not receive Today plans
- `src/components/hammer/HammerDailyPlan.tsx`: role gate added inside the component (not only
  at call sites). Scout/coach accounts (non-owner) get an honest card explaining plans are for
  athletes, with a link to their own board. Subscription gate unchanged for athletes.
- `supabase/functions/wk-generate-daily/index.ts`: server-side enforcement — scout/coach
  callers get 403 `not_an_athlete_account`; any non-owner/admin without an active
  subscription with modules gets 403 `no_active_prescription`.
- NOT VERIFIED: no live scout/coach session was exercised against the function.

### Item 1 — Nutrition logging reaching the hub
- `src/hooks/useHydration.ts`: every drink write (the single funnel for all hydration paths)
  now invalidates `['macroProgress']` and `['nutritionLogs']`, so hub totals move immediately.
- `src/components/nutrition-hub/NutritionHubContent.tsx`: daily totals now include drinks —
  `hydration_logs.total_carbs_g` is added to carbohydrate and converted at 4 kcal/g for
  calories. `hydration_logs` stores no calorie column, so that derivation is the only honest
  one available. Micros and electrolytes were already written per beverage from
  `hydration_beverage_database`.
- Removed the duplicate `HydrationTrackerWidget` from the Nutrition Hub Today tab.
- `src/hooks/useMealVaultSync.ts`: the real Postgres/RLS message is now surfaced
  ("Meal not saved: <reason>") instead of a generic toast, so a failed Save Meal names itself.
- NOT VERIFIED: before/after hub totals from a live meal + drink log were not captured.

### Suite
- `npx vitest run`: 1135 passed, 10 failed across 7 files — engine fuzz/stress timing,
  drill-recommendation perf, RecruitingStandards, ScoutEvaluation toggles, tempo pipeline,
  PIE V2 scoring, UHRC buildReport. None are in the surfaces touched this round; the perf
  ones vary run to run (6 vs 7 files across two runs).

## 2026-09-06 — Coaching-stage write, role gating, nutrition audit

### Item 3 — "Watch this next" showed no videos
- **Correction to an earlier claim in this session.** I first reported that `analysis_fault_findings`
  had no table grants. That was wrong — `information_schema.role_table_grants` simply returns nothing
  for the read role. `pg_class.relacl` shows `anon/authenticated/service_role` were granted by the
  original creating migration (`20260905220444_...sql` lines 21–22). The re-issued GRANT was a no-op.
- **Verified:** the service role CAN insert into `analysis_fault_findings` (probe insert under
  `SET LOCAL ROLE service_role`, then deleted). The write path is not permission-blocked.
- **Verified:** the table was empty despite 6 recent runs; edge-function logs for `analyze-video`
  have aged out, so the exact reason the live write produced nothing is **not proven**. The write is
  now fully instrumented (below) so the next real run names its own failure.
- **Backfilled** every historical finding deterministically from `videos.ai_analysis ->
  violations_detected`, using the same map as `_shared/faultFindings.ts`. Nothing was invented.
  Result: **483 rows** — hitting 293, pitching 160, throwing 30.
- Library coverage for those correction keys (verified by query):
  `hands_forward_early` 11 videos, `keep_hands_back` 8, `shoulders_turning_early` 7,
  `staying_inside_the_ball` 2, `barrel_stays_behind_hands` 1. Sample titles: "Barry Bonds & Alex
  Rodriguez Talk Hitting", "Executing Elite Contact with Manny", "Getting to contact like an Elite Pro".
  **No library video carries any pitching or throwing correction key** — those domains will still say
  so out loud rather than pad. Not retagged.
- (b) Failure no longer swallowed: `analyze-video` returns `fault_persistence {persisted, attempted,
  error}`, stamps `video_analysis_runs.outcome_reason = coaching_stage_write_failed: <msg>`, and
  `AnalysisVideoRecommendations` now renders a red banner naming the error.
- (c) Already satisfied: the card matches on the CURRENT run's in-memory violations via
  `analysisFeedbackToTaxonomy`, plus stored cross-domain root keys. No padding, no lowered bar.
- (d) "Watch this next" sits directly under the detailed analysis panel, above ball flight and drills.
- **Untested:** a live end-to-end analysis run. Requires a real upload + OpenAI call; not run here.

### Item 2 — scouts/coaches must not receive Today plans
- `HammerDailyPlan` now resolves role itself and renders an honest "your work lives on your own board"
  card with a link to the coach/scout board — no plan, no player logging controls, never blank.
- Server-side: `wk-generate-daily` rejects scout/coach accounts (403 `not_an_athlete_account`) and
  requires an active subscription. `prescription-engine` had **no auth at all** — it now requires a
  bearer token, forbids acting on another user's id, and rejects scout/coach accounts.
- **Untested:** live 403 responses from the deployed functions.

### Item 1 — nutrition logging
- Audited every write path. All meal surfaces (Log Meal quick + detailed, Quick Nutrition Log,
  Vault card, favourites, photo, barcode) funnel into `vault_nutrition_logs`; all drinks funnel
  through `useHydration.addWater` into `hydration_logs`. Both invalidate `['macroProgress']` and
  `['nutritionLogs']`, which is what the hub reads.
- Drink carbohydrate now folds into the hub's daily carbs and calories (4 kcal/g — the only honest
  conversion, since `hydration_logs` stores grams and no calorie figure). Electrolytes and micros are
  read per-ounce from `hydration_beverage_database`, not treated as water.
- `useMealVaultSync` no longer hides the real Postgres/RLS message behind a generic toast.
- **The hydration button in the top header does not exist.** Searched every header/nav component;
  hydration logging only appears inside the Nutrition Hub (Log Meal card's "Log drinks" and Quick
  Actions). Nothing to remove — flagging rather than inventing a change.
- **Untested:** a live meal save and drink save with before/after hub numbers.

### Suite
`vitest run`: **1141 passed, 4 failed** (134 files). The 4 failures are pre-existing and in untouched
areas (UHRC `buildReport`, tempo pipeline, PIE V2 scoring, engine fuzz timing).

## 2026-09-02 — In-app video playback, cover images, tag reachability

**Bug 1 — leaving a video signed the athlete out.**
Every "Watch" button used to hand the browser to YouTube/Vimeo/X/TikTok. All of
them now open a player inside the app:
- New `src/components/video/useVideoLightbox.tsx` — one-line overlay player for any surface.
- Converted: `TodaysHammerPick`, `DailyPlanVideoChips`, `VideoSuggestionsPanel`,
  `VideoMoment`, plus the analysis "Watch this next" list (done earlier this turn).
- Platform clips play in an embedded frame, our own uploads in a normal player.
  Closing returns to the same screen and scroll position; nothing navigates away,
  so the session is never re-entered.
- The only remaining external links are the deliberate "Open original" escape
  hatches inside the player itself, which open a separate tab (`noopener`) and
  leave the app page intact.

**Bug 2 — no cover images.**
- 7 platform clips backfilled from their host (verified in the database).
- New owner tool `ThumbnailBackfillCard` (top of the Video Library manager)
  renders a real frame for our own uploads in the browser and stores it; it
  reports how many succeeded and names every one that failed.
- X and TikTok clips keep a clean labelled placeholder — those hosts do not give
  us a picture. Never a broken image.

**Tag coverage — see `docs/video-tag-coverage.md`.** Both lists are there, kept apart:
- (a) Unreachable by code: was 87 of 217 active tags, now **0**. Causes and fixes
  are tabulated in that file (context-only callers were blocked; fielding and base
  running had no surface at all; nothing produced result-layer keys; game data was
  never read).
- (b) No video: **163 of 217**, listed per domain and layer as a filming list.
  Nothing was retagged and no tag was created.

**New: recommendations from game data.** `src/lib/games/gameOutcomesToTaxonomy.ts`
turns logged at-bats, pitches, defensive plays and base-running into the same tag
keys, surfaced by `GameVideoRecommendations` on the game overview tab.

**Relevance.** Ranking uses current faults, cross-domain root patterns, what the
current plan is working on, and season phase. Tier-3 picks carry a "General"
badge and say so in words.

### Verified myself
- Real hitting match run against the live library: 4 videos returned —
  "Getting to contact like an Elite Pro" (movement + context + correction + result),
  "Hank Aaron on Getting to the inside pitch" (result + movement + correction + context),
  "Executing Elite Contact with Manny" (result + movement + correction),
  "Getting to power launch spot with Manny" (movement + result + correction + context).
  One of the four has a cover image; the other three are self-hosted uploads awaiting
  the owner's one-click cover backfill.
- Every active tag key now appears in at least one code path (scripted check, 0 left).
- Typecheck clean. Test suite: 1141 passed, 4 failed — all four in
  `src/lib/uhrc/__tests__/buildReport.test.ts`, untouched by this work and failing
  before it.

### Untested
- Cover-image generation for the 7 self-hosted `.mov` files: it runs in the owner's
  browser, so it cannot be proven from here. Failures are named on screen rather
  than swallowed.
- The game-data recommendation panel has no logged game with defensive errors in
  the database yet, so it has not been seen with real rows.

## 2026-09-06 — Scout/coach setup loop + player-plan leak

**Bug 2 — scout/coach setup re-prompted every login (fixed)**
- Migration: `completed_at timestamptz` added to `scout_context` and `coach_context`; existing rows backfilled from `updated_at`/`created_at`.
- `useStaffOnboardingState` and the post-login gate in `Auth.tsx` now read ONLY `completed_at` — no more inferring completion from `org_name`.
- Scout and coach flows save each step as it is completed (`goNext` persists, never blocks), so a dropped session resumes in place.
- Every field is optional. Each step shows a banner saying so, with **Skip setup**; **Finish setup** and **Skip setup** both stamp `completed_at`. Organization labels now read "(optional)".
- Backfill verified in the database:
  - scout_context: user 8171e031… roles {admin,scout}, org_name NULL, `completed_at 2026-09-06 03:19:14Z`.
  - coach_context: user 00d8be78… org_name NULL, `completed_at 2026-09-05 23:13:52Z`.

**Bug 1 — scouts/coaches saw the player Game Plan (fixed)**
- New `public.has_player_module(uuid)` SECURITY DEFINER function: true only when the account has an active subscription with at least one purchased module. Purchase, not role, is the test, and it is evaluated server-side.
- New `usePlayerModuleAccess()` hook wraps that RPC.
- Surfaces switched from role checks to purchase checks:
  - `Dashboard.tsx` — all player-only blocks (player Game Plan, self-grading, photo logging, player prescriptions, Today cards).
  - `HammerDailyPlan.tsx` — staff without a purchased module get the honest "no plan on your account" card; staff WITH a purchase now get the plan in addition to their own board (previously blocked for all staff).
  - `AppSidebar.tsx` — My Followers, nutrition items and notification settings.
- Scout/coach boards are untouched — the blue scout plan still renders from `CoachScoutGamePlanCard`.

**Verified myself**
- Database rows above, read directly.
- `has_player_module` returns false for the owner's admin+scout account (no purchased module) → the red player plan is gated off for it.
- Typecheck clean. `appSidebarPitchTipping` suite fixed (it needed the new hook mocked) — 5/5 pass. Build OK.

**Not verified (blocked)**
- End-to-end sign-in as the scout account: minting a session for a specific user needs approval that isn't available here, so the three-login "prompt does not reappear" walkthrough was not run in a browser. The logic path (`completed_at` → `hasStaffContext` → no onboarding redirect) was verified by reading the row and the gate code, not by clicking through.

**Suite:** 1135 pass / 10 fail. The 10 are in engine-invariants, drill-scoring stress/perf, pose-stub and ambidextrous-pitching tests, all untouched by this work.
