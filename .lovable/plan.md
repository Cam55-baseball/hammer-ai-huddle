## Final E2E Closure — Elite Pregame Plan, fully reachable & cross-correlated

Re-issuing the approved plan unchanged so we can verify every item is shipped end-to-end and patch any gap found during the audit.

### 1. Probable-pitcher picker on Game Overview
`src/components/games/GameSheet.tsx` (`OverviewPanel`)
- `usePitcherDossiers(game.sport)` lookup.
- "Probable pitcher today" Select above Positions; "— None —" clears; "+ New scouting profile…" opens the dossier drawer.
- On change → `onPatch({ probable_pitcher_dossier_id: value || null })`.
- When set, chip "Plan + per-AB defaults use {pitcher.name}" with "Open profile" link.

### 2. One-tap "Generate elite plan" inside ActivePlanCard
`src/components/games/ActivePlanCard.tsx`
- When `pitcherId` set but no plan exists → primary Button → `usePregamePlans({role:"pitcher", dossierId:pitcherId}).generate.mutate({ sport, gameId })`.
- Spinner + disabled state; surface `generate.error?.message` (covers 402/429 from AI gateway).
- Empty-state copy when no pitcher tagged. On success the existing `["active-plan", ...]` query invalidates and the full plan UI hydrates.

### 3. Cross-correlation verification (read-only audit, patch any loose prop)
- `AtBatLogger` reads `probable_pitcher_dossier_id` as default `opponent_pitcher_id` and snapshots `pitcher_archetype_snapshot`.
- `AbSwingPanel` receives `dossierId` from the AB's pitcher (fallback to game's probable pitcher).
- `gp-pregame-plan` edge fn already pulls direct AB history, direct pitch heatmap, archetype fallback, global zone tendencies, velo-band splits, priors, recent form, user context.
- `useLogPlanOutcome` → `gp-update-priors` (EWMA) fires after every thumb up/down on cues + situational entries.
- `PregamePlanPanel` renders all 7 V2 tabs (My attack, Get me out, Counts, Situations, Sequencing, Edges, Cues).

### 4. Reachability polish
- `GameSheet` Live tab: `ActivePlanCard` mounts even when no AB is open.
- One-line empty-state hint on Scouting Profiles list: "Tag a pitcher on a game to unlock the elite plan."

### Verification (build mode)
- `bunx tsgo --noEmit` clean.
- Headless Playwright run: open a game → tag a pitcher → tap "Generate elite plan" → confirm 7-tab plan renders → open an AB → confirm `opponent_pitcher_id` prefills → confirm `AbSwingPanel` receives the dossier id → thumb a cue → confirm `gp_plan_outcomes` row and `gp-update-priors` invocation.

### Out of scope
Schema changes, edge function refactors, new dossier types, redesign of the 7-tab plan view.
