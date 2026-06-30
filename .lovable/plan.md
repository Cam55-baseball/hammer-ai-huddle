## Final E2E Verification — Elite Pregame Plan, release-ready sweep

Re-issuing the approved closure plan unchanged, plus an explicit release-readiness gate so I can tell you "ship it" with evidence, not vibes.

### 1. Re-verify every shipped item (read-only)
- `src/components/games/GameSheet.tsx` `OverviewPanel` — Probable-pitcher Select (via `usePitcherDossiers`), "— None —" clears, "+ New scouting profile…" opens dossier drawer, on-change patches `probable_pitcher_dossier_id`, chip + "Open profile" link render when set.
- `src/components/games/ActivePlanCard.tsx` — One-tap "Generate elite plan" wired to `usePregamePlans({role:"pitcher", dossierId}).generate.mutate({sport, gameId})`; spinner, disabled state, `generate.error?.message` surfaced (covers AI gateway 402/429); empty-state copy when no pitcher tagged; mounts on Overview AND Live tabs.
- `src/components/games/AtBatLogger.tsx` — Reads `probable_pitcher_dossier_id` as default `opponent_pitcher_id`, snapshots `pitcher_archetype_snapshot`, propagates `dossierId` to `AbSwingPanel`.
- `src/components/games/AbSwingPanel.tsx` — Receives `dossierId`, tags swing analyses with matchup context.
- `supabase/functions/gp-pregame-plan` — V2 schema (My attack, Get me out, Counts, Situations, Sequencing, Edges, Cues) pulling direct AB history, direct pitch heatmap, archetype fallback, global zone tendencies, velo-band splits, priors, recent form, user context.
- `supabase/functions/gp-update-priors` — EWMA learning loop fires on every cue / situational thumb.
- `src/components/games/PregamePlanPanel.tsx` — All 7 V2 tabs render.
- `src/pages/Dossiers.tsx` — Empty-state hint "Tag a pitcher on a game to unlock the elite plan."

### 2. Release-readiness gate (must all pass)
- `bunx tsgo --noEmit` clean.
- `bash scripts/preflight.sh` clean (invariants + side-context lint + no-legacy-games + eternity guards + targeted vitest).
- `bash scripts/check-eternity-guards.sh` PASSED (raw `lazy()`, "Progress Dashboard" drift, AuthContext drift, duplicate routes, raw `signOut`).
- DB grants: re-confirm `gp_pregame_plans`, `gp_plan_outcomes`, `gp_planner_priors`, `gp_pitcher_dossiers`, `gp_opponent_hitters`, `gp_ab_swing_analyses` all have `authenticated` + `service_role` grants and RLS scoped to `auth.uid()`.
- Edge function smoke: `supabase--curl_edge_functions` against `gp-pregame-plan` with a fixture body → 200 + V2 schema shape; `gp-update-priors` → 200; `gp-analyze-ab-swing` → 200.
- Headless Playwright E2E (single script under `/tmp/browser/pregame-e2e/`): restore Supabase session → open a game → tag probable pitcher → tap "Generate elite plan" → assert 7 tabs render → open an AB → assert `opponent_pitcher_id` prefills → upload tiny swing clip → thumb a cue → query `gp_plan_outcomes` for the new row → screenshot each step.
- `security--get_scan_results` shows no unresolved critical findings.
- Website info preflight: title, meta description, OG, Twitter, favicon all match the app (patch any drift before publish).

### 3. Patch only what the audit finds
Any gap surfaced by steps 1–2 gets a minimal targeted fix (no scope expansion, no redesign). If everything passes, no code changes.

### 4. Release call
Once the gate is fully green, I'll tell you plainly: **"Release-ready — safe to publish"**, with the evidence list (typecheck, preflight, eternity guards, edge smoke, Playwright screenshots, security scan). If any check fails, I'll list the exact failures and the smallest fix for each before recommending publish.

### Out of scope
Schema changes, edge function refactors, new dossier types, redesign of the 7-tab plan view, any feature work beyond the approved closure plan.
