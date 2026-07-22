## Fix: Collapse the narrative block, not the week rhythm

Previous change made the wrong section collapsible. Correct it in `src/components/hammer/DailyIntentHeader.tsx`:

1. **Make the narrative section collapsible (closed by default)**
   - Wrap the headline + Yesterday/Today/Tomorrow lines in a `Collapsible` with `defaultOpen={false}`.
   - Trigger row shows the `Sparkles` icon + `intent.headline` + chevron so users can tap to expand.
   - Streak flame badge stays outside the collapsible, on the right.
   - Yesterday / Today / Tomorrow lines live inside `CollapsibleContent`.

2. **Restore week rhythm to always visible**
   - Remove the `Collapsible` wrapper around the week arc.
   - Keep the two-letter day labels (`Mo`, `Tu`, …) and the "Today" marker under the current day cell.
   - Keep the "{activeCount} / 7 active" count as a small label above/next to the grid.

No other files change. No logic changes.