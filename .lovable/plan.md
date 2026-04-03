

# Hammers Intelligence Engine (HIE) — Full System Build

## Overview

This rebuilds three major surfaces — the **Player Dashboard**, **Coach Intelligence Hub**, and a new **HIE backend engine** — into a unified "Diagnose → Prescribe → Guide → Adapt → Verify" system. The existing MPI engine, Vault check-ins, Speed Lab, Royal Timing, Tex Vision, and session data all feed into a new intelligence layer that computes actionable outputs rather than just scores.

## Architecture

```text
┌─────────────────────────────────────────────────┐
│              EXISTING DATA SOURCES              │
│  MPI Scores │ Sessions │ Vault │ Speed Lab      │
│  Royal Timing │ Tex Vision │ CNS │ Coach Grades │
└──────────────────────┬──────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────┐
│     NEW: hie-analyze (Edge Function)            │
│  ─ Root Cause Analysis                          │
│  ─ Weakness Clusters (Top 3)                    │
│  ─ Prescriptive Drill Actions                   │
│  ─ Development Status (Stalled/Improving/etc)   │
│  ─ Primary Limiter (plain English)              │
│  ─ Readiness Recommendation                     │
│  ─ Risk Alerts                                  │
│  ─ Development Confidence Score                 │
│  ─ Smart Week Plan (advisory)                   │
└──────────────────────┬──────────────────────────┘
                       ▼
┌────────────────┐  ┌─────────────────────┐
│ Player Snapshot │  │ Coach Intelligence  │
│ Dashboard       │  │ Hub                 │
│ (Rebuilt)       │  │ (Rebuilt)           │
└────────────────┘  └─────────────────────┘
```

## Phase 1: Database Schema

### New table: `hie_snapshots`
Stores the latest HIE analysis per athlete, computed on-demand or nightly.

| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid PK | |
| `user_id` | uuid, NOT NULL | Athlete |
| `sport` | text | baseball/softball |
| `computed_at` | timestamptz | When analysis ran |
| `development_status` | text | stalled, inconsistent, improving, accelerating |
| `primary_limiter` | text | Plain English limiter |
| `weakness_clusters` | jsonb | Top 3 weakness objects |
| `prescriptive_actions` | jsonb | Drill recommendations per weakness |
| `readiness_score` | numeric | 0-100 readiness |
| `readiness_recommendation` | text | "Train full intent" / "Reduce volume" |
| `risk_alerts` | jsonb | Overtraining, decline, stagnation alerts |
| `development_confidence` | numeric | 0-100 how reliable the data is |
| `smart_week_plan` | jsonb | Day-by-day suggested structure |
| `before_after_trends` | jsonb | Weakness resolution tracking |
| `drill_effectiveness` | jsonb | Which drills moved the needle |

RLS: Owner reads own; coaches read linked players via `is_linked_coach`.

### New table: `hie_team_snapshots`
Stores team-level analysis for coaches.

| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid PK | |
| `organization_id` | uuid | Team |
| `computed_at` | timestamptz | |
| `team_mpi_avg` | numeric | |
| `trending_players` | jsonb | Up/down lists |
| `risk_alerts` | jsonb | Team-level risks |
| `team_weakness_patterns` | jsonb | Common issues across roster |
| `suggested_team_drills` | jsonb | |

RLS: Org coaches/owners only via `is_org_coach_or_owner`.

## Phase 2: HIE Backend Engine

### New Edge Function: `hie-analyze`

Accepts `{ user_id, sport }` or `{ organization_id }` for team analysis.

**Player Analysis Logic:**
1. Fetch latest `mpi_scores` (composites, trend, integrity)
2. Fetch recent `performance_sessions` (90 days) with `micro_layer_data`
3. Fetch `vault_focus_quizzes` (readiness, sleep, pain, stress)
4. Fetch `speed_lab` data if exists (explosiveness)
5. Fetch `tex_vision_drill_results` (recognition speed)
6. Fetch `royal_timing_sessions` (timing index)

**Compute:**
- **Development Status**: Based on 7d and 30d trend deltas from MPI
  - Accelerating: 30d delta > +5 AND 7d delta > +2
  - Improving: 30d delta > +2
  - Inconsistent: 30d stddev > 8
  - Stalled: 30d delta within ±1
- **Primary Limiter**: Lowest composite index mapped to plain English via a symptom→cause→fix lookup table
- **Weakness Clusters**: Bottom 3 composites with rep-level data backing (e.g., chase rate %, whiff %, contact quality distribution)
- **Prescriptive Actions**: Map each weakness to 1-3 specific drills from `s2DrillRecommendations` and practice hub modules
- **Readiness**: Aggregate sleep, stress, pain, CNS into 0-100 score with training recommendation
- **Risk Alerts**: Overtraining (consecutive heavy days), decline (3+ sessions dropping), integrity drop, plateau detection
- **Development Confidence**: Based on session count, data recency, coach validation rate
- **Smart Week Plan**: AI-generated via Lovable AI (Gemini) using all context, labeled "Suggested — Not Mandatory"

Upserts result into `hie_snapshots`.

**Team Analysis Logic:**
- Aggregate all org member HIE snapshots
- Find common weakness patterns (e.g., "62% of team struggles with inside pitch timing")
- Generate team drill suggestions
- Surface risk alerts per player

## Phase 3: Player Dashboard Rebuild

### Replace current `ProgressDashboard.tsx` content

**Section 1 — Player Snapshot Card** (replaces MPIScoreCard + RankMovementBadge)
- MPI Score (kept)
- Development Tier (from `getGradeLabel`, renamed)
- 7d + 30d trend arrows
- Development Status badge (color-coded: red/yellow/green/fire)
- Primary Limiter in large text
- "Refresh Analysis" button triggers `hie-analyze`

**Section 2 — "What's Holding You Back"**
- Top 3 weakness clusters from `hie_snapshots`
- Each: Issue, Why (data citation), Impact level badge

**Section 3 — "What To Do Next"**
- Prescriptive actions per weakness
- Each drill links to Practice Hub module
- Constraints shown (speed, reps, intent)
- Labeled: "Recommended Based on Your Data"

**Section 4 — "Today's Readiness"**
- Readiness score with trend
- Sleep, CNS, fatigue summary
- Training recommendation text

**Section 5 — "Smart Week Plan"**
- Day-by-day cards with skill focus + intensity
- Collapsible, labeled "Suggested Plan — Not Mandatory"

**Section 6 — "Proof It's Working"**
- Before/after trend charts per weakness
- Drill effectiveness scores
- Resolution tracking

**Removed:**
- Global Rank (RankMovementBadge) — removed
- Static AI prompts (AIPromptCard) — replaced by prescriptive actions
- Pro Probability — locked behind verified + age guard (kept but gated)

### New Components
| Component | Purpose |
|-----------|---------|
| `PlayerSnapshotCard.tsx` | MPI + status + limiter |
| `WeaknessClusterCard.tsx` | Top 3 weaknesses |
| `PrescriptiveActionsCard.tsx` | Drill recommendations |
| `ReadinessCard.tsx` | Today's readiness |
| `SmartWeekPlan.tsx` | Advisory weekly plan |
| `ProofCard.tsx` | Before/after + effectiveness |

### New Hook: `useHIESnapshot.ts`
- Fetches latest `hie_snapshots` for user
- Provides `refreshAnalysis()` that invokes `hie-analyze`
- 5-minute stale time

## Phase 4: Coach Intelligence Hub Rebuild

### Replace current `CoachDashboard.tsx`

**Section 1 — Team Overview** (first screen)
- Team MPI average
- Trending players (up/down badges)
- Risk alerts summary (overtraining, decline, low integrity counts)

**Section 2 — Actionable Player Cards**
- Each linked player shows: MPI + trend, development status, primary limiter, readiness score
- Click → expands to full player analytics (mirrors player view + coach extras)

**Section 3 — Coach Extras per Player**
- Drill effectiveness for prescribed actions
- Coach vs player grading gaps (delta maturity)
- Linked video evidence
- Session pattern breakdown

**Section 4 — Team Weakness Engine**
- Common weakness patterns across roster
- Auto-suggested team drill blocks
- Practice plan generation

**Section 5 — Comparison Tool**
- Player vs player side-by-side
- Player vs team average
- Player vs position/age benchmarks

**Section 6 — Alert System**
- Player declining 3+ sessions
- CNS fatigue risk
- Integrity drop
- Plateau detection

### New Components
| Component | Purpose |
|-----------|---------|
| `TeamOverviewCard.tsx` | Team MPI + trends + risks |
| `CoachPlayerCard.tsx` | Actionable player summary |
| `CoachPlayerDetail.tsx` | Full analytics + coach extras |
| `TeamWeaknessEngine.tsx` | Common patterns + drill suggestions |
| `PlayerComparisonTool.tsx` | Side-by-side comparison |
| `CoachAlertPanel.tsx` | Risk/decline/plateau alerts |

### New Hook: `useHIETeamSnapshot.ts`
- Fetches `hie_team_snapshots` for coach's org
- Fetches all linked players' `hie_snapshots`

## Phase 5: Elite Additions

### Development Confidence Score
Already computed in HIE — displayed in Player Snapshot Card as a secondary metric.

### Transfer Score (Practice → Game)
Computed by comparing practice session grades to game session grades. Added to `hie_snapshots` as `transfer_score`.

### Decision Speed Index
Aggregated from hitting (chase rate, recognition time), baserunning (reaction time), fielding (exchange time). Added to `hie_snapshots`.

### Movement Efficiency Score
Derived from Speed Lab stride analytics + Royal Timing data. Added to `hie_snapshots`.

## Implementation Order

Due to scope, this will be built across multiple implementation passes:

1. **Pass 1**: Database migration (both tables) + `hie-analyze` edge function (core logic)
2. **Pass 2**: `useHIESnapshot` hook + Player Dashboard rebuild (Sections 1-4)
3. **Pass 3**: Player Dashboard Sections 5-6 + Smart Week Plan AI integration
4. **Pass 4**: Coach Intelligence Hub rebuild (Sections 1-3)
5. **Pass 5**: Coach Hub Sections 4-6 (team weakness engine, comparison, alerts)
6. **Pass 6**: Elite additions (transfer score, decision speed, movement efficiency)

## Files Summary

| File | Action |
|------|--------|
| Migration SQL | Create `hie_snapshots` + `hie_team_snapshots` tables with RLS |
| `supabase/functions/hie-analyze/index.ts` | New edge function — core intelligence engine |
| `src/hooks/useHIESnapshot.ts` | New hook — fetch + refresh player HIE data |
| `src/hooks/useHIETeamSnapshot.ts` | New hook — fetch team HIE data |
| `src/components/hie/PlayerSnapshotCard.tsx` | New — MPI + status + limiter |
| `src/components/hie/WeaknessClusterCard.tsx` | New — top 3 weaknesses |
| `src/components/hie/PrescriptiveActionsCard.tsx` | New — drill recommendations |
| `src/components/hie/ReadinessCard.tsx` | New — readiness + recommendation |
| `src/components/hie/SmartWeekPlan.tsx` | New — advisory weekly plan |
| `src/components/hie/ProofCard.tsx` | New — before/after + effectiveness |
| `src/components/hie/TeamOverviewCard.tsx` | New — team summary |
| `src/components/hie/CoachPlayerCard.tsx` | New — actionable player card |
| `src/components/hie/CoachPlayerDetail.tsx` | New — full player analytics |
| `src/components/hie/TeamWeaknessEngine.tsx` | New — common patterns |
| `src/components/hie/PlayerComparisonTool.tsx` | New — side-by-side |
| `src/components/hie/CoachAlertPanel.tsx` | New — alerts |
| `src/pages/ProgressDashboard.tsx` | Rebuilt — uses HIE components |
| `src/pages/CoachDashboard.tsx` | Rebuilt — uses HIE components |
| `src/components/analytics/RankMovementBadge.tsx` | Removed from dashboard |
| `src/components/analytics/AIPromptCard.tsx` | Removed from dashboard |

