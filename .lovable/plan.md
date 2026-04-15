

# Upgrade Post-Practice Session Insights — Elite Coaching Intelligence

## Current State
The insight engine (`src/lib/sessionInsights.ts`) is purely deterministic: it picks from ~3 template phrases per metric based on whether it's above/below a threshold. Output is limited to one "Win", one "Focus", one "Cue", 3 key metrics, and a session tag. No root cause analysis, no prescriptive drills, no trend comparison, no game transfer context.

## Architecture Decision
This requires AI generation. The deterministic engine cannot produce root cause classification, situational splits, prescriptive drill constraints, or adaptive trend analysis. We will:
- Create a new edge function `session-insights` that calls Lovable AI with structured tool calling
- Keep the deterministic engine as an instant fallback (shown while AI loads)
- Store AI-generated insights in a new `session_insights` table for instant recall on revisit

## Data Available Per Session
- `composite_indexes`: BQI, PEI, FQI, decision, competitive_execution, barrel_pct, chase_pct, whiff_pct, etc.
- `drill_blocks[]`: drill_type, intent, volume, execution_grade, outcome_tags, batter_side
- `session_context`: session_type, module, sport
- Recent sessions (last 5-10) for trend comparison

## New Interface: `CoachingReport`

```text
performanceBreakdown: {
  situationalSplits: { category, metric, value, context }[]
  patterns: string[]
}
rootCauseAnalysis: {
  issue: string
  classification: 'perception' | 'decision' | 'execution' | 'consistency'
  evidence: string
}[]
priorityStack: {
  rank: number
  issue: string
  gameImpact: string
}[]  // max 3
prescriptiveFixes: {
  issue: string
  drill: string
  constraint: string
  cue: string
}[]
gameTransfer: {
  issue: string
  realWorldImpact: string
}[]
adaptiveProgression: {
  improvements: string[]
  emergingWeaknesses: string[]
  primaryLimiter: string
} | null
nextSessionFocus: {
  primaryWeakness: { area: string, repPct: 60 }
  secondaryIssue: { area: string, repPct: 30 }
  strengthMaintenance: { area: string, repPct: 10 }
} | null
```

## Implementation Plan

### 1. Database: `session_insights` table
Store generated reports for instant recall. Columns: `id`, `session_id` (unique FK), `user_id`, `report` (JSONB), `created_at`. RLS: users read/insert own rows.

### 2. Edge Function: `supabase/functions/session-insights/index.ts`
- Receives `session_id`
- Fetches session data + last 10 sessions for trend context
- Builds a coaching-specific system prompt enforcing the 7-section structure
- Uses Lovable AI with structured tool calling to extract the `CoachingReport` schema
- Stores result in `session_insights` table
- Returns the report
- Coaching language standard enforced in prompt (high-impact verbs, no weak phrases)

### 3. New Hook: `src/hooks/useCoachingReport.ts`
- First checks `session_insights` table for cached report
- If missing, calls edge function
- Returns `{ report, isGenerating, fallbackInsights }`
- Fallback = existing deterministic insights (shown instantly)

### 4. Update `src/lib/sessionInsights.ts`
- Export the new `CoachingReport` type
- Keep existing `generateInsights` as-is (fallback)

### 5. Update UI: `PostSessionSummaryV2.tsx`
- Show deterministic insights immediately (existing cards)
- Once AI report loads, replace with 7-section layout:
  - Performance Breakdown (situational splits in a compact table)
  - Root Cause Analysis (classification badges: Perception/Decision/Execution/Consistency)
  - Priority Stack (ranked 1-3 with game impact)
  - Prescriptive Fixes (drill + constraint + cue cards)
  - Game Transfer (impact statements)
  - Adaptive Progression (trend arrows, if past data exists)
  - Next Session Focus (60/30/10 rep allocation bar)

### 6. Update UI: `PracticeSessionDetailDialog.tsx`
- Same 7-section layout when viewing historical sessions
- Loads from `session_insights` table (instant, no regeneration)

### 7. Update memory
- Update `mem://features/practice-intelligence/session-performance-scoring` with new architecture

## Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/migrations/[new].sql` | Create `session_insights` table + RLS |
| `supabase/functions/session-insights/index.ts` | New edge function |
| `src/hooks/useCoachingReport.ts` | New hook |
| `src/lib/sessionInsights.ts` | Add `CoachingReport` type export |
| `src/components/practice/PostSessionSummaryV2.tsx` | 7-section AI-powered layout |
| `src/components/PracticeSessionDetailDialog.tsx` | 7-section layout for history |

## Scope Control
- Deterministic fallback always available (no degradation if AI fails)
- AI generation only triggers on session completion, not on every view
- Cached in DB — no repeated AI calls for the same session
- Coaching language standard enforced (no "focus on", "work on", "try to")

