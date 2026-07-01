## Plan: Elite Lift Correction

### 1. Enforce a true full-body lift template
- Update the daily workout generator so every non-game-day lift must include these required buckets before saving:
  - Arm care / shoulder prep
  - Trunk primer
  - Lower compound or lower strength primer
  - Unilateral lower
  - Upper push
  - Upper pull
  - Carry or anti-rotation when phase-legal
- Add a validation pass that rejects “all lower-body” output and swaps in missing upper/trunk categories before rows are inserted.

### 2. Make in-season prescriptions actually in-season
- Tighten in-season rules so the generator uses low-volume, high-quality maintenance/primer work only.
- Block offseason-only eccentric and high-soreness movements from in-season unless an explicit one-session override exists.
- Keep in-season lift prescriptions before practice/game but after speed/bat-speed/crossover activation.

### 3. Eliminate same-workout duplicates completely
- Expand dedupe from slug-only to:
  - movement slug
  - movement display name
  - movement family/pattern
  - identical sets/reps/tempo duplicates in the same role group
- Add a final same-session duplicate audit before persistence so duplicate rows are dropped or replaced, not shown to users.

### 4. Fix game-day ordering and crossover placement
- On game days, suppress regular lifts and conditioning.
- Generate/show a short sports crossover activation at the beginning of the day after warm-up, before game/practice.
- Prevent cross-sport work from appearing at the back end on game days or in-season.
- Allow back-end cross-sport only in offseason, where it belongs.

### 5. Update UI grouping and labels
- Update Hammer Today Plan order rail to reflect phase/game-day reality:
  - Normal/in-season training day: Warm-up → Speed/Bat-Speed → Lifts → Practice/Game → Conditioning
  - Game day: Warm-up → Short Crossover Activation → Game
  - Offseason: Warm-up → Speed/Bat-Speed → Lifts → Conditioning → Cross-Sport
- Move any `cross_sport` rows out of the Conditioning card when they are intended as early activation.

### 6. Add guardrails so this does not drift again
- Extend the workout audit script to fail if:
  - same-day duplicate movement slug/name appears
  - a lift day lacks upper push or upper pull without a game-day/post-season reason
  - in-season includes offseason-only eccentric work without override
  - game-day cross-sport appears after practice/game instead of early activation

### Technical files to update
- `supabase/functions/wk-generate-daily/index.ts`
- `src/hooks/useWkDailyPrescriptions.ts`
- `src/components/hammer/WkSpeedBatCard.tsx`
- `src/components/hammer/WkConditioningCard.tsx`
- `src/components/hammer/HammerDailyPlan.tsx`
- `scripts/audits/wk-dedupe-check.ts`

### Validation
- Run the WK audit script after changes.
- Verify one in-season training day returns full-body, no duplicates.
- Verify one game day returns only short early activation plus game/practice flow, with regular lifts suppressed.