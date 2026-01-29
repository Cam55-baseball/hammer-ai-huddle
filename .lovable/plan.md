

# Fix Plan: Make Educational Text Even Darker

## Current State

Based on the last diff, the introductory text colors are currently:
- **Eating Disorder section**: `text-amber-300`
- **Body Image section**: `text-teal-300`

## Solution

Move to even darker shades in the Tailwind color scale:

| File | Current | New |
|------|---------|-----|
| `EatingDisorderEducation.tsx` | `text-amber-300` | `text-amber-400` |
| `BodyImageEducation.tsx` | `text-teal-300` | `text-teal-400` |

The 400 shades are more saturated and will provide better contrast against the dark card backgrounds.

## Changes Required

### File 1: `src/components/nutrition/EatingDisorderEducation.tsx`

**Line 100** - Change:
```tsx
<p className="text-sm text-amber-400">
```

### File 2: `src/components/nutrition/BodyImageEducation.tsx`

**Line 105** - Change:
```tsx
<p className="text-sm text-teal-400">
```

## Summary

| Change | File | Line |
|--------|------|------|
| `text-amber-300` → `text-amber-400` | `EatingDisorderEducation.tsx` | 100 |
| `text-teal-300` → `text-teal-400` | `BodyImageEducation.tsx` | 105 |

