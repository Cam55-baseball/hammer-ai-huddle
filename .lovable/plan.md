

## Plan — Move Module Cards Below Game Plan for Coaches & Scouts

Single-file change to `src/pages/Dashboard.tsx`. Player layout is untouched.

### Current logic (lines 578–626)
```
!hasAnyTier && moduleCardsSection      // above Game Plan
<Game Plan>
hasAnyTier && moduleCardsSection       // below Game Plan
```

### New logic
Treat coaches and scouts the same as users with a tier — module cards always render **below** the Game Plan for them.

```
(!hasAnyTier && !isCoach && !isScout) && moduleCardsSection   // above
<Game Plan>
(hasAnyTier || isCoach || isScout) && moduleCardsSection      // below
```

### Why this is safe
- `isCoach` / `isScout` are already computed and used a few lines below for the Game Plan branch — no new hook or query.
- Player conditions (`hasAnyTier` true/false) produce the exact same output as today.
- Owner / Admin paths unchanged (they fall through the player branch and show modules in the standard tier-based position).
- `moduleCardsSection` itself is unchanged — only its placement moves for coach/scout.

### File
**Edited:** `src/pages/Dashboard.tsx` — two conditional expressions on lines 579 and 626.

**Not touched:** module card content, `CoachScoutGamePlanCard`, `GamePlanCard`, role hooks, subscription logic, merch section.

### Verification
1. Player with no tier: module cards render **above** Game Plan (unchanged).
2. Player with a tier: module cards render **below** Game Plan (unchanged).
3. Coach (no tier): module cards render **below** Game Plan (new).
4. Scout (no tier): module cards render **below** Game Plan (new).
5. Coach/Scout who also has a tier: still below (unchanged outcome).
6. Owner / Admin: unchanged.

