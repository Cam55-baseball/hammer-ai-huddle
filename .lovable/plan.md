## Fixes

### 1. Warm-up card at the top of Hammers Today

In `src/components/hammer/HammerDailyPlan.tsx`, split `plan.blocks` into `warmupBlocks` (`modality === "warmup"`) and `otherBlocks`, then render in this canonical order:

```text
HammerScheduleStrip
GpInGameAdvisoryStrip
"Do in this order" hint
Warm-up block(s)               ← moved to top
WkSpeedCard
WkBatSpeedCard
WkLiftsCard
otherBlocks (practice, sport, fueling, recovery, …)
WkConditioningCard
```

Update the "Do in this order" hint text to lead with **Warm-up → …** and, when `!gpSig.gameToday` and the resolved season is `in_season`, include a `Cross-sport activation` step inside the warm-up phrase.

### 2. Cross-sport activation inside Warm-up when In-Season

In `src/components/hammer/HammerWarmupDialog.tsx` (opened by the warm-up block via `hammer:open-warmup-generator`), append an **In-Season Cross-Sport Activation** section (~3–5 min low-CNS ballistic/coordination moves — light med-ball throws, band rotations, jump-rope, agility ladder) when `useSeasonStatus().resolvedPhase === "in_season"` (and `gpSig.gameToday === false`). Server-side, extend `buildHammerDailyPlan`'s warm-up block (`src/lib/hammer/prescription/dailyPlan.ts` case `"warmup"`) so its `why`/`drills` explicitly mention the cross-sport activation add-on during in-season, keeping the block a single card (not a new card).

### 3. Season label drift ("Off-season Q1" vs. "In Season")

Root cause: the four WK cards render `snapshotIdentity.season_phase` — which comes from the edge function's `resolveWkPhase` — while the plan header, profile, and other cards read `useSeasonStatus().resolvedPhase`. When a user has `season_status = "in_season"` but no `preseason_*` / `post_season_*` dates saved, the server resolver falls back to `os_q1` (default branch in `supabase/functions/_shared/wkPhaseQuarter.ts`) while the client shows `in_season`.

Fixes (both required so it stays consistent E2E):

- **Server (authoritative):** in `supabase/functions/_shared/wkPhaseQuarter.ts`, when `resolveSeasonPhase` returns `off_season` with `source === "default"` (i.e. no explicit off-season window) AND the stored `settings.season_status` is `in_season` or `post_season`, honor the stored status instead of defaulting to `os_q1`. Only fall back to `os_q1` when the athlete truly has no signal.
- **Client (defensive):** in `WkSpeedCard`, `WkBatSpeedCard`, `WkLiftsCard`, `WkConditioningCard`, replace the `seasonDisplayLabel(snapshotIdentity.season_phase)` label with a helper `useCanonicalSeasonLabel()` that prefers `useSeasonStatus().resolvedPhase` and falls back to `snapshotIdentity.season_phase`. This guarantees the four cards match the profile + plan header even before the next generation.
- Trigger a one-shot `generate()` re-run after `useSeasonStatus` auto-corrects the stored phase so any prescriptions stamped with the wrong phase are refreshed (invalidate the `wk-daily-prescriptions` query key inside the auto-correct effect in `src/hooks/useSeasonStatus.ts`).

### 4. "Add to game plan" + "Ask Hammer" buttons on Speed / Bat Speed / Lifts / Conditioning cards

Create `src/components/hammer/cards/CardActions.tsx` — a shared footer button row with two actions:

- **Add to game plan** — creates a `custom_activity_template` via `useCustomActivities.createTemplate`, mirroring the existing `handleAddToGamePlan` in `HammerDailyPlan.tsx`. Accepts `{ title, modality, drills, why }` per card and toasts on success.
- **Ask Hammer** — opens an inline mini-chat (same `useHammerChat` hook already used by `HammerDailyPlan`) pre-loaded with `categoryFocus` = card modality + current drills, so answers are contextual.

Mount `<CardActions … />` inside `<CardContent>` of `WkSpeedCard`, `WkBatSpeedCard`, `WkLiftsCard`, and `WkConditioningCard`, feeding it the card's `items` (grouped prescriptions) plus a stable title (e.g. `"Speed — <phase display>"`). Guard: hide the buttons when `items.length === 0` or `isLoading`.

### 5. E2E verification

- Playwright script hits `/athlete/command`, logs in via injected Supabase session, and asserts:
  - Warm-up card renders **before** Speed on the DOM (`data-card-type` ordering).
  - When `season_status = in_season` (no date windows), all four WK cards + plan header + profile show the same "In Season" label (no `os_q1`).
  - "Add to game plan" and "Ask Hammer" buttons are present and click-responsive on Speed, Bat Speed, Lifts, Conditioning cards.
  - "Add to game plan" click creates a row in `custom_activity_templates` and shows the success toast.
- Re-run `scripts/audits/phase-12-plus-super-gate.ts` to confirm no invariant regression from the resolver change.
