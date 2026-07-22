Move the Week rhythm block inside the same `Collapsible` as the Yesterday/Today/Tomorrow narrative in `src/components/hammer/DailyIntentHeader.tsx`.

- Trigger row: Sparkles icon + `intent.headline` + chevron (closed by default). Streak flame badge stays outside on the right.
- `CollapsibleContent` contains, in order: Yesterday / Today / Tomorrow lines, then the Week rhythm header ("WEEK RHYTHM" + "{activeCount} / 7 active") and 7-day grid with Today marker.
- Earned unlocks and Fresh angle sections remain outside the collapsible, unchanged.

No logic changes.