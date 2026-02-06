
# Implementation Plan: Fix Fascia Error & Add Goal Prompts

## Overview

This plan addresses four requests:
1. **Fix the "Fascia" activity error** - When clicking on a custom activity that uses block-based workouts
2. **Weekly Wellness Goals - Add weekly goal text input** - Ask users what their goals are for the week
3. **6-Week Tracking Goal Prompt** - Add dropdown to ask about 6-week performance goals
4. **12-Week Tracking Goal Prompt** - Add dropdown to ask about 3-year long-term goals

All goal answers will be stored in the database and included in progress reports (AI-powered 6-week recaps).

---

## Part 1: Fix the Fascia Activity Error

### Root Cause
When a custom activity uses the block-based workout system, the `exercises` field is stored as an object:
```typescript
{ _useBlocks: true, blocks: [...] }
```

However, `CustomActivityCard.tsx` line 31 calls:
```typescript
template.exercises.slice(0, 3).map(...)
```

This fails because `.slice()` only works on arrays, not objects.

### Solution
Update `CustomActivityCard.tsx` to safely handle both array and block-based exercise formats:

```typescript
// Before
const exercisePreview = template.exercises.slice(0, 3).map(e => 
  `${e.sets || ''}${e.sets && e.reps ? '×' : ''}${e.reps || ''} ${e.name}`.trim()
).filter(Boolean).join(' • ');

// After
const getExercisePreview = () => {
  // Handle block-based workout system
  if (template.exercises && typeof template.exercises === 'object' && '_useBlocks' in template.exercises) {
    const blockData = template.exercises as { _useBlocks: boolean; blocks: Array<{ name: string; exercises: any[] }> };
    const blockNames = blockData.blocks?.slice(0, 3).map(b => b.name) || [];
    return blockNames.join(' → ');
  }
  
  // Handle traditional exercise array
  if (Array.isArray(template.exercises)) {
    return template.exercises.slice(0, 3).map(e => 
      `${e.sets || ''}${e.sets && e.reps ? '×' : ''}${e.reps || ''} ${e.name}`.trim()
    ).filter(Boolean).join(' • ');
  }
  
  return '';
};

const exercisePreview = getExercisePreview();
```

### Files to Modify
| File | Change |
|------|--------|
| `src/components/custom-activities/CustomActivityCard.tsx` | Add safe handling for block-based exercises |

---

## Part 2: Weekly Wellness Goals - Add Week Goals Text Input

### Current State
The Weekly Wellness Quiz has 3 steps: Mood, Stress, Discipline. Each step uses a slider to set targets.

### Enhancement
Add a 4th step asking: "What are your goals for this week?" with a text area input.

### Database Changes
Add a new column to `vault_weekly_wellness_quiz`:

```sql
ALTER TABLE vault_weekly_wellness_quiz 
ADD COLUMN weekly_goals_text TEXT;
```

### Component Changes

**WeeklyWellnessQuizDialog.tsx:**
- Add step 4 with a text area for weekly goals
- Update the steps array to include the new step
- Store the text in the new `weekly_goals_text` column

```typescript
const [weeklyGoalsText, setWeeklyGoalsText] = useState('');

// Add new step configuration
const newStep = {
  titleKey: 'weeklyWellnessQuiz.step4Title',
  descriptionKey: 'weeklyWellnessQuiz.step4Description',
  color: 'text-cyan-400',
  bgColor: 'from-cyan-500/30 via-sky-500/20 to-blue-500/30',
  render: () => (
    <Textarea
      value={weeklyGoalsText}
      onChange={(e) => setWeeklyGoalsText(e.target.value)}
      placeholder={t('weeklyWellnessQuiz.goalsPlaceholder')}
      rows={4}
      maxLength={500}
    />
  ),
};
```

**useWeeklyWellnessQuiz.ts:**
- Update `saveGoals` to include `weekly_goals_text` parameter
- Update interface definitions

### Files to Modify
| File | Change |
|------|--------|
| `src/components/vault/WeeklyWellnessQuizDialog.tsx` | Add step 4 with goals text area |
| `src/hooks/useWeeklyWellnessQuiz.ts` | Update save function and types |
| `src/i18n/locales/*.json` (8 files) | Add translation keys |

---

## Part 3: 6-Week Tracking Goal Prompt

### Location
Add below the Performance Tests card in `VaultPerformanceTestCard.tsx` (inside the 6-week tracking section).

### Database Changes
Add a new column to `vault_performance_tests`:

```sql
ALTER TABLE vault_performance_tests 
ADD COLUMN six_week_goals_text TEXT;
```

### UI Implementation
Add a collapsible section with a text area:

```typescript
<div className="space-y-2 pt-4 border-t">
  <Label className="text-sm font-bold flex items-center gap-2">
    <Target className="h-4 w-4 text-primary" />
    {t('vault.performance.sixWeekGoals')}
  </Label>
  <Textarea
    value={sixWeekGoals}
    onChange={(e) => setSixWeekGoals(e.target.value)}
    placeholder={t('vault.performance.sixWeekGoalsPlaceholder')}
    rows={3}
    maxLength={500}
  />
</div>
```

### Files to Modify
| File | Change |
|------|--------|
| `src/components/vault/VaultPerformanceTestCard.tsx` | Add 6-week goals text input |
| `src/hooks/useVault.ts` | Update save function to include goals |
| `src/i18n/locales/*.json` (8 files) | Add translation keys |

---

## Part 4: 12-Week Tracking Long-Term Goals

### Location
Add below the Scout Grades card in `VaultScoutGradesCard.tsx` (inside the 12-week tracking section).

### Database Changes
Add a new column to `vault_scout_grades`:

```sql
ALTER TABLE vault_scout_grades 
ADD COLUMN long_term_goals_text TEXT;
```

### UI Implementation
Similar to 6-week, but with different prompt and longer scope:

```typescript
<div className="space-y-2 pt-4 border-t">
  <Label className="text-sm font-bold flex items-center gap-2">
    <Trophy className="h-4 w-4 text-amber-500" />
    {t('vault.scoutGrades.longTermGoals')}
  </Label>
  <p className="text-xs text-muted-foreground">
    {t('vault.scoutGrades.longTermGoalsDescription')}
  </p>
  <Textarea
    value={longTermGoals}
    onChange={(e) => setLongTermGoals(e.target.value)}
    placeholder={t('vault.scoutGrades.longTermGoalsPlaceholder')}
    rows={4}
    maxLength={1000}
  />
</div>
```

### Files to Modify
| File | Change |
|------|--------|
| `src/components/vault/VaultScoutGradesCard.tsx` | Add 3-year long-term goals text input |
| `src/hooks/useVault.ts` | Update save function to include goals |
| `src/i18n/locales/*.json` (8 files) | Add translation keys |

---

## Part 5: Include Goals in Progress Reports

### Update the AI Recap Function
Modify `supabase/functions/generate-vault-recap/index.ts` to:

1. Fetch the user's goals from all three sources:
   - Weekly wellness goals text
   - 6-week performance goals text
   - 12-week/3-year long-term goals text

2. Include them in the AI prompt:

```typescript
// Fetch goals
const { data: weeklyGoals } = await supabase
  .from('vault_weekly_wellness_quiz')
  .select('weekly_goals_text, week_start_date')
  .eq('user_id', userId)
  .gte('week_start_date', periodStart)
  .order('week_start_date', { ascending: false });

const { data: performanceGoals } = await supabase
  .from('vault_performance_tests')
  .select('six_week_goals_text, test_date')
  .eq('user_id', userId)
  .not('six_week_goals_text', 'is', null)
  .order('test_date', { ascending: false })
  .limit(1);

const { data: longTermGoals } = await supabase
  .from('vault_scout_grades')
  .select('long_term_goals_text, graded_at')
  .eq('user_id', userId)
  .not('long_term_goals_text', 'is', null)
  .order('graded_at', { ascending: false })
  .limit(1);

// Include in AI prompt
const goalsContext = `
ATHLETE'S STATED GOALS:
- Weekly Goals (last 6 weeks): ${weeklyGoals?.map(g => g.weekly_goals_text).filter(Boolean).join('; ') || 'None provided'}
- 6-Week Performance Goals: ${performanceGoals?.[0]?.six_week_goals_text || 'None provided'}
- 3-Year Long-Term Goals: ${longTermGoals?.[0]?.long_term_goals_text || 'None provided'}

Analyze progress toward these goals and provide specific recommendations...
`;
```

3. Store goals summary in recap_data for display:

```typescript
recap_data: {
  // ...existing fields
  athlete_goals: {
    weekly_goals: weeklyGoals?.map(g => g.weekly_goals_text).filter(Boolean) || [],
    six_week_goals: performanceGoals?.[0]?.six_week_goals_text || null,
    long_term_goals: longTermGoals?.[0]?.long_term_goals_text || null,
  },
  goal_progress_analysis: "..." // AI-generated analysis
}
```

### Files to Modify
| File | Change |
|------|--------|
| `supabase/functions/generate-vault-recap/index.ts` | Fetch and include goals in AI prompt |

---

## Database Migrations Summary

```sql
-- Migration 1: Weekly wellness goals text
ALTER TABLE vault_weekly_wellness_quiz 
ADD COLUMN IF NOT EXISTS weekly_goals_text TEXT;

-- Migration 2: 6-week performance goals text  
ALTER TABLE vault_performance_tests 
ADD COLUMN IF NOT EXISTS six_week_goals_text TEXT;

-- Migration 3: Long-term goals text (3 years)
ALTER TABLE vault_scout_grades 
ADD COLUMN IF NOT EXISTS long_term_goals_text TEXT;
```

---

## i18n Translation Keys

### English (to be translated to 8 languages)

```json
{
  "weeklyWellnessQuiz": {
    "step4Title": "Set Your Weekly Goals",
    "step4Description": "What do you want to achieve this week?",
    "goalsPlaceholder": "Example: Complete all 4 workouts, improve my 10-yard dash time, stay hydrated every day..."
  },
  "vault": {
    "performance": {
      "sixWeekGoals": "What are your goals for the next 6 weeks?",
      "sixWeekGoalsPlaceholder": "Example: Increase my exit velocity by 5 mph, add 10 lbs to my squat, improve my long toss distance..."
    },
    "scoutGrades": {
      "longTermGoals": "What are your long-term goals?",
      "longTermGoalsDescription": "Think big - where do you want to be in 3 years?",
      "longTermGoalsPlaceholder": "Example: Play D1 college baseball, get drafted, make the varsity team, earn a scholarship..."
    }
  }
}
```

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/components/custom-activities/CustomActivityCard.tsx` | Modify | Fix block-based exercises handling |
| `src/components/vault/WeeklyWellnessQuizDialog.tsx` | Modify | Add step 4 for weekly goals text |
| `src/hooks/useWeeklyWellnessQuiz.ts` | Modify | Update save function for goals text |
| `src/components/vault/VaultPerformanceTestCard.tsx` | Modify | Add 6-week goals text input |
| `src/components/vault/VaultScoutGradesCard.tsx` | Modify | Add 3-year long-term goals text input |
| `src/hooks/useVault.ts` | Modify | Update save functions for goals |
| `supabase/functions/generate-vault-recap/index.ts` | Modify | Include goals in AI recap prompt |
| `src/i18n/locales/*.json` (8 files) | Modify | Add translation keys |

---

## Success Criteria

1. Clicking on "Fascia" activity (or any block-based workout) no longer shows an error
2. Block-based activities display block names as preview instead of individual exercises
3. Weekly Wellness Quiz has 4 steps (mood, stress, discipline, goals)
4. 6-Week Performance Tests section includes a goals text input
5. 12-Week Scout Grades section includes a 3-year long-term goals text input
6. All goal inputs are stored in the database
7. Goals are included in the AI-powered 6-week recap analysis
8. All 8 languages have complete translations
