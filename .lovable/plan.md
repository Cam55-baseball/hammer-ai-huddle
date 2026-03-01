

# Final Production Lock — Engine Contract + Duplicate Purge + Bug Fixes

This is the last stabilization pass before release. Three categories: bugs to fix, duplicates to eliminate, and a hardcoded ENGINE CONTRACT document that locks every logic decision.

---

## Bugs Found

### 1. Duplicate "Batted Ball Type" render in AdvancedRepFields
**File**: `src/components/practice/AdvancedRepFields.tsx` Lines 201-229
The Batted Ball Type SelectGrid is rendered TWICE — once at L201-214 and again at L216-229 (labeled "Tier 2"). The second instance must be removed.

### 2. Nightly audit log missing athlete count and duration
**File**: `supabase/functions/nightly-mpi-process/index.ts` L777-784
The plan specified logging `athletes_processed` and `duration_ms`, but the current code only logs `timestamp`. A `startTime` variable must be captured at function entry and the total processed count accumulated across sports.

### 3. Retroactive double-call in usePerformanceSession
**File**: `src/hooks/usePerformanceSession.ts` L180-195
When a session is retroactive (`session_date < today`), the code calls `calculate-session` TWICE: once with `{ retroactive: true, date }` (L183-186) and again with `{ session_id }` (L191-194). The second call recalculates the just-inserted session redundantly since the retroactive call already recalculates ALL sessions for that date (including the new one). The second call should be wrapped in an `else` so only non-retroactive sessions trigger a single calculation.

---

## Duplicates Found

### 1. `getReleasePenalty` — exists in TWO places
- `src/data/contractStatusRules.ts` (client-side, never used by edge function)
- `supabase/functions/nightly-mpi-process/index.ts` L55 (authoritative, actually runs)

**Decision**: Keep both. The client-side copy serves UI display logic (showing release penalty rules to users). The edge function copy is the authoritative calculation. They use identical logic. No removal needed — this is intentional separation between display and computation contexts.

### 2. `parseVeloBandUpper` and `isHighVelocityBand` — exists in TWO edge functions
- `supabase/functions/calculate-session/index.ts` L29-40
- `supabase/functions/nightly-mpi-process/index.ts` L110-121

**Decision**: Keep both. Edge functions cannot share imports (each is an independent Deno module). Identical logic is correct and intentional. No action needed.

### 3. No other duplicate calculations, triggers, probability calculations, streak logic, or overload logic found. All other systems have single sources of truth.

---

## Implementation Plan

### Step 1: Fix duplicate Batted Ball Type render
**File**: `src/components/practice/AdvancedRepFields.tsx`
Remove the duplicate SelectGrid block at lines 215-229 (the one with the "Tier 2" comment). The original at L201-214 stays.

### Step 2: Fix retroactive double-call
**File**: `src/hooks/usePerformanceSession.ts`
Change L189-195 from unconditional to:
```typescript
// Only call for non-retroactive sessions (retroactive call above already handles this date)
if (data.session_date >= today && authSession?.access_token) {
  await supabase.functions.invoke('calculate-session', {
    headers: { Authorization: `Bearer ${authSession.access_token}` },
    body: { session_id: session.id },
  });
}
```

### Step 3: Fix nightly audit log completeness
**File**: `supabase/functions/nightly-mpi-process/index.ts`
- Add `const startTime = Date.now();` after L127 (after creating supabase client)
- Add a `let totalProcessed = 0;` counter, increment it inside the scores loop
- Update L779-783 to include `athletes_processed: totalProcessed, duration_ms: Date.now() - startTime`

### Step 4: Create ENGINE CONTRACT v1.0
**File**: `src/data/ENGINE_CONTRACT.ts` (new file)
A single source-of-truth constants file that documents every locked logic decision as exported constants. This is NOT documentation — it is code that can be referenced. Contains:

```typescript
export const ENGINE_CONTRACT = {
  version: '1.0',
  locked: true,

  // Retroactive window
  RETROACTIVE_MAX_DAYS: 7,

  // MPI composite weights
  MPI_WEIGHTS: { bqi: 0.25, fqi: 0.15, pei: 0.20, decision: 0.20, competitive: 0.20 },

  // Game session weight multiplier
  GAME_SESSION_WEIGHT: 1.5,

  // Scout blend weight
  SCOUT_BLEND_WEIGHT: 0.20,

  // Overload dampening thresholds
  OVERLOAD_THRESHOLDS: [
    { days: 28, multiplier: 0.80 },
    { days: 21, multiplier: 0.85 },
    { days: 14, multiplier: 0.90 },
  ],

  // Absent-day dampening
  ABSENT_DAMPENING: { days7_threshold: 2, mult7: 0.95, days14_threshold: 4, mult14: 0.85 },

  // Consistency recovery threshold
  CONSISTENCY_RECOVERY_PCT: 80,

  // Release penalties
  RELEASE_PENALTIES: [
    { release: 1, pct: 12 }, { release: 2, pct: 18 },
    { release: 3, pct: 25 }, { release: 4, pct: 30 },
  ],

  // Contract modifiers
  CONTRACT_MODIFIERS: {
    active: 1.0, free_agent: 0.95, released: 'penalty_table',
    injured_list: 0.9, retired: 0,
  },

  // Pro probability
  PRO_PROB_CAP_NON_VERIFIED: 99,
  PRO_PROB_CAP_VERIFIED: 100,

  // HoF requirements
  HOF_MIN_SEASONS: 5,
  HOF_MIN_PRO_PROB: 100,
  HOF_BASEBALL_LEAGUES: ['mlb'],
  HOF_SOFTBALL_LEAGUES: ['mlb', 'ausl'],

  // Velocity thresholds
  HIGH_VELOCITY_BASEBALL_MPH: 100,
  HIGH_VELOCITY_SOFTBALL_MPH: 70,

  // BP distance power thresholds
  BP_DISTANCE_POWER_BASEBALL_FT: 300,
  BP_DISTANCE_POWER_SOFTBALL_FT: 150,

  // Governance flag impact
  INTEGRITY_PENALTIES: { critical: -15, warning: -5, info: -2 },

  // Injury hold
  INJURY_HOLD_LOOKBACK_DAYS: 7,

  // Session edit/delete windows
  SESSION_EDIT_WINDOW_HOURS: 48,
  SESSION_DELETE_WINDOW_HOURS: 24,

  // Verified stat boost source
  VERIFIED_STAT_REQUIRE_ADMIN: true,
  VERIFIED_STAT_IMMUTABLE_AFTER_APPROVAL: true,

  // Nightly process schedule
  NIGHTLY_CRON_UTC: '05:00',
  NIGHTLY_SESSION_WINDOW_DAYS: 90,

  // Governance abuse thresholds
  RETROACTIVE_ABUSE_THRESHOLD: 3, // 3+ retro sessions in 7 days
  VOLUME_SPIKE_MULTIPLIER: 3, // 3x average = spike
  GRADE_INFLATION_DELTA: 12, // player - coach > 12 = flag
  GAME_INFLATION_DELTA: 15, // game grade - practice avg > 15 = flag
} as const;
```

### Step 5: Deploy edge functions
Deploy `calculate-session` and `nightly-mpi-process` after fixes.

---

## Execution Order

| Step | What | Dependencies |
|------|------|-------------|
| 1 | Fix duplicate Batted Ball Type in AdvancedRepFields | None |
| 2 | Fix retroactive double-call in usePerformanceSession | None |
| 3 | Fix nightly audit log | None |
| 4 | Create ENGINE_CONTRACT.ts | None |
| 5 | Deploy edge functions | Steps 2, 3 |

Steps 1-4 are independent and can execute in parallel. Step 5 is final.

---

## What This Closes

- 0 duplicate UI renders
- 0 redundant edge function calls per session
- Complete nightly monitoring with athlete count + duration
- Single source of truth for every engine constant
- No new features. Pure stabilization.

