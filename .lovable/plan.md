

# Fix Blank Video Previews + Add Structured Drill Instructions

Two changes: (1) bulletproof video rendering to eliminate blank boxes, (2) add a structured `instructions` JSONB column to the drills table and render it in the detail dialog.

## 1. Remove Blank Video Previews

**Files: `DrillLibraryPlayer.tsx` (DrillCard) + `DrillDetailDialog.tsx`**

Add a helper check: `const hasVideo = drill.video_url && drill.video_url.trim() !== '';`

- **DrillCard** (line 24-29): Only render `<video>` thumbnail when `hasVideo` is true. Otherwise show the Play icon placeholder. No blank box.
- **DrillDetailDialog** (line 67): Same guard — use `hasVideo` instead of `drill.video_url`. The "No video available" fallback already exists but currently doesn't catch empty strings.

## 2. Add `instructions` JSONB Column to Drills Table

**Database migration:**

```sql
ALTER TABLE public.drills
ADD COLUMN instructions jsonb DEFAULT NULL;

COMMENT ON COLUMN public.drills.instructions IS
'Structured drill instructions: {purpose, setup, execution[], coaching_cues[], mistakes[], progression[]}';
```

This is nullable so all existing drills continue working. Instructions get populated over time via the CMS or AI generation pipeline.

## 3. Render Structured Instructions in DrillDetailDialog

**File: `DrillDetailDialog.tsx`**

Add a TypeScript interface:
```typescript
interface DrillInstructions {
  purpose?: string;
  setup?: string;
  execution?: string[];
  coaching_cues?: string[];
  mistakes?: string[];
  progression?: string[];
}
```

After the description section, render each populated field:
- **Purpose** — paragraph
- **Setup** — paragraph
- **Execution** — ordered list
- **Coaching Cues** — unordered list with quote styling
- **Common Mistakes** — unordered list with warning styling
- **Progression** — unordered list

Only render sections that have content. Parse `drill.instructions` as `DrillInstructions` (it comes from the DB as `Json`).

## 4. Update Drill Type + Query

**File: `usePlayerDrillLibrary.ts`**

- Add `instructions: Record<string, any> | null` to `LibraryDrill` interface
- Add `instructions` to the select query

**File: `DrillLibraryPlayer.tsx`**

- Pass `instructions` through to the detail dialog via the `scoredDrill` adapter

**File: `drillRecommendationEngine.ts`**

- Add `instructions` to the `Drill` type if present in the scored drill path

## Files Summary

| File | Action |
|------|--------|
| DB migration | Add `instructions jsonb` column to `drills` |
| `src/components/practice/DrillDetailDialog.tsx` | Bulletproof video check + render structured instructions |
| `src/pages/DrillLibraryPlayer.tsx` | Bulletproof video in DrillCard + pass instructions |
| `src/hooks/usePlayerDrillLibrary.ts` | Add instructions to type + query |

