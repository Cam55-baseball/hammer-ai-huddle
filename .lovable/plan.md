

# Move Vault Past Days into Calendar Day Sheet

## What Changes

When you tap a day in the Calendar, the day sheet that slides up will now show your Vault journal entries (check-ins, notes, workouts, nutrition, etc.) at the bottom, below your scheduled events. The "Past Days" dropdown section currently at the bottom of the Vault page will be removed.

---

## How It Works

1. **CalendarDaySheet gets a new "Journal Entries" section** at the bottom of the scroll area, after the skipped events section. When the sheet opens for any date, it calls `fetchHistoryForDate` from `useVault` to load that day's vault data (quizzes, notes, workouts, nutrition, performance tests, photos, scout grades, custom activities).

2. **Renders using existing VaultDayRecapCard** -- the same rich recap component already used in the Vault, showing wellness check-ins with timestamps, workout logs, nutrition data, notes, and more. This appears inside a collapsible section labeled "Journal Entries" with an entry count badge.

3. **VaultPastDaysDropdown removed from Vault page** -- the `<VaultPastDaysDropdown>` component is removed from `Vault.tsx`. The component file itself is kept in case the History tab still references similar patterns, but its rendering in the main Vault tab is removed.

4. **Calendar dots get a new "journal" indicator** -- days with vault entries get a teal dot on the calendar grid so users can visually see which days have journal data, alongside existing event dots.

---

## Technical Details

### Files Modified

| File | Change |
|------|--------|
| `src/components/calendar/CalendarDaySheet.tsx` | Import `useVault` and `VaultDayRecapCard`. Add state for vault history data. On sheet open, call `fetchHistoryForDate(format(date, 'yyyy-MM-dd'))`. Render a collapsible "Journal Entries" section with `VaultDayRecapCard` at the bottom of the ScrollArea, after the skipped events section. Show entry count badge. |
| `src/pages/Vault.tsx` | Remove the `<VaultPastDaysDropdown>` component rendering (~line 822-825). Remove the import. |
| `src/components/calendar/CalendarView.tsx` | Add a `vaultJournal` filter toggle (teal color). Query `entriesWithData` from `useVault` and add teal dots for days with vault entries. |
| `src/hooks/useCalendar.ts` | No changes needed -- vault data loads independently via `useVault` inside the day sheet. |

### CalendarDaySheet Integration

```text
Sheet opens for a date
  --> useEffect fires fetchHistoryForDate(dateStr)
  --> historyData populates
  --> After existing events + skipped section:
      Collapsible "Journal Entries" section
        --> VaultDayRecapCard renders all vault data
        --> Shows timestamps on each entry
        --> Collapsible subsections (wellness, workouts, nutrition, etc.)
```

The section only renders if there are any journal entries for that date. A loading spinner shows while fetching.

### Calendar Grid Enhancement

`CalendarView` imports `useVault` to access `entriesWithData` (array of date strings with vault entries). For each calendar day, if the date string is in `entriesWithData`, a teal dot is added to the event indicators. A new "Journal" filter toggle (teal) controls visibility of these dots.

### Data Flow

- `useVault` hook is already available app-wide and handles auth internally
- `fetchHistoryForDate` returns the full `HistoryEntry` object with all vault data types
- `VaultDayRecapCard` already handles rendering all entry types with proper formatting and timestamps
- No new database queries or schema changes needed

