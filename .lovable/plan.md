## Widen the default outfield spacing

The outfield defaults are currently too pinched — LF and RF sit near x≈22/78 (baseball) and 24/76 (softball), with the "standard" preset lateral at ±22–25 steps. Push both wings out so LF is meaningfully further left and RF further right, matching a realistic straight-away alignment where the corner OF are roughly 1/3 of the way between CF and the foul line.

### Changes

**`src/hooks/useDefensiveAlignment.ts`** — `fallbackAlignment`
- Baseball: `LF { x: 22 → 15, y: 22 → 20 }`, `RF { x: 78 → 85, y: 22 → 20 }`.
- Softball: `LF { x: 24 → 17, y: 26 → 24 }`, `RF { x: 76 → 83, y: 26 → 24 }`.
- CF unchanged.

**`src/lib/iq/alignmentPresets.ts`** — `standard` preset (both RHH and LHH variants)
- LF `lateralStepsRightOfSecond`: widen from −22/−25 → −34.
- RF `lateralStepsRightOfSecond`: widen from +25/+22 → +34.
- Depth unchanged (95 steps).

### Out of scope
No changes to CF, infielders, context shifts, or scenario-specific alignments. The relative direction of context nudges (pull/oppo/wind/sun) already stacks on top of the new wider baseline.
