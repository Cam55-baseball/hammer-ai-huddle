

# Fix Plan: Darken Educational Introduction Text

## Problem

The introductory text in both educational sections is too light, making it harder to read:
- **Eating Disorder section**: `text-amber-200/90` (90% opacity amber-200)
- **Body Image section**: `text-teal-200/90` (90% opacity teal-200)

## Solution

Change both text colors to use full opacity versions of their respective colors, which will appear darker:

| File | Current | New |
|------|---------|-----|
| `EatingDisorderEducation.tsx` (line 100) | `text-amber-200/90` | `text-amber-100` |
| `BodyImageEducation.tsx` (line 105) | `text-teal-200/90` | `text-teal-100` |

In Tailwind's color scale:
- `amber-100` is a lighter shade name but with full opacity it reads as more solid/darker on dark backgrounds
- Alternatively, I can use `text-amber-300` which is an even more saturated/darker shade

For better contrast, I'll use **`text-amber-300`** and **`text-teal-300`** which are darker, more saturated shades that will stand out better against the card backgrounds.

## Changes Required

### File 1: `src/components/nutrition/EatingDisorderEducation.tsx`

**Line 100** - Change:
```tsx
// Before
<p className="text-sm text-amber-200/90">

// After
<p className="text-sm text-amber-300">
```

### File 2: `src/components/nutrition/BodyImageEducation.tsx`

**Line 105** - Change:
```tsx
// Before
<p className="text-sm text-teal-200/90">

// After
<p className="text-sm text-teal-300">
```

## Expected Result

Both introductory paragraphs will appear with darker, more readable text that maintains the thematic color scheme (amber for eating disorder awareness, teal for body image education).

