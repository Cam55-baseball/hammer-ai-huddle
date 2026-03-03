

# Add "Send to Coach" Button in Custom Activity Detail Dialog

## Change

Add a "Send to Coach for Edit" button next to the "Skip for Today" button inside `CustomActivityDetailDialog.tsx`, so it's visible when a player opens a custom activity from their Game Plan.

### `src/components/CustomActivityDetailDialog.tsx`
- Import `SendCardToCoachDialog` and `GraduationCap` icon
- Add state for `sendToCoachOpen`
- Place a new button styled with blue/coach theme next to the "Skip for Today" button (same row, using a flex wrapper)
- Render `SendCardToCoachDialog` alongside the existing `SendToPlayerDialog` at the bottom

The button row (lines ~1028-1040) will become a horizontal flex with "Skip for Today" and "Send to Coach" side by side.

| File | Change |
|------|--------|
| `src/components/CustomActivityDetailDialog.tsx` | Add Send to Coach button + dialog next to Skip for Today |

