

# UDL Phase 1+2: Diagnosis Engine + Prescription Engine + Player Daily Plan

## What We're Building

A new intelligence layer that **reads** existing data (sessions, MPI, Vault check-ins, Speed Lab, Tex Vision), **diagnoses** the player's top 3 constraints, **prescribes** targeted drills, and **surfaces** a daily plan card on the player dashboard. All outputs are advisory ("Recommended Based on Your Data"). Owner can override via a config table.

```text
┌──────────────────────────────────────────────────┐
│  Data Sources (READ ONLY)                        │
│  performance_sessions · mpi_scores               │
│  vault_focus_quizzes · speed_lab_sessions         │
│  tex_vision_metrics · royal_timing_sessions       │
└───────────────┬──────────────────────────────────┘
                ▼
┌──────────────────────────────────────────────────┐
│  UDL Engine (Edge Function)                      │
│  1. Normalize → udl_player_state                 │
│  2. Diagnose → top 3 constraints                 │
│  3. Prescribe → drill recommendations            │
│  4. Apply readiness adjustments                  │
│  5. Return daily_plan (max 3 items)              │
└───────────────┬──────────────────────────────────┘
                ▼
┌──────────────────────────────────────────────────┐
│  UI: Player Daily Plan Card                      │
│  "Recommended Based on Your Data"                │
│  3 drill cards · Start / Complete · Progress bar  │
└──────────────────────────────────────────────────┘
```

---

## Database Changes (3 new tables, 1 migration)

### `udl_constraint_overrides`
Owner-editable config overrides (hybrid approach — code defaults + DB overrides).

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| constraint_key | text unique | e.g. `late_timing_vs_velocity` |
| threshold_overrides | jsonb | Owner-set thresholds |
| enabled | boolean default true | Toggle rules on/off |
| prescription_overrides | jsonb | Custom drill mappings |
| created_by | uuid FK auth.users | Must be owner |
| updated_at | timestamptz | |

### `udl_daily_plans`
Stores generated plans per player per day.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid FK auth.users | |
| plan_date | date | |
| constraints_detected | jsonb | Array of {key, label, severity} |
| prescribed_drills | jsonb | Array of drill objects |
| readiness_adjustments | jsonb | Volume/intensity modifications |
| generated_at | timestamptz | |
| unique(user_id, plan_date) | | One plan per day |

### `udl_drill_completions`
Tracks drill completion for feedback loop.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid FK auth.users | |
| plan_id | uuid FK udl_daily_plans | |
| drill_key | text | |
| started_at | timestamptz | |
| completed_at | timestamptz nullable | |
| result_notes | text nullable | |

RLS: All three tables — users can read/write their own rows. Owner can read all + write overrides.

---

## Edge Function: `udl-generate-plan`

Single endpoint that:
1. **Queries** the player's recent data (last 14 days of sessions, latest MPI, today's Vault check-in, latest Speed Lab, latest Tex Vision)
2. **Normalizes** into a `PlayerState` object with scores 0-100:
   - `timing_score` — from Royal Timing early/late bias + session timing flags
   - `decision_score` — from MPI decision composite + chase_pct from sessions
   - `execution_score` — from session execution grades + contact quality
   - `reaction_score` — from Vault CNS reaction_time_ms + Tex Vision neuro_reaction_index
   - `explosiveness_score` — from Speed Lab sprint times
   - `readiness_score` — from Vault physical_readiness, sleep_quality, perceived_recovery
   - `fatigue_flag` — boolean from fatigue proxy calculation
3. **Diagnoses** by comparing each score against thresholds (code defaults, overridden by `udl_constraint_overrides` if present). Returns top 3 lowest-scoring areas as constraints.
4. **Prescribes** drills by mapping each constraint to drill templates (code defaults in `src/data/udlDefaults.ts`, overridden by `prescription_overrides` in DB).
5. **Adjusts** for readiness — if fatigue_flag or low readiness, reduces volume and removes high-intensity drills.
6. **Saves** to `udl_daily_plans` and returns the plan.

---

## Code-Based Defaults

### `src/data/udlDefaults.ts`
Contains:
- **Constraint definitions** with default thresholds (e.g., `late_timing: { threshold: 45, bias_threshold: 0.6 }`)
- **Prescription mappings** — each constraint maps to 2-3 drill templates with name, setup, execution cues, reps, and goal metric
- **Readiness adjustment rules** — fatigue = -30% volume, low sleep = skip explosive drills

---

## Player UI

### `src/components/udl/DailyPlanCard.tsx`
Rendered on the player Dashboard (or Progress Dashboard). Shows:
- Header: "Recommended Based on Your Data" with date
- Up to 3 drill cards, each with:
  - Drill name + setup instructions
  - Constraint it addresses (subtle label)
  - Start / Complete buttons
  - Progress indicator
- Readiness note if adjustments were made (e.g., "Volume reduced due to low recovery")
- Expandable "Why these drills?" section showing the diagnosed constraints
- Simplified mode by default; "Show Details" expands constraint reasoning

### `src/hooks/useUDLPlan.ts`
- Calls the edge function on mount (once per day, cached)
- Manages drill start/complete mutations to `udl_drill_completions`
- Exposes `plan`, `startDrill()`, `completeDrill()`, `isLoading`

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/data/udlDefaults.ts` | **Create** — constraint thresholds + prescription mappings |
| `supabase/functions/udl-generate-plan/index.ts` | **Create** — edge function with normalization, diagnosis, prescription |
| `src/hooks/useUDLPlan.ts` | **Create** — fetch plan, manage completions |
| `src/components/udl/DailyPlanCard.tsx` | **Create** — player-facing UI card |
| `src/pages/Dashboard.tsx` | **Modify** — add DailyPlanCard to player dashboard |
| `src/pages/ProgressDashboard.tsx` | **Modify** — add DailyPlanCard below AI Prompt section |
| Migration SQL | **Create** — 3 tables + RLS policies |

---

## Language Rules (Enforced)

Every UDL output prefixed with: **"Recommended Based on Your Data"**

No "you must", "required", "mandatory" — only "we recommend", "consider", "suggested".

---

## What This Does NOT Do (Deferred to Later Phases)

- Coach Command Center (Phase 3)
- Feedback loop auto-difficulty adjustment (Phase 3)
- Alert system for team patterns (Phase 3)
- Cross-module intelligence auto-adjustments (Phase 4)
- Video linking to constraints (Phase 4)
- Owner control panel UI (Phase 4 — owner uses DB overrides for now)

