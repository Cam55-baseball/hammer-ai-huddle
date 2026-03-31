

# Add Team-Pattern Detection & Standalone Alert Edge Function

## Overview
Create a standalone `udl-generate-alerts` edge function that coaches can trigger on-demand. It will run individual player alert checks (performance drops, fatigue spikes) AND detect team-wide patterns where 3+ players share the same constraint.

## Changes

### 1. New Edge Function: `supabase/functions/udl-generate-alerts/index.ts`

Auth: validates JWT, confirms caller is a coach via `scout_follows`.

Logic:
- Fetches all linked players (same pattern as `udl-coach-overview`)
- For each player, queries last 7 days of `udl_daily_plans` and checks:
  - **Performance drop**: any score >15 points below 7-day rolling average → insert `performance_drop` alert
  - **Fatigue spike**: `fatigue_flag` true on 2+ consecutive days → insert `fatigue_spike` alert
  - **Low compliance**: <30% drill completion over 7 days → insert `compliance_low` alert
- After processing all players, runs **team-pattern detection**:
  - Aggregates each player's latest `constraints_detected` array
  - If 3+ players share the same constraint key → insert `team_pattern` alert with player names in metadata
- Deduplicates: skips alerts if an identical (same type + target + today) non-dismissed alert already exists
- Returns `{ alerts_created: number, team_patterns: [...] }`

### 2. Update `supabase/config.toml`
Add `[functions.udl-generate-alerts]` with `verify_jwt = true`.

### 3. Update `src/hooks/useCoachUDL.ts`
Add a `generateAlerts` mutation that calls the new edge function and invalidates the coach overview query afterward.

### 4. Update `src/pages/CoachCommandCenter.tsx`
Add a "Scan for Alerts" button in the header that triggers `generateAlerts`. Show loading state while scanning.

### 5. Remove inline alert logic from `udl-generate-plan`
Remove lines ~490-536 (the inline alert generation block) since alerts are now handled by the standalone function.

---

## Technical Details

**Team-pattern detection pseudo-code:**
```typescript
// Collect latest constraints per player
const constraintCounts: Record<string, string[]> = {};
for (const player of playerData) {
  for (const c of player.latestConstraints) {
    constraintCounts[c.key] ??= [];
    constraintCounts[c.key].push(player.name);
  }
}
// Alert if 3+ players share a constraint
for (const [key, names] of Object.entries(constraintCounts)) {
  if (names.length >= 3) {
    // Insert team_pattern alert (no specific target_user_id, use coach's id)
  }
}
```

**Deduplication query:**
```sql
SELECT id FROM udl_alerts 
WHERE alert_type = $type AND target_user_id = $uid 
AND created_at::date = CURRENT_DATE AND dismissed_by IS NULL
```

## Files

| File | Action |
|------|--------|
| `supabase/functions/udl-generate-alerts/index.ts` | **Create** |
| `supabase/config.toml` | **Modify** — add function config |
| `src/hooks/useCoachUDL.ts` | **Modify** — add `generateAlerts` mutation |
| `src/pages/CoachCommandCenter.tsx` | **Modify** — add scan button |
| `supabase/functions/udl-generate-plan/index.ts` | **Modify** — remove inline alert block (lines 490-536) |

