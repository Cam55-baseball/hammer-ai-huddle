

# HIE Final Hardening — Complete Intelligence Loop

## Scope

8 changes that close every verified gap: adaptive loop, module micro-analyzers, fragile string logic, drill catalog table, Practice Hub pre-fill, nightly cron, engine_settings consumption, and failure persistence.

## Pass 1: Close Adaptive Loop (hie-analyze/index.ts)

Before calling `mapPatternToDrills`, fetch `drill_prescriptions` where `user_id = current AND resolved = false AND effectiveness_score IS NOT NULL AND effectiveness_score <= 0`. Build a `Set<string>` of ineffective drill names. Modify `mapPatternToDrills` to accept this set as a second parameter. Inside each case, if the primary drill is in the ineffective set, substitute an alternative drill (each case gets a primary + 2 alternatives in a rotation array). Also track `drill_usage_count` — if a drill has been prescribed 3+ times without improvement, auto-rotate to the next alternative.

## Pass 2: Module Micro-Analyzers (hie-analyze/index.ts)

Add 4 new functions returning `MicroPattern[]`:

**`analyzeSpeedLabMicro(speedSessions)`**: If `steps_per_rep` trending upward over last 7 sessions → "Decreasing stride efficiency". If RPE high but output (distances) declining → "High effort, low output". Prescriptions: sprint mechanics, resisted starts.

**`analyzeTimingMicro(timingSessions)`**: Extract all times from `timer_data`, compute CV. If CV > 0.15 → "Timing inconsistency during stride phase". Prescriptions: load/stride sync drills, rhythm blocks.

**`analyzeVisionMicro(visionDrills)`**: Group by `drill_type`. If accuracy < 70% on any type → "Recognition delay vs [type]". If avg reaction_time > 400ms → "Slow reaction time". Prescriptions: pitch-type specific drills, reaction compression.

**`analyzeBaserunningMicro(microReps, drillBlocks)`**: Filter reps where `drill_type` is baserunning-related. Analyze `jump_grade`, `read_grade`, `time_to_base_band`. If jump_grade avg < 40 → "Delayed jump timing". Prescriptions: first-step reaction drills, read-based drills.

Merge all into `allPatterns`:
```
const allPatterns = [...hittingPatterns, ...fieldingPatterns, ...pitchingPatterns,
  ...speedPatterns, ...timingPatterns, ...visionPatterns, ...baserunningPatterns]
```

## Pass 3: Fix Fragile String Logic (hie-analyze/index.ts)

In `mapPatternToDrills`, the `velocity_weakness` case currently uses `pattern.description.includes('80+')`. Replace with reading `pattern.data_points.velocity_band` (already stored in data_points during pattern creation). Update the velocity pattern creation in `analyzeHittingMicro` to include `velocity_band` in its data_points. The drill constraint then reads: `Set machine to ${pattern.data_points.velocity_band} mph`.

## Pass 4: Drill Catalog Table + Practice Hub Pre-fill

### Migration: `drills` table
```sql
CREATE TABLE public.drills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  module TEXT NOT NULL,
  skill_target TEXT,
  default_constraints JSONB DEFAULT '{}',
  video_url TEXT,
  difficulty_levels TEXT[] DEFAULT '{"beginner","intermediate","advanced"}',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.drills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read drills" ON public.drills FOR SELECT USING (true);
```

Seed ~20 drills matching all drill names in `mapPatternToDrills`. Update `mapPatternToDrills` to include `drill_id` in output (matched by name from a pre-fetched drill catalog). Add `drill_id` field to `PrescriptiveDrill` interface.

### Practice Hub pre-fill (`src/pages/PracticeHub.tsx`)
On mount, read `searchParams.get('drill_type')`, `searchParams.get('constraints')`, `searchParams.get('module')`. If present:
- Auto-set `activeModule` to the module value
- Show a banner: "Starting Prescribed Drill: [drill_type]"
- Skip to `configure_session` step with pre-filled values

## Pass 5: Nightly Cron Job

Use the insert tool to create a `cron.schedule` entry:
```sql
SELECT cron.schedule('nightly-mpi-3am', '0 3 * * *', $$
  SELECT net.http_post(
    url:='https://wysikbsjalfvjwqzkihj.supabase.co/functions/v1/nightly-mpi-process',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer <anon_key>"}'::jsonb,
    body:='{"time":"now"}'::jsonb
  ) as request_id;
$$);
```

Also enable `pg_cron` and `pg_net` extensions via migration if not already enabled.

## Pass 6: Engine Settings Consumption

### `nightly-mpi-process/index.ts`
At start (after creating supabase client), fetch all rows from `engine_settings`. Build a settings map. Replace hardcoded values:
- `composites.bqi * 0.25` → `composites.bqi * settings.mpi_weight_bqi`
- Same for fqi (0.15), pei (0.20), decision (0.20), competitive (0.20)
- `integrityScore >= 80` → `integrityScore >= settings.integrity_threshold`
- `count >= 60` → `count >= settings.data_gate_min_sessions`

### `hie-analyze/index.ts`
Fetch `engine_settings` at start. Use `data_gate_min_sessions` for DataBuildingGate threshold passed in snapshot metadata.

## Pass 7: Failure Persistence

### `nightly-mpi-process/index.ts`
The `failedUsers` array is already logged to `audit_log` (line 463-468). But per-athlete errors lose detail. Enhance the catch block (line 454) to push `{ user_id, error: athleteError.message }` objects instead of just user_id strings. Write the full error details to audit_log.

Also add: on next nightly run, query `audit_log` for `action = 'nightly_mpi_failures'` from last 24h. Extract `failed_users` and process those first before the main batch.

### `hie-analyze/index.ts`
Wrap the main handler in error logging that writes to `audit_log` on failure:
```
await supabase.from('audit_log').insert({
  user_id, action: 'hie_analyze_failure', table_name: 'hie_snapshots',
  metadata: { error: err.message, sport }
});
```

## Pass 8: Nightly Scale — Continuation Token

The 50s timeout currently stops processing and logs remaining count. Add a `continuation_token` mechanism: when timeout is hit, write the `batchStart` index to `audit_log` with action `nightly_mpi_continuation`. On next invocation, check for a continuation token and resume from that index. This allows the cron job (running every day) to finish processing across multiple invocations if needed.

## Files Summary

| File | Change |
|------|--------|
| `supabase/functions/hie-analyze/index.ts` | Add 4 module analyzers, close adaptive loop, fix fragile string logic, add drill_id, consume engine_settings, log failures |
| `supabase/functions/nightly-mpi-process/index.ts` | Consume engine_settings, enhance failure logging, add retry-first logic, continuation token |
| `src/pages/PracticeHub.tsx` | Parse URL params for drill pre-fill, show prescribed drill banner |
| Migration SQL | Create `drills` table + seed data, enable pg_cron + pg_net |
| Insert SQL (cron) | Schedule nightly-mpi-process at 3am UTC |

