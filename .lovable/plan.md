

# Practice Session Logging — AI Fields, ABS Guess, Pitcher Intent, and Drill Descriptions

This is a large, multi-part implementation across the rep logging system. Here is the exact plan for each requirement.

---

## Overview of Changes

Six distinct features across multiple files, touching `RepScorer.tsx`, `RepSourceSelector.tsx`, `SessionConfigPanel.tsx`, `PracticeHub.tsx`, `CatchingRepFields.tsx`, and a new `AITextBoxField.tsx` component.

---

## 1. Reusable AI Text Box Component

**New file**: `src/components/practice/AITextBoxField.tsx`

A reusable multi-line textarea with:
- Configurable label, min character count, required flag
- Character count display and warning when under minimum
- Structured field (not notes) — value stored on the rep/session object directly

Used by requirements 1, 4, 5, and 6.

---

## 2. Catching "Other" / "Drill" → Required AI Drill Description (Requirement 1)

**File**: `src/components/practice/RepScorer.tsx`

- When `module === 'catching'` AND `repSource === 'other' || repSource === 'drill'`, render `AITextBoxField` with label "AI Drill Description", min 15 chars, required
- Store as `ai_drill_description` on `ScoredRep`
- Add to `canConfirm` validation: if catching + (other|drill), `ai_drill_description` must be >= 15 chars
- Include in committed rep data

---

## 3. ABS Guess Field (Requirement 2)

**File**: `src/components/practice/RepScorer.tsx`

Applies to: Hitting, Pitching, and Catching sessions when `pitch_location` is logged.

- Add `abs_guess` field to `ScoredRep` (type `{ row: number; col: number }`)
- After the existing `PitchLocationGrid` for pitch location, render a second `PitchLocationGrid` with label "ABS Guess (Select 5×5 Zone)"
- Required when `current.pitch_location` has been set — add to `canConfirm` validation
- Both grids use identical 5×5 UI
- Store both `pitch_location` and `abs_guess` on the rep

---

## 4. Pitcher Spot Intent — Pre-Pitch Target (Requirement 3)

**File**: `src/components/practice/RepScorer.tsx`

Applies to: Pitching sessions only.

- Add `pitcher_spot_intent` field to `ScoredRep` (type `{ row: number; col: number }`)
- Render a `PitchLocationGrid` labeled "Pitcher Spot Intent (Pre-Pitch Target)" BEFORE the actual pitch location grid
- Required before pitch location can be selected (conditional rendering: show pitch location grid only after intent is set)
- Once pitch location is logged, intent grid becomes read-only (locked) — visually dimmed with `pointer-events-none opacity-60`
- Store `pitcher_spot_intent` separately from `pitch_location`

---

## 5. Goal of Rep & Actual Outcome — Session-Level Required AI Text Boxes (Requirement 4)

**Files**: `src/pages/PracticeHub.tsx`, `src/components/practice/RepScorer.tsx`

Current state: These are per-rep SelectGrid presets in advanced mode only. The user wants them as **session-level required multi-line text boxes** shown at session save time.

Changes:
- **Remove** the existing per-rep `goal_of_rep` / `actual_outcome` SelectGrid from `RepScorer.tsx` (lines 1124-1160)
- **Add** two `AITextBoxField` components in `PracticeHub.tsx` in the `build_session` step, placed above the "Save Session" button
- Label: "Goal of Rep" and "Actual Outcome", both required, min 20 chars (optional enforcement per spec: "Minimum: 20 characters (optional)")
- Store as `session_goal_of_rep` and `session_actual_outcome` in state
- Pass into `createSession` call via `fatigue_state` or a new top-level field
- Block "Save Session" button if either field is empty
- These are structured AI fields, not notes

---

## 6. "Drill" Rep Source in ALL Practice Sessions → AI Drill Clarification (Requirement 5)

**File**: `src/components/practice/RepScorer.tsx`

- When `repSource === 'drill'` (any module, not just catching), render `AITextBoxField` labeled "AI Drill Clarification", min 15 chars, required
- Store as `ai_drill_clarification` on `ScoredRep`
- Add to `canConfirm` validation
- Note: For catching, requirement 1 already covers this with "AI Drill Description" — use that label for catching, "AI Drill Clarification" for all other modules

---

## 7. "Custom" / "Other" Rep Source in Practice → AI Custom Rep Description (Requirement 6)

**File**: `src/components/practice/RepScorer.tsx`

- When `repSource === 'other'` (any module), render `AITextBoxField` labeled "AI Custom Rep Description", min 15 chars, required
- Store as `ai_custom_rep_description` on `ScoredRep`
- Add to `canConfirm` validation
- For catching "other", requirement 1's "AI Drill Description" applies — use that for catching, this for other modules
- Replace the existing simple `Input` for custom source in `RepSourceSelector` with the session config level only (keep for naming), and add the per-rep AI field in `RepScorer`

---

## Updated `ScoredRep` Interface

New fields added:
```typescript
ai_drill_description?: string;      // Catching other/drill
ai_drill_clarification?: string;    // Any module drill
ai_custom_rep_description?: string; // Any module other/custom
abs_guess?: { row: number; col: number };
pitcher_spot_intent?: { row: number; col: number };
```

---

## Updated Validation (`canConfirm`)

The existing validation will be extended:
- If catching + (other|drill): `ai_drill_description` >= 15 chars
- If non-catching + drill: `ai_drill_clarification` >= 15 chars
- If non-catching + other: `ai_custom_rep_description` >= 15 chars
- If pitch_location is set (hitting/pitching/catching): `abs_guess` must be set
- If pitching: `pitcher_spot_intent` must be set before pitch_location

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/practice/AITextBoxField.tsx` | **New** — Reusable AI text box component |
| `src/components/practice/RepScorer.tsx` | Add new ScoredRep fields, AI text boxes, ABS Guess grid, Pitcher Intent grid, validation updates |
| `src/pages/PracticeHub.tsx` | Add session-level Goal of Rep & Actual Outcome fields, block save if empty |

