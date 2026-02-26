
# Add "Player Club" Button to Player Notes Section

## Overview
Add a "Player Club" navigation button next to the existing "View Profile" button in the `PlayerNotesSection` component, so coaches and scouts can quickly access a selected player's Player Club page.

## Change

### File: `src/components/scout/PlayerNotesSection.tsx`

In the button group that appears after selecting a player (around line 143-150), add a second button next to the existing "View Profile" button:

- Import the `Trophy` icon from `lucide-react` (or similar icon representing "Player Club")
- Add a new `Button` that navigates to `/players-club?userId={selectedPlayerId}`
- Style it consistently with the existing "View Profile" button (same `size="sm"`, `variant="outline"`)
- Label it "Player Club" with a trophy icon

The resulting button group will look like:

```text
[ User Icon | View Profile ]  [ Trophy Icon | Player Club ]
```

### Files Modified

| File | Change |
|------|--------|
| `src/components/scout/PlayerNotesSection.tsx` | Add "Player Club" button next to "View Profile" |
