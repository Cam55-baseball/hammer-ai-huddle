

# Pitching Handedness Gate Fix

## Problem
Handedness is stored in a single global localStorage key (`session_handedness`) shared across all modules. If a user selects handedness in hitting, it auto-applies to pitching, skipping the "Pitcher Arm" gate entirely. Pitching arm side should be asked independently.

## Solution

**File: `src/hooks/useSessionDefaults.ts`**
- Change `getHandedness` and `saveHandedness` to use a **module-scoped** key: `session_handedness_{module}` instead of the global `session_handedness`.
- This ensures hitting handedness and pitching handedness are stored and recalled independently.

**File: `src/components/practice/HandednessGate.tsx`**
- No changes needed — it already has pitching-specific labels ("Pitcher Arm: Left-Handed / Right-Handed").

**File: `src/components/practice/SessionConfigBar.tsx`**
- Add the current handedness to the config bar display so users can see what arm/side they selected during logging (e.g., badge showing "RHP" or "LHH").

This is a minimal change — just scoping the localStorage key per module so pitching always gets its own prompt.

| File | Change |
|------|--------|
| `src/hooks/useSessionDefaults.ts` | Scope handedness key per module |
| `src/components/practice/SessionConfigBar.tsx` | Show handedness badge |

