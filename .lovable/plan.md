

# Fix Horizontal Overflow in Hammer Workout Recommendations (Mobile)

## Problem

On mobile, the Hammer Workout Recommendations panel has text and buttons overflowing horizontally in three places:
- The "Use This Workout" button gets cut off on the right side of recommendation cards
- Recovery Notice text overflows past the right edge
- Reasoning text at the bottom of cards is clipped

## Root Causes

All issues stem from the `AIWorkoutRecommendations.tsx` component lacking proper width constraints for mobile:

1. **RecommendationCard header** (line 169): The flex row with title + button doesn't have `min-w-0` on the title container, so long workout names push the "Use This Workout" button off-screen
2. **Card title row** (line 171): Title and "Lighter Option" badge sit in a non-wrapping flex row that can exceed the card width
3. **Outer container** (line 286): Missing `overflow-hidden` so child content can bleed past the panel boundary
4. **Card components** (line 164): Cards themselves lack `overflow-hidden`
5. **Text paragraphs** (lines 80, 219): Recovery notice and reasoning text don't use `break-words` to wrap long text

## Changes (single file)

All fixes are in `src/components/custom-activities/AIWorkoutRecommendations.tsx`:

### 1. Outer container -- add overflow protection
Add `overflow-hidden` to the main wrapper div so nothing bleeds past the panel edges.

### 2. RecommendationCard -- restructure header for mobile
- Stack the title and button vertically on mobile instead of side-by-side: change the header from a horizontal flex to a vertical layout on small screens
- Add `min-w-0` to the title container so long names wrap instead of pushing content off-screen
- Add `overflow-hidden` to the Card itself
- Make the title text wrap with `break-words`

### 3. Recovery warning -- constrain text
- Add `overflow-hidden` and `break-words` to the Alert component's description text

### 4. Reasoning text -- prevent overflow
- Add `break-words` to the reasoning paragraph so long text wraps properly within the card

## Technical Details

| Location | Current | Fix |
|----------|---------|-----|
| Outer div (line 286) | `border rounded-lg p-4` | Add `overflow-hidden` |
| Card (line 164) | No overflow constraint | Add `overflow-hidden` |
| Header flex (line 169) | `flex items-start justify-between gap-2` | Add `flex-wrap` |
| Title div (line 170) | `space-y-1` | Add `min-w-0` |
| Title text (line 172) | `text-base font-bold` | Add `break-words` |
| Alert description (line 79-80) | `mt-2 space-y-2` | Add `break-words` |
| Reasoning `p` (line 219) | No word-break | Add `break-words` |

No logic changes -- CSS-only fixes that keep the desktop layout intact.

