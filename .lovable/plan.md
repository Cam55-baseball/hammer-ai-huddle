
# Fielding & Throwing Data Architecture Upgrade — IMPLEMENTED

All items from the plan have been built:

1. **ScoredRep fields added**: `throw_accuracy_direction`, `throw_arrival_quality`, `throw_strength`, `catcher_pop_time_sec`, `catcher_transfer_time_sec`, `catcher_throw_base`, `infield_rep_type`, `infield_rep_execution`, `play_direction`
2. **FieldingThrowFields.tsx** — Shared 3-section quick-tap (accuracy direction 4-col, arrival quality 4-col, throw strength 3-col)
3. **InfieldRepTypeFields.tsx** — Rep type (4-col) + execution (3-col), shown for P/1B/2B/3B/SS
4. **PlayDirectionSelector.tsx** — 5-direction quick-tap for all fielding reps
5. **RepScorer.tsx** — Integrated all new components into fielding section; catcher-specific fields (pop time, transfer time, throw base) shown only for C position; old throw_accuracy slider removed
6. **CatchingRepFields.tsx** — Replaced slider throw_accuracy with pop time, transfer time, throw base, block success, and FieldingThrowFields
7. **ThrowingRepFields.tsx** — Replaced 3-option accuracy with FieldingThrowFields (4-direction + arrival + strength)
8. **RepVideoAnalysis.tsx** — Added 'fielding' and 'catching' to analyzable modules; "Analyze Throw Mechanics" label for those modules
