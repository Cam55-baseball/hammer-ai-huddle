
# Improve PPG Camera Instructions for Multi-Camera Phones

## Problem

The current measuring phase shows only one line of instruction:

> "Hold your fingertip firmly over the rear camera lens"

This is ambiguous for users with multi-camera phones (e.g. iPhone Pro, Samsung S-series with 3 lenses). Users don't know:
- **Which specific lens** to cover — the main/wide lens, not ultrawide or telephoto
- **How much pressure** to apply — firm but not white-knuckle
- **How to position** their finger — pad of the finger flat over the lens, not the tip
- **What to expect visually** — the screen will look fully red when done correctly

## What's Changing

All changes are in **`src/components/vault/quiz/RestingHeartRateCapture.tsx`** only.

### 1 — Pre-measurement instruction card (idle phase, mobile only)

Add a short numbered "How to" list that appears before the user taps "Measure with Camera", so they know what to do before the 30-second timer starts:

```
1. Flip your phone over so the cameras face up
2. Cover the MAIN (widest) camera lens with the pad of your index finger
3. Press gently but firmly — your fingertip should look red/orange
4. Keep still for 30 seconds while we read your pulse
```

This is rendered as a compact numbered list below the current description line, styled in `text-xs text-muted-foreground`.

### 2 — Measuring phase instructions (expanded)

Replace the single-line hint with a two-part instruction block:

**Primary instruction (bold):**
> Cover the main camera lens with the pad of your finger

**Secondary tip (smaller, muted):**
> On multi-camera phones, use the widest/largest lens. Press firmly — your fingertip should glow red.

This makes it immediately clear which lens to use as soon as the countdown starts.

### 3 — Visual diagram element

Add a simple SVG camera diagram inline in the idle phase that illustrates:
- A phone outline (rectangle)
- Three dots representing the camera array
- A highlighted circle on the largest dot labelled "Use this one →"

This is entirely inline SVG — no new dependencies.

## Files Changed

**`src/components/vault/quiz/RestingHeartRateCapture.tsx`**
- Idle phase: add numbered prep list + inline camera diagram
- Measuring phase: expand instruction text from 1 line to 2 lines (primary + tip)
- No logic changes, no state changes, no dependency changes
