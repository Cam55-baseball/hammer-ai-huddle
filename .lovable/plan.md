

# UI + Data Entry Fixes & Enhancements

## 1. Vertical Scrolling Fixes

**Problem**: Grade Progression table, Performance Test history, and Progress Photo timeline may clip content on large datasets.

**Current state**: 
- `VaultScoutGradesCard.tsx` line 313: Already has `<ScrollArea className="max-h-[300px]">` — but this is a horizontal table that may not scroll well with many columns (cycles). Need to ensure horizontal + vertical scroll works.
- `VaultPerformanceTestCard.tsx` line 619: Uses `max-h-[400px] overflow-y-auto` — functional but should use `ScrollArea` for consistent UX.
- `PhotoTimelineDialog.tsx`: Already uses `ScrollArea` — verify it handles large datasets.

**Changes**:
- **`VaultScoutGradesCard.tsx`**: Increase `max-h-[300px]` to `max-h-[500px]`, ensure both axes scroll for wide progression tables.
- **`VaultPerformanceTestCard.tsx`**: Replace `max-h-[400px] overflow-y-auto` div with `<ScrollArea className="max-h-[500px]">` for smooth scroll consistency.
- **`PhotoTimelineDialog.tsx`**: Verify and increase max-height if needed for timeline view.

---

## 2. 6-Week Performance Test Lock System

**Current state**: `VaultPerformanceTestCard.tsx` already has a lock system (line 272) using `next_entry_date`. The `isLocked` check and `daysRemaining` display exist. The `LOCK_PERIOD_WEEKS = 6` constant is set.

**What's missing**: Late entry edge case — if a user misses the 6-week window and enters late, the next cycle should reset based on the new entry date, not the original schedule.

**Changes in `VaultPerformanceTestCard.tsx`**:
- The lock logic already works correctly since `next_entry_date` is computed at save time as `+42 days` from the test date. When a late entry is made, the new `next_entry_date` resets from that entry date. Verify this is the case in `useVault.ts` save logic.
- Add clearer UI: Show "Next test available: [date]" when locked, and "Test available now" when unlocked.

---

## 3. Hit Distance Input Enhancement

**Current state**: `RepScorer.tsx` line 971-982 has a basic `<Input type="number">` for `hit_distance_ft`.

**Changes in `RepScorer.tsx`**:
- Replace the numeric input with a text input that accepts exact values, `>400`, and `400+` formats.
- Parse on change: strip `>` and `+`, store raw string in a new `hit_distance_raw` field and numeric estimate in `hit_distance_ft`.
- Add helper text below: "Enter exact distance or use >, + (example: >400 or 400+)"
- Add `hit_distance_raw` to the `RepData` interface.

---

## 4. Bat Size Input (Optional)

**Changes in `SessionConfigPanel.tsx`**:
- Add optional "Bat Size" text input field (visible only for hitting module).
- Format hint: `33" / 30 oz`
- Store as string in `SessionConfig` as `bat_size`.
- Pass through to `DrillBlock` and ultimately to `performance_sessions.drill_blocks`.

---

## 5. Bat Type Input (Optional)

**Changes in `SessionConfigPanel.tsx`**:
- Add "Bat Type" select field (hitting module only) with options: Metal, Wood, Custom.
- When "Custom" selected, show text input.
- Store as `bat_type` string in `SessionConfig`.
- Pass through same path as bat size.

---

## Files Summary

| File | Change |
|------|--------|
| `src/components/vault/VaultScoutGradesCard.tsx` | Increase scroll area height for grade progression |
| `src/components/vault/VaultPerformanceTestCard.tsx` | Use ScrollArea, improve lock status display |
| `src/components/practice/RepScorer.tsx` | Enhanced hit distance input with `>` / `+` parsing |
| `src/components/practice/SessionConfigPanel.tsx` | Add optional bat size + bat type fields for hitting |

