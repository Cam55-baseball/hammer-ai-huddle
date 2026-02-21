

# Enhance Checkbox Field Analysis + Add User Guidance

## What's Changing

### Problem 1: Checkbox Labels Are Ignored in AI Analysis
When a user creates a checkbox field like "Ice Bath Completed" or "Foam Roll Before Bed," the 6-week recap AI only sees: `"Ice Bath Completed (checkbox): 8/10 completed (80% rate)"`. It knows the completion rate but the AI prompt doesn't emphasize treating each checkbox label as a meaningful training/recovery habit to analyze deeply. The checkbox `case` block in the code is literally empty -- it collects nothing extra.

### Problem 2: Users Don't Understand How to Use Custom Fields
Users are confused by what "Number" fields do and how to get the most out of custom fields. The builder has no helper text or examples explaining that number fields track measurable data (sprint times, weights, reps) for AI trend analysis.

---

## Plan

### Part 1: Deep Checkbox Analysis in 6-Week Recap

Update `supabase/functions/generate-vault-recap/index.ts`:

- **Checkbox case block (lines 681-683)**: Collect the checkbox label text into a dedicated list so the AI knows exactly what habits/tasks the athlete is tracking as checkboxes
- **Checkbox prompt line (line 709)**: Expand from just showing completion rate to include context like: `"Ice Bath Completed (checkbox/habit): 8/10 completed (80% rate) -- This is a self-defined habit/task the athlete tracks daily"`
- **AI instruction block (lines 1114-1117)**: Add specific guidance telling the AI to treat checkbox field labels as meaningful habits/recovery tasks. Each checkbox label represents something the athlete considers important enough to track -- the AI should analyze consistency patterns, correlate with performance data, and comment on specific habits by name

### Part 2: User-Friendly Guidance in Custom Fields Builder

Update `src/components/custom-activities/CustomFieldsBuilder.tsx`:

- Add a small helper/guidance section below the "Custom Fields" header explaining what each field type does with practical examples:
  - **Checkbox**: "Track daily habits (e.g., 'Ice Bath,' 'Foam Roll,' 'Stretch Before Bed')"
  - **Number**: "Track measurable data the AI will analyze for trends (e.g., 'Sprint Time: 4.2,' 'Weight Used: 185')"
  - **Text**: "Log notes or observations (e.g., 'How I felt today')"
  - **Time**: "Track time-based data (e.g., 'Recovery Duration')"

- Update placeholder text for number fields to show an example value like "e.g. 4.2" instead of the generic "Value..."

### Part 3: i18n Updates

Update `src/i18n/locales/en.json` (and the other 7 locale files) to add:
- `customFields.guidance` -- the helper text explaining field types
- `customFields.numberPlaceholder` -- better placeholder for number inputs
- `customFields.notes` and `customFields.notesPlaceholder` translations if missing

---

## Technical Details

### File 1: `supabase/functions/generate-vault-recap/index.ts`

**Lines 681-683** -- Checkbox case block: Collect checkbox labels into a list on the analysis entry so the AI gets the full context of what each checkbox represents.

**Lines 706-709** -- Checkbox prompt format: Change from:
```
"Ice Bath (checkbox): 8/10 completed (80% rate)"
```
To:
```
"Ice Bath (daily habit tracker): 8/10 completed (80% rate) -- Athlete self-tracks this as a key habit"
```

**Lines 1114-1117** -- AI instructions: Add explicit direction:
```
For CHECKBOX fields, each label represents a habit or task the athlete 
considers important enough to track daily. Analyze each one BY NAME -- 
comment on consistency, identify which habits they maintain vs skip, 
and correlate habit adherence with performance trends.
```

### File 2: `src/components/custom-activities/CustomFieldsBuilder.tsx`

Add a collapsible or always-visible guidance block after the header showing:
- Simple one-line explanations for each field type with real examples
- Update the number field placeholder to show a sample value

### File 3-10: i18n locale files (all 8 languages)

Add translated guidance strings for the custom field type explanations.

