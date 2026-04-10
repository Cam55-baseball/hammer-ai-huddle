

# Fix Drill Library — Video, Data, Instructions

## 1. DrillCard: Remove blank video container entirely

**File: `src/pages/DrillLibraryPlayer.tsx`** (lines 23-38)

The current DrillCard always renders an `aspect-video` container with either a `<video>` or a `<Play>` placeholder icon. This must be removed so that when there's no video, there is ZERO visual space.

Replace the entire thumbnail section with a conditional: only render the video container when `hasVideo` is true. Move the Recommended badge and progression badge into the card body area so they still display without a video container.

## 2. Clean empty `video_url` strings in database

**Data update** (using insert/update tool):
```sql
UPDATE drills SET video_url = NULL WHERE video_url IS NOT NULL AND TRIM(video_url) = '';
```

## 3. DrillDetailDialog: Already fixed

The detail dialog (line 81-90) already has the correct pattern: `hasVideo ? <video> : null`. No changes needed there.

## 4. Instructions data flow: Already wired

- `usePlayerDrillLibrary.ts` line 78 and 97 already include `instructions` in the select
- Line 144 already parses and passes it through
- `DrillLibraryPlayer.tsx` line 171 already passes `instructions` to the dialog
- `DrillDetailDialog.tsx` lines 32-35 already parse and lines 101-182 render it

## 5. Add fallback instructions when `instructions` is null

**File: `src/components/practice/DrillDetailDialog.tsx`** (after line 35)

Add fallback generation from `drill.description`:
```typescript
const effectiveInstructions: DrillInstructions | null = instructions 
  ?? (drill.description ? {
    purpose: drill.description,
    setup: 'Standard drill setup',
    execution: [drill.description],
    coaching_cues: [],
    mistakes: [],
    progression: []
  } : null);
```

Then use `effectiveInstructions` instead of `instructions` in the render block (line 101).

## Files Summary

| File | Change |
|------|--------|
| `src/pages/DrillLibraryPlayer.tsx` | Remove video container + placeholder when no video; conditionally render thumbnail only when `hasVideo` |
| `src/components/practice/DrillDetailDialog.tsx` | Add fallback instructions from description |
| DB data update | Clean empty `video_url` strings to NULL |

