

# ZERO-TOLERANCE BUILD SPEC — Intelligence Layer

## Current System State (Verified)

**What exists and works:**
- `hie-analyze/index.ts` (1438 lines): 7 micro-analyzers producing `MicroPattern[]`, `buildDrillRotations` switch (21 cases), `mapPatternToDrills` with basic rotation
- `drill_prescriptions` table: has `weakness_metric`, `pre_weakness_value`, `post_weakness_value` columns (added but never populated)
- `weakness_scores` table: exists (5 columns) but never written to
- `drills` catalog table: exists with 29 seeded drills
- `engine_settings` table: exists, consumed by nightly process
- `profiles` table: has `graduation_year`, `experience_level`
- `athlete_mpi_settings`: has `primary_batting_side`, `primary_throwing_hand`, `date_of_birth`
- Practice Hub: reads URL params, shows prescribed drill banner
- Nightly process: writes continuation token but never reads it

**What is confirmed dead/fake:**
- `weakness_scores` — never written
- `drill_prescriptions.weakness_metric` / `pre_weakness_value` / `post_weakness_value` — never populated
- Continuation token — written, never read
- Constraints — stored as TEXT, no enforcement
- No context awareness (game vs practice)
- No temporal/fatigue detection
- No AI prescription engine

---

## PHASE 1 — Replace Template Engine with Scoring + AI Hybrid

### New Edge Function: `supabase/functions/prescription-engine/index.ts`

**Single function** `generatePrescription` called from `hie-analyze` instead of `mapPatternToDrills`.

**Input (exact):**
```typescript
interface PrescriptionInput {
  user_id: string;
  patterns: MicroPattern[];
  weakness_scores: { metric: string; value: number; prev_value: number | null }[];
  recent_prescriptions: {
    drill_name: string; weakness_area: string; effectiveness_score: number | null;
    adherence_count: number; targeted_metric: string | null;
  }[];
  athlete_profile: {
    age: number;           // computed from athlete_mpi_settings.date_of_birth
    level: string;         // from profiles.experience_level
    batting_side: string;  // from athlete_mpi_settings.primary_batting_side
    throwing_hand: string; // from athlete_mpi_settings.primary_throwing_hand
  };
  readiness_score: number;
  available_drills: { id: string; name: string; module: string; skill_target: string; default_constraints: any }[];
}
```

**Output (exact):**
```typescript
interface PrescriptionOutput {
  prescriptions: {
    drill_id: string;
    name: string;
    module: string;
    constraints: { reps: number; velocity_band?: string; duration_sec?: number; intensity_pct?: number };
    rationale: string;
    targeted_metric: string;
  }[];
}
```

**Decision flow (5 steps, exact order):**

1. **Pattern ranking**: Sort patterns by `severity_weight × (1 + game_context_bonus + fatigue_bonus)`. Severity weights: high=3, medium=2, low=1. `game_context_bonus` = 0.5 if pattern has `data_points.context === 'game_gap'`. `fatigue_bonus` = 0.3 if pattern metric is `fatigue_dropoff`.

2. **Candidate pool per pattern**: Filter `available_drills` where `drill.skill_target` matches `pattern.metric` OR `drill.module` matches `pattern.category`. Remove drills where `recent_prescriptions` shows `effectiveness_score < 0` for that drill name. Remove drills with `adherence_count >= 3` in unresolved prescriptions.

3. **Scoring function (deterministic, no AI)**:
```
score = base_relevance(1.0 if skill_target matches metric, 0.6 if module matches category)
      × historical_effectiveness (avg effectiveness from resolved prescriptions for this drill, default 1.0)
      × (1 - fatigue_penalty) where fatigue_penalty = min(0.8, adherence_count / 5)
      × readiness_adjustment (readiness_score >= 70: 1.0, >= 50: 0.85, < 50: 0.7)
```
Select top-scoring drill per pattern. Take top 5 patterns.

4. **AI refinement (Gemini via Lovable AI gateway)**: Call with candidate drills + pattern stats + athlete profile. AI adjusts `constraints` (reps, velocity, intensity) and generates `rationale`. AI MUST select from provided `drill_id` list only. Prompt enforces: "You MUST only use drill_ids from the provided list. Do not invent drills."

5. **Validation layer**: After AI response, verify: (a) every `drill_id` exists in `available_drills`, (b) `reps` between 5-200, (c) `velocity_band` matches known bands, (d) no missing required fields. If any fail → use deterministic Step 3 result with default constraints from `drills.default_constraints`.

**Fallback**: If Gemini call fails entirely (network, 429, 402) → return Step 3 deterministic result with `rationale: "Based on your performance data"` and constraints from `drills.default_constraints`.

### Modify `hie-analyze/index.ts`
- Replace lines 1227-1236 (prescriptive actions generation): Instead of calling `mapPatternToDrills`, invoke `prescription-engine` edge function via internal HTTP call
- Keep `buildDrillRotations` + `mapPatternToDrills` as the **fallback** if prescription-engine fails
- Pass the full `PrescriptionInput` assembled from data already fetched

---

## PHASE 2 — Skill-Specific Effectiveness Engine

### Write to `weakness_scores` (in `hie-analyze/index.ts`)
After line 1178 (pattern sorting), insert:
```typescript
const weaknessScoreRows = allPatterns.map(p => ({
  user_id, weakness_metric: p.metric, score: p.value, computed_at: new Date().toISOString()
}));
if (weaknessScoreRows.length > 0) {
  await supabase.from('weakness_scores').insert(weaknessScoreRows);
}
```

### Populate `targeted_metric` on `drill_prescriptions`
When inserting new prescriptions (line 1381), add:
```typescript
targeted_metric: drill.targeted_metric,  // from prescription-engine output
pre_weakness_value: weaknessScoreRows.find(w => w.weakness_metric === drill.targeted_metric)?.score ?? null
```

### Fix effectiveness calculation (line 1360-1366)
Replace MPI-based effectiveness with weakness-specific:
```typescript
// Fetch current weakness score for this prescription's targeted_metric
const { data: currentWS } = await supabase.from('weakness_scores')
  .select('score').eq('user_id', user_id).eq('weakness_metric', ex.weakness_metric || ex.targeted_metric)
  .order('computed_at', { ascending: false }).limit(1).maybeSingle();

const currentValue = currentWS?.score ?? null;
const preValue = ex.pre_weakness_value ?? ex.pre_score;
const effectivenessScore = (currentValue != null && preValue != null) ? preValue - currentValue : null;
// Note: preValue - currentValue because LOWER weakness value = improvement
```

### Multi-drill attribution
When multiple drills target different metrics, each gets its own `targeted_metric` → each effectiveness is computed independently against its own metric. No cross-contamination.

When multiple drills target the SAME metric: all get the same effectiveness score (honest limitation — stated in output). Future: add `attribution_confidence` column.

---

## PHASE 3 — Context Engine (Game vs Practice)

### Modify `hie-analyze/index.ts` lines 1156-1161
When flattening reps, attach session_type:
```typescript
(sessions ?? []).forEach((s: any) => {
  const sessionType = s.session_type || 'personal_practice';
  if (Array.isArray(s.micro_layer_data)) {
    s.micro_layer_data.forEach((rep: any) => {
      allMicroReps.push({ ...rep, _session_type: sessionType });
    });
  }
  if (Array.isArray(s.drill_blocks)) allDrillBlocks.push(...s.drill_blocks);
});
```

### New function: `detectGamePracticeGap`
After all micro-analyzers run, add:
```typescript
function detectGamePracticeGap(allReps: any[], existingPatterns: MicroPattern[]): MicroPattern[] {
  const gameReps = allReps.filter(r => ['game','live_scrimmage'].includes(r._session_type));
  const practiceReps = allReps.filter(r => !['game','live_scrimmage'].includes(r._session_type));
  if (gameReps.length < 5 || practiceReps.length < 5) return [];
  
  // Compare weak contact % in game vs practice
  const gameWeak = gameReps.filter(r => ['weak_contact','miss','foul'].includes(r.contact_quality)).length / gameReps.length * 100;
  const practiceWeak = practiceReps.filter(r => ['weak_contact','miss','foul'].includes(r.contact_quality)).length / practiceReps.length * 100;
  
  if (gameWeak - practiceWeak > 20) {
    return [{
      category: 'hitting', metric: 'practice_game_gap', value: Math.round(gameWeak - practiceWeak),
      threshold: 20, severity: (gameWeak - practiceWeak) > 35 ? 'high' : 'medium',
      description: `Game performance ${Math.round(gameWeak - practiceWeak)}% worse than practice — transfer gap detected`,
      data_points: { game_weak_pct: gameWeak, practice_weak_pct: practiceWeak, context: 'game_gap' }
    }];
  }
  return [];
}
```

Add `practice_game_gap` case to `buildDrillRotations` with pressure simulation drills.

### Pattern weighting
In pattern sorting (line 1175), replace simple severity sort with:
```typescript
const sevWeight = { high: 3, medium: 2, low: 1 };
const gameBonus = p.data_points?.context === 'game_gap' ? 0.5 : 0;
return (sevWeight[a.severity] * (1 + gameBonus_a)) vs (sevWeight[b.severity] * (1 + gameBonus_b));
```

---

## PHASE 4 — Temporal/Fatigue Intelligence

### New function in `hie-analyze/index.ts`: `detectFatigueDropoff`
```typescript
function detectFatigueDropoff(sessions: any[]): MicroPattern[] {
  let fatigueSessionCount = 0;
  for (const s of sessions) {
    const reps = Array.isArray(s.micro_layer_data) ? s.micro_layer_data : [];
    if (reps.length < 15) continue;
    const third = Math.floor(reps.length / 3);
    const earlyReps = reps.slice(0, third);
    const lateReps = reps.slice(-third);
    const earlyWeak = earlyReps.filter(r => ['weak_contact','miss','foul'].includes(r.contact_quality)).length / earlyReps.length * 100;
    const lateWeak = lateReps.filter(r => ['weak_contact','miss','foul'].includes(r.contact_quality)).length / lateReps.length * 100;
    if (lateWeak - earlyWeak > 20) fatigueSessionCount++;
  }
  if (fatigueSessionCount >= 3) {
    return [{
      category: 'hitting', metric: 'fatigue_dropoff', value: fatigueSessionCount,
      threshold: 3, severity: fatigueSessionCount >= 5 ? 'high' : 'medium',
      description: `Performance drops in final third of ${fatigueSessionCount} recent sessions — fatigue pattern detected`,
      data_points: { sessions_with_dropoff: fatigueSessionCount, context: 'fatigue' }
    }];
  }
  return [];
}
```

Call after line 1170, merge into `allPatterns`. Add `fatigue_dropoff` case to `buildDrillRotations` with volume reduction drills.

---

## PHASE 5 — Constraint Enforcement

### Migration: Convert `drill_prescriptions.constraints` to JSONB
```sql
ALTER TABLE public.drill_prescriptions 
  ADD COLUMN constraints_json JSONB DEFAULT '{}';
-- Backfill: leave constraints_json empty for existing rows (text constraints remain for display)
```

### Prescription engine writes structured constraints
The new `prescription-engine` output writes to `constraints_json`:
```json
{ "reps": 25, "velocity_band": "80-85", "intensity_pct": 90 }
```

### Practice Hub enforcement (`src/pages/PracticeHub.tsx`)
In session submission logic, after building drill blocks:
1. If `prescribedConstraints` URL param exists, parse as JSON
2. Compare `totalReps` vs `constraints_json.reps` and `selectedVelocity` vs `constraints_json.velocity_band`
3. If mismatch > 50%: show warning toast, do NOT count toward adherence
4. If mismatch 20-50%: show info toast, mark `partial_adherence` in drill_prescriptions

### Impact
In `hie-analyze` effectiveness update (line 1360): only increment `adherence_count` if the most recent session for this user matches the prescribed constraints within 20% tolerance. Check by querying `performance_sessions` where `micro_layer_data` rep count and velocity bands match.

---

## PHASE 6 — Nightly Scaling Fix

### Modify `nightly-mpi-process/index.ts` lines 232-251
Before the batch loop, read continuation token:
```typescript
const { data: continuationLog } = await supabase.from('audit_log')
  .select('metadata').eq('action', 'nightly_mpi_continuation')
  .gte('created_at', oneDayAgo).order('created_at', { ascending: false }).limit(1);

let resumeFrom = 0;
if (continuationLog?.[0]?.metadata?.resume_from) {
  resumeFrom = continuationLog[0].metadata.resume_from;
  console.log(`[nightly-mpi] Resuming from athlete index ${resumeFrom}`);
}

// Start loop from resumeFrom instead of 0
for (let batchStart = resumeFrom; batchStart < athletes.length; batchStart += BATCH_SIZE) {
```

On timeout (line 244-249), store the NEXT unprocessed index:
```typescript
metadata: { sport, resume_from: batchStart + BATCH_SIZE, total_athletes: athletes.length }
```

### Scaling math (updated)
- 200 athletes per 50s invocation
- Daily cron at 3am UTC
- Run 1: processes 0-199, stores continuation at 200
- Run 2 (next day): processes 200-399
- 1,000 athletes: 5 days for full cycle
- For faster processing: add second cron at 15:00 UTC → 2 runs/day → 400/day

**Limitation acknowledged:** With single daily cron, 10,000 athletes takes 50 days. This is a known constraint of the edge function timeout model. Solution path: move to a queue-based worker (out of scope for this pass).

---

## FULL FILE TREE

```text
NEW FILES:
  supabase/functions/prescription-engine/index.ts   — AI+scoring hybrid engine

MODIFIED FILES:
  supabase/functions/hie-analyze/index.ts           — write weakness_scores, context/fatigue detection,
                                                      call prescription-engine, fix effectiveness calc
  supabase/functions/nightly-mpi-process/index.ts   — read continuation token, resume from stored index
  src/pages/PracticeHub.tsx                         — constraint enforcement on session submit

MIGRATION:
  Add constraints_json JSONB column to drill_prescriptions
  Add practice_game_gap + fatigue_dropoff cases to buildDrillRotations (fallback)
```

## EXACT IMPLEMENTATION ORDER

1. **Migration**: Add `constraints_json` JSONB column to `drill_prescriptions`
2. **prescription-engine**: Create new edge function with scoring + AI + validation
3. **hie-analyze — weakness_scores**: Write pattern values after analysis
4. **hie-analyze — context engine**: Attach `_session_type` to reps, add `detectGamePracticeGap`
5. **hie-analyze — fatigue engine**: Add `detectFatigueDropoff`, merge into allPatterns
6. **hie-analyze — effectiveness fix**: Replace MPI delta with weakness-specific delta
7. **hie-analyze — prescription-engine call**: Replace `mapPatternToDrills` with prescription-engine invocation, keep switch as fallback
8. **hie-analyze — buildDrillRotations**: Add `practice_game_gap` and `fatigue_dropoff` cases (for fallback path)
9. **nightly-mpi-process**: Read continuation token, resume from stored index
10. **PracticeHub**: Add constraint enforcement on session submit

## POST-IMPLEMENTATION TEST CHECKLIST

- [ ] Two athletes with same `inside_weakness` but different histories → different drill selections (verify drill_id differs)
- [ ] `weakness_scores` table has rows after HIE runs (query to verify)
- [ ] `drill_prescriptions.targeted_metric` is populated (not null) on new prescriptions
- [ ] Effectiveness uses weakness-specific value (compare pre_weakness_value vs current weakness_scores row)
- [ ] Game-heavy athlete with practice-game gap > 20% → `practice_game_gap` pattern appears in snapshot
- [ ] Athlete with 3+ sessions showing late-third dropoff → `fatigue_dropoff` pattern in snapshot
- [ ] Prescription-engine returns valid drill_ids from catalog (no invented drills)
- [ ] If Gemini fails → fallback returns switch-statement drills (no error to user)
- [ ] Nightly run 1 stops at timeout → run 2 resumes from stored index (verify audit_log entries)
- [ ] Practice Hub: log session with 50%+ mismatch from prescribed constraints → adherence not incremented

## WHAT CAN STILL BREAK AFTER THIS BUILD

1. **Handedness blindness**: Inside/outside bucketing still uses grid midpoint without batter side. Fix requires passing `athlete_mpi_settings.primary_batting_side` into `analyzeHittingMicro` and flipping inside/outside for lefties.
2. **Foul = weak**: `foul` still classified as weak contact. Protective fouls penalize disciplined hitters.
3. **Readiness default 70**: Athletes without Vault data still get readiness 70 → high intensity recommendations.
4. **New user "stalled"**: Users with < 2 MPI scores labeled "stalled" regardless of actual trajectory.
5. **Transfer Score misnomer**: Still measures timing consistency, not practice-to-game transfer.
6. **AI rate limits**: If many athletes trigger HIE simultaneously, Gemini 429 errors cause fallback-only prescriptions for a period.
7. **Single-sport nightly HIE triggers**: Post-nightly HIE calls hardcode `sport: 'baseball'` — softball athletes skipped.

