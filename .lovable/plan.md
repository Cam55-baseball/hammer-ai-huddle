
## Change (scoped to `src/components/hammer/WkPrescriptionCard.tsx`)

1. **Fold the "Today" line into "Why this movement".** Inside the "Why this movement" block, append `why_v2.why_today` (falling back to `why.why`) beneath the existing `rx.rationale` copy, prefixed as `Today — …`.
2. **Hide the "Why this? (six answers)" card entirely.** Remove the whole `rx.why_v2 && (…)` block so those six labeled lines no longer render.
3. **Make "Why this movement" its own nested dropdown, closed by default.** Wrap the block in a `Collapsible` (defaulting to `open={false}`) with a compact trigger row (`Info` icon + label "Why this movement" + chevron). Content stays hidden until tapped. Rendered only when there is content to show (`rx.rationale`, `why_v2.why_today`, or `why.why`).

Everything else on the card (dosage, Cue, sequencing hint, injury-swap reason, "Why reduced today", Complete/Skip) stays exactly as it is.

## Out of scope
- No engine, data, or other card changes.
- No visual restyling of the outer card.
