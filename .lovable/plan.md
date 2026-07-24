## Goal

Athletes with **special laterality profiles** — switch hitters and ambidextrous throwers — must never be asked to "pick a side." The plan must render **one card per side** with **independent completion tracking**, so a coach or the engine can see exactly which side got work and which was skipped. The system must also **tier by experience**: entry-level athletes get a scaffolded on-ramp; elite athletes get advanced dosage layers and asymmetry insight.

## Current state (verified)

- `SideContext.tsx` already knows `isSwitchHitter` / `isAmbidextrousThrower` from `athlete_mpi_settings` + `athlete_context.bats_hand='S'` / `throws_hand='S'`.
- `src/lib/hammer/prescription/dailyPlan.ts` currently produces **one** hitting prescription and **one** EASS prescription, tagged with `" (both sides)"` / `" (both arms)"`. There is no per-side split, no per-side completion, no per-side skip visibility.
- `hammer_daily_task_completions` keys off `modality` + `task_id`. It has no `side` column today — per-side rows would collide unless we scope by side.
- `WkBatSpeedCard`, hitting `BlockCard`, and EASS blocks each render a single card from `grouped.batSpeedCard` / hitting block / throwing block.
- Arm care is currently owned by the throwing block via `ArmCareBudgetProvider` — for ambi throwers this budget must split per arm.

## What we're building

### 1. Per-side prescription emission (engine)
Rework `dailyPlan.ts` so that when `isSwitchHitter` is true, hitting emits **two** prescriptions (`side: 'L'` and `side: 'R'`) with mirrored drill lists, tempo cues, and dosage — not a merged "both sides" string. Same for EASS when `isAmbi`: emit **two** throwing prescriptions (`side: 'L'` and `side: 'R'`), each with its own band prep, fast-object, underload, regulation, and arm-care sub-blocks. Bat Speed rotational work also splits per side for switch hitters.

Dosage rules:
- **Switch hitter hitting/bat-speed:** full reps per side (no half-volume shortcut). Off-hand may down-shift intensity by one step for entry-tier athletes; parity for elite.
- **Ambi thrower EASS:** each arm gets its own mode (throwing_day_build / maintain / ramp / non_throwing) resolved independently from that arm's recent load, so a dominant-arm bullpen doesn't force the off-arm into recovery.
- **Ambi arm care:** `ArmCareBudgetProvider` becomes side-scoped — two budgets, one per arm — so cooldown for L doesn't cannibalize R.

### 2. Per-side completion + skip tracking (data)
Add a `side` column (`text`, nullable, values `'L'|'R'|null`) to `hammer_daily_task_completions` and extend the uniqueness key to `(user_id, plan_date, modality, task_id, side)`. `useHammerDailyTasks` and `WkCardCompletion` read/write the current card's side so L-complete does not mark R-complete. A new `useSideSkipStatus(date_range)` hook surfaces "L thrown 5/7, R thrown 2/7" style insight for the dashboard and for engine adaptation.

### 3. Duplicated card rendering (UI)
- `HammerDailyPlan.tsx` renders **two** `WkBatSpeedCard` instances for switch hitters (side="L" and side="R"), each visually tagged with a small `L` / `R` chip and its own completion checklist.
- Same treatment for the hitting `BlockCard` and for the EASS throwing block.
- Header side-pickers stay **only as a review-mode filter** ("show me just L today"), not as a data gate — both cards always render.
- Each card shows a subtle "last done: 2d ago" per side to make asymmetry visible.

### 4. Experience-tier scaling (engine)
Add an `experience_tier` resolver (`entry | developing | advanced | elite`) derived from existing profile signals (age, competition level, session history depth, `athlete_mpi_settings`).
- **Entry:** simpler cue language, fewer drills, larger rest, "start here" guide sheet auto-opened, mandatory warmup gate.
- **Developing:** current default.
- **Advanced:** adds intent day / overload day permissions, adds contrast sets to lifts, unlocks side-asymmetry report.
- **Elite:** unlocks CNS-priming layers, per-side velocity ceilings, plateau-breaking micro-cycles (e.g. Westside/KOT rotating undulation), and an "Ask Hammer: why isn't the needle moving?" panel that reads recent completions + splits.

### 5. Asymmetry & plateau insight
New `SideAsymmetryCard` on the Progress landing surfaces per-side completion rate, per-side velocity trend (from `performance_sessions` split by `side`), and a Hammer-generated recommendation (e.g. "R-side EASS skipped 4 of last 7 — that's why R velo is trending flat"). This directly closes the "elite athlete stuck on a plateau" loop.

## Technical details

**Types**
- Extend `WkPrescription` (whatever the current row type is in `dailyPlan.ts` output) with `side?: 'L' | 'R'`.
- `HammersTodayProvider.grouped` gains `hittingBySide` and `eassBySide` so cards can pull the right slice.

**DB migration**
```
ALTER TABLE public.hammer_daily_task_completions
  ADD COLUMN side text CHECK (side IN ('L','R')) NULL;
-- replace existing unique constraint with a partial-aware one:
DROP INDEX / CONSTRAINT (existing unique on user_id/plan_date/modality/task_id);
CREATE UNIQUE INDEX hdtc_uniq_side
  ON public.hammer_daily_task_completions (user_id, plan_date, modality, task_id, COALESCE(side, ''));
```
RLS already user-scoped; no policy change needed. GRANTs unchanged.

**Files to touch**
- `src/lib/hammer/prescription/dailyPlan.ts` — split hitting & EASS emissions per side.
- `src/lib/hammer/prescription/eassLibrary.ts` — accept `side` param, generate independent mode per arm.
- `src/components/hammer/ArmCareBudgetContext.tsx` — key budgets by side.
- `src/components/hammer/HammersTodayProvider.tsx` — expose `hittingBySide`, `batSpeedBySide`, `eassBySide`.
- `src/components/hammer/WkBatSpeedCard.tsx`, hitting `BlockCard`, EASS render path — accept a `side` prop, render L/R chip.
- `src/components/hammer/HammerDailyPlan.tsx` — render two cards when switch/ambi is true.
- `src/hooks/useHammerDailyTasks.ts` + `src/components/hammer/WkCardCompletion.tsx` — thread `side` through read/write.
- New: `src/hooks/useExperienceTier.ts`, `src/hooks/useSideSkipStatus.ts`, `src/components/progress/SideAsymmetryCard.tsx`.

**Backward compatibility**
Non-switch / non-ambi athletes are untouched — `side` stays `null` and the single-card flow renders exactly as today.

## Out of scope for this pass
- Re-tagging historical `performance_sessions` that lacked `side` (already handled by `SideSaveToggle` going forward).
- Coach/parent-facing dashboards for asymmetry (athlete-facing card first, coach view after).