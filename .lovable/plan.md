## Goal

Let switch hitters / ambidextrous throwers tag each ranked sub-goal with a side (L, R, or Both) inside `CategoryGoalsStep` (onboarding) and `CategoryGoalsCard` (settings), persist it through the V2 payload, and feed it into the existing side-bias intelligence — without breaking non-switch athletes who should still see no picker.

## Scope

1. **Data model (`src/lib/hammer/goals/categoryGoals.ts`)**
   - Extend `SubGoalPick` with `side?: 'L' | 'R' | 'both'`.
   - `normalizePicks` accepts/sanitizes the `side` field (legal values only; default `undefined`, meaning "unscoped / both"). Fully back-compatible: legacy picks without `side` load unchanged.
   - `scoreSkillLevers` extended to optionally accept `{ side?: 'L' | 'R' }`. When passed, picks tagged for the opposite side contribute 0; `both` / untagged picks contribute normally. Default call signature unchanged → no regression for existing callers.
   - `v2ToV1` unchanged (side is detail, not rank).

2. **UI chip — onboarding (`CategoryGoalsStep.tsx`)**
   - Gate on `useSideContext()`: only render the side chip for the relevant discipline (hit chip on hitting/power sub-goals when `isSwitchHitter`; throw chip on throwing/pitching sub-goals when `isAmbidextrousThrower`).
   - Compact 3-segment toggle `R / L / Both` next to each selected sub-goal (primary + secondary), defaulting to the athlete's last-used side for that discipline, falling back to `both`.
   - Toggling writes `side` into the pick within the V2 payload via the existing autosave path. No new save button required.

3. **UI chip — settings (`CategoryGoalsCard.tsx`)**
   - Mirror the same per-pick chip in the editable view. Read-only view shows a tiny `SideBadge` next to picks that have a side.

4. **Review surface (`ReviewAnswersStep.tsx`)**
   - When rendering picks, append `SideBadge` if `side && side !== 'both'`.

5. **Intelligence wiring**
   - `src/lib/hammer/prescription/dailyPlan.ts`: where it calls `scoreSkillLevers(...)`, when the current plan block is side-aware (hitting / throwing / pitching) and the athlete is switch/ambi, pass `{ side: activeSide }`. This makes per-side goals actually steer the per-side dosing already produced by `applySideBias`.
   - `src/lib/side/sideBias.ts`: no signature change; goal-derived bias becomes a multiplier on the side already favored by performance differential (additive, never replaces the perf-based bias).

6. **Non-switch safety**
   - `SideContextPicker`-style gating: chip never renders, `side` field is never written, downstream `scoreSkillLevers()` default call path stays identical. Verified by reading `useSideContext().shouldShowPicker(discipline)`.

7. **Lint / regression**
   - `scripts/lint-side-context.ts` already scans for side-aware writes on side-aware tables. `athlete_context.category_goals` is a JSON blob, not a side-aware row, so no new lint rule required — document this in `.lovable/side-context-mastery.md` (small append).
   - Add 1 unit test against `scoreSkillLevers` proving: untagged picks score on both sides; `side:'L'` picks contribute only when called with `{side:'L'}`; default call (no side) sums everything (back-compat).

## Out of scope

- No schema migration (V2 already lives in `athlete_context.category_goals` JSON).
- No change to non-hitting / non-throwing categories' visual surface (Speed / Fielding stay side-less; chip won't render there).
- No change to the V1-derived ranking used by legacy Hammer reads.

## Files touched

- `src/lib/hammer/goals/categoryGoals.ts` — type + normalizer + `scoreSkillLevers` overload
- `src/components/onboarding/steps/CategoryGoalsStep.tsx` — chip per pick
- `src/components/settings/CategoryGoalsCard.tsx` — chip per pick + read-only badge
- `src/components/onboarding/steps/ReviewAnswersStep.tsx` — display badge
- `src/lib/hammer/prescription/dailyPlan.ts` — pass active side when scoring
- `src/lib/side/sideBias.test.ts` — add `scoreSkillLevers` side cases (new minimal block)
- `.lovable/side-context-mastery.md` — append goal-payload note

## Risk / rollback

Pure additive. `side` is optional on `SubGoalPick`; missing field = legacy behavior. Default `scoreSkillLevers()` call unchanged. Reverting just removes the chip — existing rows keep working.
