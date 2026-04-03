

# HIE Full System Rebuild — From Facade to Real Intelligence

## Scope Reality Check

This request spans 10 phases with hundreds of individual changes. To deliver real, working code (not stubs), this must be broken into focused implementation passes. Each pass delivers complete, verifiable functionality.

## Pass 1: Replace LIMITER_MAP with Real Micro-Data Analysis Engine

### What changes in `hie-analyze/index.ts`:

**DELETE** the static `LIMITER_MAP` (lines 28-62).

**ADD** real micro-layer analysis that reads `performance_sessions.micro_layer_data` and `performance_sessions.drill_blocks` to detect specific patterns:

1. **Hitting analysis**: Iterate all micro reps. Compute:
   - chase rate (swing_decision === 'incorrect' on pitches outside zone)
   - whiff rate by pitch location zone (row/col grid)
   - contact quality distribution by velocity band
   - contact quality by pitch location (inside vs outside vs up vs down)
   - swing decision accuracy vs pitch type
   - weak contact rate on specific zones

2. **Fielding analysis**: Compute:
   - clean field percentage
   - exchange time distribution
   - throw accuracy by play type
   - footwork grade average

3. **Pitching analysis** (NEW — was missing): Compute:
   - zone percentage
   - command grade by pitch type
   - miss direction patterns
   - spin efficiency trends

4. **Output**: Primary limiter is now a specific plain-English statement generated from the actual data patterns, e.g., "Late on inside fastballs 80+ mph — 72% weak contact in zones (1,0) and (1,1)" instead of generic "Batting Quality Breakdown."

5. **Prescriptive actions**: Map detected patterns to specific drills with constraints that vary based on the athlete's data. A player weak on inside fastballs gets different drills than one struggling with off-speed away.

### Connect Speed Lab + Royal Timing + Tex Vision:

Add fetches for:
- `speed_sessions` → compute explosiveness index from best times and stride analytics
- `royal_timing_sessions` → compute timing consistency index
- `tex_vision_drill_results` → compute recognition speed index

Feed these into `transfer_score`, `decision_speed_index`, and `movement_efficiency_score` columns (already exist in schema).

### Smart Week Plan — AI Generation:

Replace `smart_week_plan: []` with actual Lovable AI call using the athlete's weakness data, readiness, and training history as context. Use `LOVABLE_API_KEY` (already available) to call Gemini for plan generation.

### Before/After Trends — Real Computation:

Replace `before_after_trends: []` with actual trend calculation: for each weakness cluster, compare the metric's value 14 days ago vs now.

### Drill Effectiveness — Real Tracking:

Replace `drill_effectiveness: []` by checking if previously prescribed drill areas showed improvement in subsequent sessions.

---

## Pass 2: Replace DataBuildingGate with Progressive Intelligence

### Replace `DataBuildingGate.tsx`:

**0-10 sessions (Early Stage):**
- Show basic tendencies (best/worst drill types from session data)
- Show "Your strongest area" / "Area to focus on"
- Simple recommendation: "Keep logging — your analysis gets smarter with more data"

**10-50 sessions (Development Mode):**
- Show early weakness detection (simplified clusters)
- Show basic prescriptions
- Show MPI trend if available

**50+ sessions (Full Mode):**
- Full HIE dashboard (current behavior)

The gate becomes a `useDataDensityLevel` hook returning `{ level: 'early' | 'developing' | 'full', sessionCount }`. Dashboard renders appropriate components per level.

---

## Pass 3: Auto-trigger HIE After Every Session + Nightly

### Post-session trigger:
In `calculate-session/index.ts`, after session computation completes, invoke `hie-analyze` for that user via `supabase.functions.invoke('hie-analyze', { body: { user_id } })`.

### Post-nightly trigger:
At end of `nightly-mpi-process/index.ts`, for each processed athlete, invoke `hie-analyze`.

### Stale data detection:
In `useHIESnapshot.ts`, check `snapshot.computed_at`. If older than 24 hours, show a "Stale — refreshing..." indicator and auto-trigger refresh.

---

## Pass 4: Scale Architecture for Nightly Process

### Replace sequential processing in `nightly-mpi-process`:
- Process athletes in batches of 50
- Add per-athlete try/catch so one failure doesn't stop the batch
- Add timing logs per batch
- If total runtime exceeds 50s, stop and log remaining athletes for next run

This is achievable within the edge function model without a queue system (which requires infrastructure Lovable Cloud doesn't expose).

---

## Pass 5: Coach Intelligence Hub Rebuild

### Team practice plan generation:
`TeamWeaknessEngine` calls AI to generate team drill blocks from aggregated weakness data.

### Player comparison tool:
New `PlayerComparisonTool.tsx` component allowing side-by-side comparison of two players' HIE snapshots.

### Coach alert system:
`CoachAlertPanel` reads actual `risk_alerts` from all player snapshots instead of showing static content.

---

## Pass 6: Prescriptive Actions — Launchable Drills

### `PrescriptiveActionsCard.tsx`:
Each drill gets a "Start Drill" button that navigates to the relevant Practice Hub module with pre-filled parameters (drill type, constraints).

---

## Pass 7: Adaptive Learning Loop

### Database migration:
New table `drill_prescriptions`:
- `id`, `user_id`, `prescribed_at`, `weakness_area`, `drill_name`, `module`
- `pre_score` (composite score at prescription time)
- `post_score` (updated after next HIE run)
- `effectiveness_score` (post - pre)
- `adherence_count` (sessions matching this drill type since prescription)

### HIE tracks:
When prescribing drills, record them. On next HIE run, compute effectiveness by comparing pre/post scores for each prescribed area.

---

## Pass 8: Owner Admin Panel

### New page: `/admin/engine-settings`
- Read/write `ENGINE_CONTRACT` values from a new `engine_settings` table
- Owner can adjust MPI weights, thresholds, drill mappings
- Changes logged to `audit_log`
- Gated behind owner role check

---

## Implementation Order (8 passes)

| Pass | Focus | Key Deliverable |
|------|-------|-----------------|
| 1 | Real HIE engine + module integration | Micro-data analysis, Speed/Timing/Vision connected, AI week plan |
| 2 | Progressive intelligence (replace DataBuildingGate) | Value from session 1 |
| 3 | Auto-trigger HIE | No manual refresh needed |
| 4 | Scale nightly process | Batch processing with error isolation |
| 5 | Coach hub rebuild | Team plans, comparisons, real alerts |
| 6 | Launchable drills | One-click drill start from prescriptions |
| 7 | Adaptive learning loop | Track drill effectiveness over time |
| 8 | Owner admin panel | No-code engine tuning |

## Files Summary

| File | Action |
|------|--------|
| `supabase/functions/hie-analyze/index.ts` | Complete rewrite — real micro-data analysis engine |
| `supabase/functions/calculate-session/index.ts` | Add post-session HIE trigger |
| `supabase/functions/nightly-mpi-process/index.ts` | Add batching + post-run HIE triggers |
| `src/components/analytics/DataBuildingGate.tsx` | Replace with progressive 3-tier system |
| `src/hooks/useHIESnapshot.ts` | Add stale detection + auto-refresh |
| `src/components/hie/PrescriptiveActionsCard.tsx` | Add launchable drill buttons |
| `src/components/hie/SmartWeekPlan.tsx` | Display real AI-generated plans |
| `src/components/hie/ProofCard.tsx` | Display real before/after data |
| `src/components/hie/TeamWeaknessEngine.tsx` | Add AI team drill generation |
| `src/components/hie/PlayerComparisonTool.tsx` | New — side-by-side comparison |
| `src/components/hie/CoachAlertPanel.tsx` | Read real risk alerts from snapshots |
| `src/pages/ProgressDashboard.tsx` | Adapt for progressive rendering |
| `src/pages/CoachDashboard.tsx` | Integrate comparison tool |
| Migration SQL | New `drill_prescriptions` table |
| Migration SQL | New `engine_settings` table |
| `src/pages/AdminEngineSettings.tsx` | New — owner admin panel |

