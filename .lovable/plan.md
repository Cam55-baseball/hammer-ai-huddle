

# Master Controls — Bigger Touch Targets

## Problem

Buttons in master control are `h-5 w-5` (20×20px) with `h-2.5` icons — too small for reliable mobile tapping. Apple's HIG recommends minimum 44×44pt touch targets.

## Fix

### 1. `src/components/royal-timing/RoyalTimingModule.tsx` (lines 338–375)

- Increase master playback buttons from `h-5 w-5` to `h-8 w-8` with `h-3.5 w-3.5` icons
- Increase speed selector from `h-5 w-12` to `h-8 w-14 text-xs`
- Increase container gap from `gap-0.5` to `gap-1`
- Switch layout to **two rows** to fit larger buttons on 390px:
  - **Row 1**: InlineTimer (compact, with label)
  - **Row 2**: All 6 playback buttons + speed selector
- Container padding stays minimal: `py-1.5 px-2`

### 2. `src/components/royal-timing/InlineTimer.tsx` (compact branch, lines 30–70)

- Increase timer control buttons from `h-5 w-5` to `h-7 w-7` with `h-3 w-3` icons
- Increase the Auto toggle switch proportionally
- Keep timer text at `text-sm` (readable but not oversized)

| File | Change |
|------|--------|
| `src/components/royal-timing/RoyalTimingModule.tsx` | Split master controls to two rows, enlarge buttons to `h-8` |
| `src/components/royal-timing/InlineTimer.tsx` | Enlarge compact buttons to `h-7` |

