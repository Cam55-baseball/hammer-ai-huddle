## Change

In `src/components/hammer/DailyIntentHeader.tsx`, refactor the "Week" rhythm strip into a collapsible section that starts closed, and improve the day-of-week labels.

### Details

1. **Better day labels**: Replace the ambiguous single-letter labels (`M T W T F S S` — two T's, two S's) with two-letter abbreviations: `Mo Tu We Th Fr Sa Su`. Still rotate so today sits in the last cell. Add a subtle "Today" marker/label on the active cell for clarity.

2. **Collapsible dropdown**: Wrap the week arc in a `<Collapsible>` (shadcn) with:
   - Trigger row: "Week rhythm" label + small summary (e.g. `3 / 7 active`) + chevron icon
   - `defaultOpen={false}` so it begins closed
   - Content: the existing 7-cell grid with rotated labels and today ring

3. **Scope**: Only this component changes. No logic, streak, or engagement changes — purely presentation of the week strip.

### Technical notes

- Use `@/components/ui/collapsible` (already available via shadcn).
- Keep `rotatedLabels` logic; just swap the source array to two-letter names.
- Compute `activeCount = streak.weekArc.filter(Boolean).length` for the trigger summary.
