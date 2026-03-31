

# Fix Post-Session Summary + Weekly Challenge

## Two Issues

### Issue 1: Post-Session Summary is not elite or contextual
The current `PostSessionSummary` is bare-bones:
- Generic "Session Saved" header with no personality
- Shows raw composite index keys (e.g. `competitive_execution`) when labels don't match
- Only shows scores relevant to ALL modules (BQI, FQI, PEI) even when session is e.g. hitting-only
- `AIPromptCard` relies on MPI development prompts which may be empty, showing nothing useful
- No session stats recap (rep count, drill count, quality breakdown)
- No grade label (Elite, Plus, etc.) for the overall session
- No module-specific context or encouragement

**Fix:** Rebuild `PostSessionSummary` to be module-aware and visually polished:
- Fetch full session data including `drill_blocks`, `effective_grade`, `notes`
- Show session stats: total reps, drill blocks count, session duration context
- Show the `effective_grade` with the grade label (Elite, Plus, etc.) as a prominent hero score
- Filter composite indexes to only show those relevant to the module (hitting → BQI + Decision; pitching → PEI; fielding → FQI, etc.)
- Add proper human-readable labels for ALL composite keys including `competitive_execution` → "Competitive Execution"
- Add a contextual motivational message based on the grade tier
- Style with gradient backgrounds, better typography, and visual hierarchy
- Keep streak display and AI prompts as secondary cards

### Issue 2: Weekly Challenge shows raw translation keys as text
The component renders `t('weeklyChallenge.challenges.${challengeId}.title', challengeId?.replace('_', ' '))`. The English translations DO exist in `en.json` under the `weeklyChallenge.challenges` namespace. The raw text fallback (`challengeId?.replace('_', ' ')`) shows when:
1. The edge function returns a `challenge_id` not in the translation file (52 challenges in edge function, only ~30 translated)
2. Or i18n lookup fails for some reason

**Fix:**
- Add a `CHALLENGE_DISPLAY` map directly in the component with title + description for ALL 52 challenge IDs (eliminates dependency on translation keys for challenge content)
- Use translations as primary source, fall back to the display map, then to formatted ID
- Fix the category badge which also shows raw keys like `mental_mastery` by using the same pattern

Additionally, the edge function has no logs, suggesting it may fail silently or not be called. Need to verify it's deployed and test it.

## Files to Change

| File | Action |
|------|--------|
| `src/components/practice/PostSessionSummary.tsx` | **Rewrite** — module-aware, grade label, rep stats, filtered scores, elite design |
| `src/components/mind-fuel/MindFuelWeeklyChallenge.tsx` | **Modify** — add inline display map for all 52 challenges, fix raw text fallbacks |

## Technical Details

### PostSessionSummary Rewrite
- Query `performance_sessions` for `drill_blocks, effective_grade, notes, composite_indexes, session_date, coach_id, session_type, module`
- Extract rep count from `drill_blocks` (sum all `reps.length` across blocks)
- Use `getGradeLabel()` from `src/lib/gradeLabel.ts` for the effective grade
- Module-to-index mapping:
  - hitting → `bqi`, `decision`, `competitive_execution`
  - pitching → `pei`, `decision`, `competitive_execution`
  - fielding → `fqi`, `decision`, `competitive_execution`
  - baserunning/bunting/throwing → `decision`, `competitive_execution`
- Motivational tier messages: Elite → "Dominant session.", Plus → "Strong work.", Average → "Solid foundation.", Below → "Every rep counts."

### Weekly Challenge Display Map
- Create `CHALLENGE_TITLES: Record<string, { title: string; description: string }>` with all 52 challenge IDs
- Replace `t('weeklyChallenge.challenges.${id}.title', ...)` with `CHALLENGE_TITLES[id]?.title ?? t(...)` pattern
- Same for descriptions and category labels

