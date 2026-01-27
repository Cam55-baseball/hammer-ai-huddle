
# Past Days Journal Viewer for The Vault

## Overview

This feature adds a "Past Days" dropdown at the bottom of the Vault that allows users to quickly browse and review their journal entries for any past date. Unlike the existing History tab (which requires navigating to a separate tab), this dropdown provides an in-context, journal-style recap view directly on the Today tab for swift review of historical data.

The feature will support:
- Viewing complete daily recaps in a formatted journal style
- Saving individual day entries to a favorites/bookmarks list
- Exporting day entries as PDF
- Quick date navigation via dropdown

---

## Current Architecture

The Vault already has robust history retrieval capabilities:

| Component | Purpose |
|-----------|---------|
| `useVault.fetchHistoryForDate()` | Fetches all vault data for a specific date |
| `VaultHistoryTab.tsx` | Displays historical entries with calendar navigation |
| `entriesWithData` | Tracks which dates have journal entries (last 90 days) |

The existing `fetchHistoryForDate` function retrieves:
- Focus Quizzes (morning, pre-workout, night)
- Free Notes
- Workout Notes
- Nutrition Logs
- Performance Tests
- Progress Photos
- Scout Grades

**Missing from current history retrieval:** Custom Activity Logs are not included in `fetchHistoryForDate`, so they need to be added for a complete picture.

---

## Implementation Plan

### Step 1: Extend History Data to Include Custom Activities

**File:** `src/hooks/useVault.ts`

Add custom activity logs to the `fetchHistoryForDate` function and update the return type:

```typescript
// In the Promise.all block, add:
{ data: customActivities } = await supabase
  .from('custom_activity_logs')
  .select(`
    *, 
    custom_activity_templates (title, activity_type, icon, color)
  `)
  .eq('user_id', user.id)
  .eq('entry_date', date)
  .eq('completed', true)

// Return object includes:
customActivities: (customActivities || []) as CustomActivityLog[]
```

Update the `HistoryEntry` interface to include `customActivities`.

---

### Step 2: Create the VaultPastDaysDropdown Component

**New File:** `src/components/vault/VaultPastDaysDropdown.tsx`

A collapsible dropdown component placed at the bottom of the Vault Today tab:

**Features:**
- Collapsed by default, shows "Past Days" label with calendar icon
- Expands to show a date picker (last 90 days with data highlights)
- Displays formatted journal recap for selected date
- Action buttons: Save to Library, Export PDF, Close

**UI Structure:**
```
[Collapsible Trigger: "Past Days" with ChevronDown icon]
  │
  └─[Expanded Content]
      ├── Date Selector (dropdown of dates with entries)
      ├── Journal Recap Card
      │   ├── Header: Date + Entry Count
      │   ├── Morning Check-In Summary
      │   ├── Pre-Workout Summary
      │   ├── Night Check-In Summary
      │   ├── Custom Activities Completed
      │   ├── Workout Notes
      │   ├── Nutrition Summary
      │   ├── Free Notes
      │   └── Performance Tests / Photos / Grades (if any)
      └── Action Buttons: [Save] [Export PDF] [Close]
```

---

### Step 3: Create the Journal Day Recap Format Component

**New File:** `src/components/vault/VaultDayRecapCard.tsx`

A formatted, readable journal-style card that summarizes all vault entries for a single day:

**Sections (conditionally rendered):**

1. **Daily Wellness Overview**
   - Morning: mood, discipline, sleep hours, sleep quality, weight
   - Pre-Workout: CNS scores, pain tracking, training intent
   - Night: reflections, goals for tomorrow

2. **Training Summary**
   - Custom activities completed (with duration, intensity, notes)
   - Program workouts (weight lifted, exercises)

3. **Nutrition Snapshot**
   - Calories, macros, hydration, energy level

4. **Personal Notes**
   - Free-form journal entries

5. **Periodic Tracking** (if logged that day)
   - Performance test results
   - Progress photos
   - Scout grades

Each section uses compact, scannable formatting with icons and color-coded badges.

---

### Step 4: Implement Save-to-Library Functionality

**Database:** Use existing `vault_saved_entries` pattern or create new table

**Option A (Simpler):** Store saved day references in localStorage
```typescript
// Key: vault_saved_days
// Value: ["2025-01-20", "2025-01-15", ...]
```

**Option B (Persistent):** Create database table for saved days
```sql
CREATE TABLE vault_saved_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  saved_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, entry_date)
);
```

For this implementation, I recommend **Option A (localStorage)** initially for simplicity, with the ability to upgrade to database storage later.

---

### Step 5: Implement PDF Export

**Approach:** Use dynamic import of `jspdf` (already in project for recap exports)

```typescript
const exportDayAsPdf = async (historyData: HistoryEntry) => {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  
  // Add formatted content for each section
  doc.text(`Vault Journal - ${format(date, 'MMMM d, yyyy')}`, 20, 20);
  // ... add sections
  
  doc.save(`vault-journal-${date}.pdf`);
};
```

---

### Step 6: Integrate into Vault.tsx

**File:** `src/pages/Vault.tsx`

Place the dropdown at the bottom of the Today tab content, after the 12-Week Tracking section:

```tsx
{/* Past Days Journal Dropdown */}
<VaultPastDaysDropdown
  fetchHistoryForDate={fetchHistoryForDate}
  entriesWithData={entriesWithData}
/>
```

---

## Component Architecture

```
Vault.tsx
└── TabsContent value="today"
    ├── [existing content...]
    └── VaultPastDaysDropdown (NEW)
        ├── Collapsible trigger
        ├── Date selector
        ├── VaultDayRecapCard (NEW)
        │   ├── DailyWellnessSection
        │   ├── TrainingSection
        │   ├── NutritionSection
        │   ├── NotesSection
        │   └── PeriodicTrackingSection
        └── Action buttons (Save, Export, Close)
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/vault/VaultPastDaysDropdown.tsx` | Main dropdown container with date selection and actions |
| `src/components/vault/VaultDayRecapCard.tsx` | Formatted journal-style day summary |

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useVault.ts` | Add custom activities to `fetchHistoryForDate`, update interface |
| `src/pages/Vault.tsx` | Import and render `VaultPastDaysDropdown` at bottom of Today tab |
| `src/components/vault/VaultHistoryTab.tsx` | Update `HistoryEntry` interface to include `customActivities` |

---

## User Experience Flow

1. User scrolls to bottom of Vault Today tab
2. Sees "Past Days" button/dropdown (collapsed)
3. Clicks to expand
4. Selects a date from dropdown (dates with entries are highlighted)
5. Views formatted journal recap for that day
6. Can:
   - **Save** to bookmarks for quick access
   - **Export** as PDF for offline review
   - **Close** to collapse and continue with today's entries
7. Saved days appear at top of the date dropdown for quick access

---

## Technical Details

### Date Selection Dropdown
- Shows last 90 days
- Highlights dates with entries (bold/underlined)
- Saved dates appear with a bookmark icon
- Uses Popover + Calendar component (existing pattern)

### Journal Recap Format
- Scannable, not verbose
- Uses icons and color badges
- Groups related data (wellness, training, nutrition)
- Shows timestamps for context
- Expandable sections for detailed data

### PDF Export Format
- Clean, printable layout
- Includes date header
- Sections match on-screen view
- Uses jsPDF (already in dependencies)

### Save/Bookmark System
- localStorage for MVP
- Toggle save/unsave
- Saved dates list accessible in dropdown

---

## Internationalization

All new text will use translation keys under `vault.pastDays.*`:
- `vault.pastDays.title` - "Past Days"
- `vault.pastDays.selectDate` - "Select a date"
- `vault.pastDays.noEntries` - "No entries for this day"
- `vault.pastDays.save` - "Save to Library"
- `vault.pastDays.export` - "Export PDF"
- `vault.pastDays.saved` - "Saved"
- `vault.pastDays.morningCheckin` - "Morning Check-In"
- `vault.pastDays.preWorkout` - "Pre-Workout"
- `vault.pastDays.nightReflection` - "Night Reflection"
- etc.
