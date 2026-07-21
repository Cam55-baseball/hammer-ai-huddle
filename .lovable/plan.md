## Root cause (verified)

In `src/lib/iq/fieldModel.ts` (line 100), the lateral axis for outfielders is computed as:

```ts
const lateral: Pt = { x: axis.y, y: -axis.x }; // 90° CW rotation
```

With `axis = home→2B = (0, -1)` on our grid (home at `(50, 95)`, 2B at `(50, ~15)`), this rotation yields `lateral = (-1, 0)` — pointing to screen-**left** (3B/LF side).

The comment two lines above says the exact opposite:
> "Positive lateral = to batter's RIGHT (1B side)... +x for RHH view."

So the presets in `alignmentPresets.ts` were authored to that intent (LF uses **negative** `lateralStepsRightOfSecond`, RF uses **positive**), but the vector transform points the wrong way. Result: **LF renders on the RF side and RF renders on the LF side** — exactly what you're seeing on `/iq/comebacker-r1-double-play`.

## Fix

Change the lateral rotation to 90° CCW so `+lateralStepsRightOfSecond` truly maps to +x (1B side), matching the comment and every preset already in the codebase:

```ts
const lateral: Pt = { x: -axis.y, y: axis.x }; // 90° CCW — +x = 1B side (batter's right for RHH)
```

That single-line change puts LF back on the 3B side and RF on the 1B side across every situation, every alignment preset, and every scenario — because every outfielder position in the app flows through `anchorToPos`.

## Verification

1. Reload `/iq/comebacker-r1-double-play` — LF must sit on screen-left, RF on screen-right, CF centered.
2. Toggle the situation between RHH and LHH — the outfield shift must **mirror** (RHH: LF pulled toward line, RF shaded toward gap; LHH: reversed).
3. Spot-check 3–4 other situations (any bunt, any base-hit-to-RF, any deep-fly situation) to confirm no regression on infielders (they're unaffected — only the `outfield` branch changes).
4. Open `/owner/iq/alignments` editor and confirm the drag positions of LF/RF match the coach labels ("3 steps right of 2B" now visually lands on the 1B side).

## Out of scope

- No changes to presets, scenarios, actor data, playback, or overlays.
- No schema changes.
- Infielder anchors (`corner_bag`, `middle_bag`) are geometrically correct and untouched.