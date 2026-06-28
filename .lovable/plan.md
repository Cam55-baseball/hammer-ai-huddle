## What's changing

The current `CategoryGoalsStep` only collects 5 top-level ranks (Speed/Power/Throwing/Hitting/Fielding). This rebuild makes goals **specific, editable, multi-select, discipline-aware, and resumable**, and wires the result through Hammer's daily plan end-to-end.

## 1. Sub-goal catalog (mechanism-level, plain language)

New file `src/lib/hammer/goals/subGoalCatalog.ts` — typed catalog keyed by `(sport, discipline, category)` returning sub-goals with `id`, `label`, `helpText`, `weightHints` (which Hammer prescription levers it boosts).

Examples for **Power**:
- `bat_speed` — "Swing the bat faster" (boosts rotational drills, overload/underload bat)
- `rotational_horsepower` — "Turn the hips harder" (med-ball, hip mobility, core)
- `contact_strength` — "Hold the barrel through contact" (grip, forearm, iso holds)
- `lower_half_drive` — "Push the ground harder" (trap-bar, jumps, sled)
- `mound_explosiveness` (pitcher only) — "More force off the rubber"

Equivalent specific lists for **Speed** (first-step, top-end, base-stealing reads, conditioning), **Throwing-Position** (arm strength, on-line accuracy, transfer/exchange, footwork, long-toss capacity), **Hitting** (barrel control, plate discipline, two-strike, oppo power, launch consistency), **Fielding** (range, glove-to-transfer, pre-pitch routine, double-play turn, first-step read), **Pitching** (command/zone%, velo, secondary pitch development, pitch mix sequencing, stamina/pitch count, holding runners — **baseball-only**, **softball-pitcher excludes pickoffs**).

## 2. Goal model (replaces the flat 5-rank)

`src/lib/hammer/goals/categoryGoals.ts` extended:

```ts
type Rank = 'primary' | 'secondary';        // 70 / 30 split
interface SubGoalPick { id: string; rank: Rank; }
interface DisciplineGoals {                  // per discipline tree
  power?:     SubGoalPick[];                 // 1..2
  speed?:     SubGoalPick[];
  hitting?:   SubGoalPick[];
  fielding?:  SubGoalPick[];
  throwing?:  SubGoalPick[];                 // position-player throwing
  pitching?:  SubGoalPick[];                 // pitcher only
}
interface CategoryGoalsV2 {
  version: 2;
  baseball?: { position?: DisciplineGoals; pitcher?: DisciplineGoals };
  softball?: { position?: DisciplineGoals; pitcher?: DisciplineGoals };
  updatedAt: string;
}
```

A normalizer keeps reading legacy V1 ranks so existing users don't lose state; on save we always write V2.

## 3. Onboarding flow rebuild

`src/components/onboarding/CategoryGoalsStep.tsx` becomes a **multi-pane wizard**:
1. Discipline selector — auto-prefilled from profile (`primary_sport` + `is_two_way` + `is_pitcher`). User can toggle on additional panes (cross-sport baseball+softball, or add pitcher pane).
2. For each enabled discipline pane, one screen per category with chip-style sub-goal picker. Tap = primary, second tap = secondary, third = deselect. Visible 70 / 30 weight badge. Max 2 per category, min 0 (skippable categories allowed for true single-skill specialists).
3. Pitcher pane never shows position-player Throwing; position pane never shows Pitching. Softball-pitcher Pitching list omits the `hold_runners` sub-goal entirely.

## 4. Edit-anywhere from Profile

`src/components/profile/CategoryGoalsCard.tsx` becomes a launcher to the same wizard in "edit" mode. Every save writes a new row with `lineage_parent_ids` pointing at the previous goals snapshot in `athlete_context` (additive, no destructive overwrite).

## 5. Hammer prescription wiring (E2E)

`src/lib/hammer/dailyPlan.ts`:
- Replace single-rank sort with a weighted scorer: `score(skill) = Σ pick.weightHints[skill] * (rank==='primary'?0.7:0.3)` across the *active* discipline panes.
- For two-way athletes, both pitcher and position picks contribute; the plan surfaces a dedicated "Pitcher focus" block when pitcher weights are non-zero.
- Softball pitcher path never schedules pickoff drills.

## 6. Universal Save-&-Exit

New `src/components/common/SaveAndExitBar.tsx` — sticky footer with "Save & exit" + "Continue". Backed by `src/lib/onboarding/draftStore.ts` (localStorage + debounced upsert to `athlete_context.onboarding_draft jsonb`).

Mounted in:
- every `/onboarding/athlete` step (incl. new CategoryGoalsStep, InjuryIntakeStep, schedule step)
- `SeasonScheduleImporterDialog` (saves paste text + parsed rows as draft)
- `ReportInjuryDialog` (saves partial intake)
- Category-goals editor in Profile

Resume banner (`OnboardingResumeBanner`) and `OnboardingStatusCard` already exist — they read the draft to deep-link back to the exact step.

## 7. Migration

Single migration adds `athlete_context.onboarding_draft jsonb` (nullable) and keeps `category_goals jsonb` (already exists) — V2 shape stored there.

## 8. Tests

Extend `src/lib/runtime/relational/__tests__/onboarding-regression.test.ts`:
- V1→V2 normalizer round-trip
- 70/30 scorer ranks pitcher drills above position drills for a pitcher-only athlete
- Softball pitcher catalog excludes `hold_runners`
- Two-way (BB pitcher + position) merges both panes
- Save-&-exit draft restoration produces identical wizard state

## Technical notes

- No new tables; reuses `athlete_context`. Migration is one `ALTER TABLE` adding a nullable jsonb column → no GRANT change needed (column inherits table grants).
- All client writes go through existing `useUpsertAthleteContext` hook; lineage uses existing ASB `relational.developmental.*` topic — no new topic ID required.
- Draft autosave debounced 800ms; localStorage key `onboarding-draft:v2:<uid>` for offline durability before first auth-bound save.

## Out of scope (explicit)

- No coach/parent-facing edits to athlete goals (athlete-supremacy preserved).
- No AI auto-suggest of sub-goals in this pass — Hammer infers later from session telemetry; we only collect explicit picks now.
- No change to existing schedule/calendar event coloring or AI parser.
