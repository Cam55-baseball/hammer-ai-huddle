

# Performance Habit Engine — Final Signal Discipline

## Problem
Current implementation has two issues:
1. Streak badge renders as a separate line but is not counted toward the 3-line budget
2. Identity does NOT override reward — both can appear simultaneously when streak ≥3
3. The return logic has a confusing fallback (`finalProgression ?? (finalIdentity ? null : progression)`) that can leak signals

## Changes

### 1. `src/hooks/useNutritionFeedback.ts` — Enforce strict priority stack

Replace the signal selection logic (lines 232-245) with four exclusive cases:

**CASE C — Streak ≥3 (Identity overrides all):**
- `reward = null` (suppressed)
- `progression = null` (suppressed)
- `nudge = null` (suppressed)
- `identityFrame = computed value`
- `goal = computed value`
- Streak badge + Identity + Goal = 3 lines

**CASE A — Improvement, no streak:**
- `reward = computed`
- `nudge = 'Strong correction — keep this pattern'`
- `progression = computed (if exists)`
- `identityFrame = null`
- Lines: Reward + Progression (if exists) + Goal = max 3

**CASE B — No improvement, no streak:**
- `reward = null`
- `nudge = computed`
- `progression = null` (no reward means no progression worth showing)
- `identityFrame = null`
- Lines: Nudge + Goal = 2

**CASE D — Zero data:**
- Single goal line only (already implemented)

Also suppress nudge in CASE A — reward IS the emotional signal, nudge is redundant.

### 2. `src/components/nutrition-hub/NutritionFeedbackStrip.tsx` — Streak counts as line 1

Restructure rendering to enforce strict 3-line max where streak badge IS line 1 when active:

**When streak ≥3 (CASE C):**
- Line 1: Streak badge (🔥 X-day streak)
- Line 2: Identity frame (✦ italic)
- Line 3: Goal (◎)

**When reward exists (CASE A):**
- Line 1: Reward (✓ green)
- Line 2: Progression (↑ if exists, otherwise omitted)
- Line 3: Goal (◎)

**When no improvement (CASE B):**
- Line 1: Nudge (⚠)
- Line 2: Goal (◎)

Remove the separate streak badge block that currently renders independently above the signal lines.

## Files Changed
| File | Change |
|------|--------|
| `src/hooks/useNutritionFeedback.ts` | Replace signal selection with 4 exclusive cases |
| `src/components/nutrition-hub/NutritionFeedbackStrip.tsx` | Streak as line 1, strict 3-line rendering |

