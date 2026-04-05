

# Proof-Level Verification — 3 Critical Systems

## 1. EFFECTIVENESS ENGINE

### WHERE weakness_scores IS WRITTEN (hie-analyze)
- **Lines 1461-1473**: After sorting `allPatterns`, each pattern is mapped to a row `{user_id, weakness_metric: p.metric, score: p.value, computed_at}`. Previous rows for the athlete are DELETEd (line 1467-1470), then fresh rows INSERTed (line 1472).

### WHERE weakness_scores IS READ FOR EFFECTIVENESS
- **Lines 1744-1780**: The effectiveness loop iterates `existingPrescriptions` (unresolved `drill_prescriptions`). For each prescription:
  - Line 1748: Reads `targeted_metric` (or falls back to `weakness_metric`)
  - Line 1759: Looks up `currentWS = weaknessScoreRows.find(w => w.weakness_metric === exMetric)`
  - Line 1761: `postWeaknessValue = currentWS.score`
  - Line 1762-1764: **Effectiveness calculation**:
    ```
    effectiveness_score = pre_weakness_value - currentWS.score
    ```
    (positive = improvement, i.e., the weakness value decreased)
  - **Line 1769**: MPI fallback — ONLY if `effectivenessScore == null` (no weakness-specific match):
    ```
    effectiveness_score = mpiScore - ex.pre_score
    ```

### TRACE (athlete 95de827d)
```
Pattern: tool_gap_run_physical
  → Written to weakness_scores: metric=tool_gap_run_physical, score=17
  → Prescription: "Sprint Mechanics Lab", targeted_metric=tool_gap_run_physical
  → pre_weakness_value = 17 (set at prescription creation)
  → Next HIE run: currentWS found (metric match), postWeaknessValue = new score
  → effectiveness_score = 17 - new_score (weakness-specific, NOT MPI)
  → MPI fallback SKIPPED (line 1769 only fires if effectivenessScore == null)
```

### VERDICT: IMPLEMENTED CORRECTLY
The system uses weakness-specific scores as PRIMARY, MPI as FALLBACK ONLY. The exact line is 1764: `effectivenessScore = preVal - currentWS.score`. MPI fallback at line 1769 only fires when no weakness_score matches the prescription's targeted_metric.

---

## 2. CONTEXT ENGINE (Game vs Practice)

### allMicroReps WITH session_type
- **Lines 1408-1417**: Each session's `micro_layer_data` reps are spread with `_session_type` attached:
  ```typescript
  allMicroReps.push({ ...rep, _session_type: sessionType });
  ```
  Where `sessionType = s.session_type || 'personal_practice'`

### Game vs Practice Split
- **Lines 530-547** (`detectGamePracticeGap`):
  ```typescript
  const gameReps = allReps.filter(r => ['game','live_scrimmage','live_abs'].includes(r._session_type));
  const practiceReps = allReps.filter(r => !['game','live_scrimmage','live_abs'].includes(r._session_type));
  ```
  Requires ≥5 reps in EACH bucket. Computes weak-contact % for each, gap = gameWeak - practiceWeak.

### Pattern Generation
- Fires when `gap > 20`. Output:
  ```json
  {
    "metric": "practice_game_gap",
    "value": 28,
    "severity": "medium",  // or "high" if gap > 35
    "data_points": { "game_weak_pct": 55, "practice_weak_pct": 27, "context": "game_gap" }
  }
  ```

### Ranking Influence
- **Line 1450**: `practice_game_gap` gets a **+0.5 sorting bonus** via `data_points.context === 'game_gap'`
- Effective sort score: medium + game_gap = `2 × 1.5 = 3.0` (ties with high-severity patterns)
- High severity + game_gap = `3 × 1.5 = 4.5` (outranks everything)

### Prescription Mapping
- **Lines 830-835**: Maps to "Pressure Simulation BP" drill with situational constraints.

### VERDICT: IMPLEMENTED CORRECTLY
`_session_type` is attached at line 1415, split at lines 531-532, pattern generated at 540-545, ranking bonus applied at 1450, prescription mapped at 830. Full pipeline confirmed.

### CURRENT PRODUCTION STATUS: DORMANT
The target athlete (`95de827d`) has 9 sessions — all `personal_practice`. Zero game/scrimmage sessions exist. The `detectGamePracticeGap` function correctly returns `[]` (requires ≥5 game reps). The logic is correct but has no game data to act on.

---

## 3. NIGHTLY CONTINUATION TOKEN

### READ Query
- **Lines 233-238** (`nightly-mpi-process`):
  ```typescript
  const { data: continuationLog } = await supabase.from('audit_log')
    .select('metadata')
    .eq('action', 'nightly_mpi_continuation')
    .eq('table_name', 'mpi_scores')
    .gte('created_at', oneDayAgo)
    .order('created_at', { ascending: false })
    .limit(1);
  ```

### Starting Index Resolution
- **Lines 241-248**:
  ```typescript
  let resumeFrom = 0;
  if (continuationLog && continuationLog.length > 0) {
    const contMeta = continuationLog[0].metadata;
    if (contMeta?.sport === sport && typeof contMeta?.resume_from === 'number') {
      resumeFrom = contMeta.resume_from;
    }
  }
  ```

### Timeout → Token Write
- **Lines 251-268**: When `Date.now() - nightlyStartTime > 50000` (50s budget):
  1. Logs `nightly_mpi_timeout` with `{processed, remaining}`
  2. Inserts `nightly_mpi_continuation` with `{sport, resume_from: batchStart, total_athletes}`
  3. `break` exits the loop

### Resume Flow
```
Invocation 1:
  - 200 athletes, BATCH_SIZE=50
  - Processes batches 0-49, 50-99, 100-149
  - At batch 150: elapsed > 50s → timeout
  - Writes: audit_log { action: nightly_mpi_continuation, metadata: { resume_from: 150, sport: 'baseball' } }
  - break

Invocation 2 (next cron):
  - Reads continuationLog → metadata.resume_from = 150
  - resumeFrom = 150
  - Loop starts at batchStart = 150
  - Processes 150-199
  - Completes normally (no continuation token written)
```

### VERDICT: IMPLEMENTED CORRECTLY
The continuation token is scoped by sport AND time (`gte: oneDayAgo`), ordered `DESC` to get the latest, and only accepted if `resume_from` is a number. The `for` loop starts at `resumeFrom` (line 250), not 0.

### CANNOT SIMULATE LIVE
A real simulation requires invoking `nightly-mpi-process` with a forced timeout (only 3 athletes exist, processing completes in <1s). The logic is structurally proven by code trace. A live proof would require 100+ athletes or artificially lowering the 50s budget threshold.

---

## Summary

| System | Code Status | Production Status |
|--------|-------------|-------------------|
| Effectiveness Engine | **CORRECT** — weakness-specific at L1764, MPI fallback at L1769 | **ACTIVE** — fires on every HIE run for prescriptions with `targeted_metric` |
| Context Engine (Game vs Practice) | **CORRECT** — `_session_type` attached L1415, split L531-532, +0.5 bonus L1450 | **DORMANT** — 0 game sessions in production data |
| Continuation Token | **CORRECT** — read L233-238, resume L250, write L262-267 | **UNTESTED** — only 3 athletes, never hits 50s budget |

No code changes needed. All three systems are correctly implemented. Two are blocked by insufficient production data volume (no game sessions, too few athletes to trigger timeout).

