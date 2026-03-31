

# UDL Phase 3 + Phase 4 Implementation Plan

## Phase 3 Scope
1. **Feedback Loop Engine** — auto-adjust drill difficulty based on completion patterns
2. **Coach Command Center** — new `/coach-command` route with player UDL cards
3. **Alert System** — detect performance drops and team patterns

## Phase 4 Scope
4. **Cross-Module Intelligence** — CNS, sleep, explosiveness auto-adjust UDL drills
5. **Video Linking** — connect constraints to session video clips
6. **Owner Control Panel UI** — `/owner/udl-control` route for editing constraints/prescriptions

---

## Database Changes (1 migration)

### New table: `udl_alerts`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| target_user_id | uuid | Player the alert is about |
| alert_type | text | `performance_drop`, `fatigue_spike`, `team_pattern`, `compliance_low` |
| severity | text | `high`, `medium`, `low` |
| message | text | Human-readable alert text |
| metadata | jsonb | Context data (scores, player list, etc.) |
| dismissed_by | uuid nullable | Coach/owner who dismissed |
| created_at | timestamptz | |

### Alter `udl_daily_plans`: add `feedback_applied` jsonb column
Stores feedback loop adjustments (e.g., `{ difficulty_delta: +1, reason: "3-day completion streak" }`).

### Alter `udl_drill_completions`: add `difficulty_level` int column
Tracks what difficulty the drill was at when completed, for feedback loop comparison.

RLS: Alerts readable by owner + coaches (via `scout_follows` linked players). Players see their own alerts.

---

## Phase 3 Implementation

### 3A. Feedback Loop (`supabase/functions/udl-generate-plan/index.ts` — enhance existing)

Add logic after normalization, before prescription:
- Query last 7 days of `udl_drill_completions` for the player
- If player completed ≥80% of prescribed drills for 3+ consecutive days → increase `difficulty_level` by 1
- If player completed <30% for 3+ days → decrease difficulty or swap to easier drills
- Store adjustments in `feedback_applied` on the daily plan
- Select drills matching adjusted difficulty from `PRESCRIPTIONS`

### 3B. Coach Command Center

**New file: `src/pages/CoachCommandCenter.tsx`**

Route: `/coach-command` (coach-only access, same pattern as CoachDashboard)

UI structure:
- Header: "Player Intelligence Command Center"
- Fetches all linked players (from `scout_follows` where status='accepted')
- For each player, queries their latest `udl_daily_plans` entry
- Renders player cards sorted by priority: red flags first, declining trends, low compliance

**Player card shows:**
- Name + avatar
- Status light (red/yellow/green based on constraints severity)
- Primary constraint label
- Suggested action (from prescribed drills)
- Drill compliance % (completions / prescribed last 7 days)
- Trend arrow (improving/declining based on constraint score delta)

**Coach actions per player:**
- "View Details" → expands to show full constraint breakdown + drill list
- "Override Drill" → opens dialog to select alternative drill from prescriptions
- "Send Message" → navigates to existing activity send flow

**New hook: `src/hooks/useCoachUDL.ts`**
- Fetches linked player IDs
- Batch-queries `udl_daily_plans` and `udl_drill_completions` for all linked players
- Computes compliance %, trend deltas, status lights

### 3C. Alert System

**New edge function: `supabase/functions/udl-generate-alerts/index.ts`**

Called by the `udl-generate-plan` function after plan generation (or as a separate invocation):
- Compares today's `player_state` scores against 7-day rolling average
- If any score dropped >15 points → `performance_drop` alert
- If `fatigue_flag` true for 2+ consecutive days → `fatigue_spike` alert
- After processing all players (coach-triggered), detects team patterns (e.g., 3+ players with same constraint)

**New component: `src/components/udl/UDLAlertsBanner.tsx`**
- Shown on Coach Command Center
- Lists active (non-dismissed) alerts sorted by severity
- Dismiss button per alert

---

## Phase 4 Implementation

### 4A. Cross-Module Intelligence (enhance `udl-generate-plan`)

Add cross-module adjustment logic in the edge function:
- If CNS readiness < 40 → reduce drill intensity, swap high-intensity drills
- If sleep_quality ≤ 2 → skip explosive drills, add recovery
- If explosiveness_score rising (>10 point increase over 7 days) → increase load
- If stress_level ≥ 4 (from vault) → reduce volume by 20%

Store cross-module adjustments in `readiness_adjustments` with detailed notes.

### 4B. Video Linking

**Alter `udl_daily_plans`**: add `linked_sessions` jsonb column (array of `{ session_id, constraint_key }`)

In `udl-generate-plan`, when querying sessions for normalization, also capture `session_id` for sessions that contributed to each constraint. Store these mappings.

**UI change in `DailyPlanCard.tsx`**: 
- Add "View Related Sessions" link per drill/constraint
- Clicking navigates to session detail (existing `SessionDetailView`) filtered by relevant sessions

### 4C. Owner Control Panel

**New file: `src/pages/OwnerUDLControl.tsx`**

Route: `/owner/udl-control` (owner-only access)

Sections:
1. **Constraints Editor** — table listing all `DEFAULT_CONSTRAINTS` merged with `udl_constraint_overrides`. Owner can toggle enabled, edit thresholds, adjust severity weights. Saves to `udl_constraint_overrides` table.
2. **Prescriptions Editor** — for each constraint, shows mapped drills. Owner can edit drill details, add new drills, remove drills. Saves to `prescription_overrides` jsonb.
3. **Audit Log** — read-only view of recent UDL decisions (queries `udl_daily_plans` with player names, shows what was diagnosed and prescribed).
4. **System Stats** — total plans generated, avg compliance %, most common constraints across all players.

**New table: `udl_audit_log`**
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| action | text | `plan_generated`, `override_created`, `alert_triggered` |
| user_id | uuid | Player or actor |
| metadata | jsonb | Input/output snapshot |
| created_at | timestamptz | |

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/pages/CoachCommandCenter.tsx` | **Create** — coach player intelligence view |
| `src/hooks/useCoachUDL.ts` | **Create** — batch player UDL data for coaches |
| `src/components/udl/UDLAlertsBanner.tsx` | **Create** — alert display for coaches |
| `src/components/udl/PlayerUDLCard.tsx` | **Create** — individual player card for command center |
| `src/pages/OwnerUDLControl.tsx` | **Create** — owner constraint/prescription editor |
| `src/components/udl/ConstraintEditor.tsx` | **Create** — editable constraint table |
| `src/components/udl/PrescriptionEditor.tsx` | **Create** — editable drill mappings |
| `supabase/functions/udl-generate-alerts/index.ts` | **Create** — alert generation logic |
| `supabase/functions/udl-generate-plan/index.ts` | **Modify** — add feedback loop + cross-module + video linking |
| `src/components/udl/DailyPlanCard.tsx` | **Modify** — add video/session links per constraint |
| `src/hooks/useUDLPlan.ts` | **Modify** — expose linked session data |
| `src/App.tsx` | **Modify** — add `/coach-command` and `/owner/udl-control` routes |
| `src/components/AppSidebar.tsx` | **Modify** — add Coach Command Center + Owner UDL Control nav items |
| Migration SQL | **Create** — `udl_alerts`, `udl_audit_log` tables + alter existing UDL tables |

---

## Technical Notes

- Coach Command Center queries use `service_role` via edge function to batch-read player plans (coaches cannot read other users' `udl_daily_plans` directly via RLS). A new edge function `udl-coach-overview` will handle this.
- Feedback loop difficulty adjustments are capped at ±2 from the prescription default to prevent runaway escalation.
- All cross-module adjustments are additive to existing readiness logic, not replacements.
- Owner Control Panel uses direct Supabase client calls to `udl_constraint_overrides` (owner RLS policy already permits this).

