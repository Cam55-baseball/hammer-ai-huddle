

# FORENSIC INTELLIGENCE AUDIT — FINAL TRUTH

---

## PHASE 1 — TEMPLATE MATCHING vs TRUE INTELLIGENCE

### Two athletes, same weakness, different causes

**Athlete A** — late swing on inside fastball (high `machine_velocity_band: "80-85"`, `contact_quality: "weak"`, `pitch_location.col < midCol`)
**Athlete B** — poor bat path on inside pitch (same contact quality and location, but different vision data from Tex Vision)
**Athlete C** — vision issue on inside pitch (struggles identifying inside pitch type early, high `reaction_time_ms`)

**Code path (lines 136-170):** `analyzeHittingMicro` checks `pitch_location.col < midCol` and `['weak_contact','miss','foul'].includes(contact_quality)`. It computes `weakPct > 55%` and outputs metric `inside_weakness`. Period.

There is **no field in micro_layer_data** that captures "late swing" vs "poor bat path" vs "vision delay." The system detects the statistical outcome (weak contact on inside pitches) but cannot differentiate WHY.

All three athletes receive metric `inside_weakness` → `buildDrillRotations` case `inside_weakness` (line 582) → primary: "Inside Pitch Tee Work" + alt: "Turn & Burn Drill."

**System is still template-based, not intelligence-driven.** The switch statement (line 533) has 21 cases. Every athlete matching a case receives the same drill rotation. No per-athlete causal differentiation exists.

### Does the prescription engine use historical effectiveness, improvement rate, fatigue, or learning curve?

- **Historical effectiveness:** YES — lines 1139-1147 build `ineffectiveDrills` set and `drillUsageCounts`. Lines 794-797 rotate out drills that have `effectiveness_score <= 0` or `usage >= 3`. This is **rotation logic, not learning.**
- **Rate of improvement:** NO. No code reads the slope of effectiveness over time. A drill improving slowly vs quickly is treated identically.
- **Training fatigue:** NO. `adherence_count` is incremented (line 1364) but only used as a resolution trigger at count 4 (line 1370). No fatigue model exists.
- **Learning response curve:** NO. No per-athlete state model tracks how quickly the athlete responds to specific drill types.

**No adaptive learning loop exists — only rotation logic.** The system rotates to alternative B when A fails. If B also fails, it falls back to A again (line 797). This is a 2-3 option carousel, not intelligence.

---

## PHASE 2 — MECHANICAL CAUSATION GAP

The system analyzes:
- `contact_quality` (outcome)
- `pitch_location` (where)
- `machine_velocity_band` (speed)
- `swing_decision` (cognitive)

It does NOT analyze:
- Bat path angle
- Load timing sequence
- Hip-shoulder separation timing
- Hand speed vs decision lag
- Lower half sequencing

**No field in `micro_layer_data` captures mechanical markers.** No video frame analysis exists. No pose estimation exists.

**System cannot diagnose mechanical cause — only statistical symptom.**

### Architecture required for mechanical causation:

**Files to create:**
- `supabase/functions/swing-analyze/index.ts` — receives video URL, calls pose estimation API, returns mechanical markers (bat angle, hip rotation timing, shoulder rotation delay, hand path)
- `src/types/mechanicalAnalysis.ts` — interfaces for `SwingMechanics`, `MechanicalFlaw`, `PoseKeypoints`
- `src/components/analysis/MechanicalBreakdown.tsx` — UI showing frame-by-frame mechanical markers

**Files to modify:**
- `hie-analyze/index.ts` — add `analyzeMechanicalMicro()` that reads stored mechanical markers from sessions, detects causal patterns (early shoulder rotation → weak inside contact), and maps to specific mechanical correction drills
- `performance_sessions` schema — add `mechanical_markers JSONB` column

**Data structures:**
```
SwingMechanics {
  bat_path_angle: number          // degrees
  hip_rotation_start_ms: number   // from trigger
  shoulder_rotation_start_ms: number
  hip_shoulder_separation_ms: number
  hand_speed_mph: number
  contact_point_depth: number     // inches from plate
  load_timing_ms: number
  stride_length_inches: number
}
```

**AI models required:**
- Google MediaPipe Pose or MoveNet for 2D pose estimation (free, runs in-browser or edge function)
- Custom regression model mapping pose keypoints → swing mechanics values (requires training data)
- Gemini Vision for initial frame analysis (already available via Lovable AI)

---

## PHASE 3 — CONTEXTUAL INTELLIGENCE (GAME vs PRACTICE)

`performance_sessions` has a `session_type` field. It is fetched in `hie-analyze` at line 1070. 

In `analyzeHittingMicro` (lines 55-210), `allMicroReps` is built at line 1158-1160 by flattening ALL sessions. `session_type` is NOT passed into the micro reps. No filter or weight differentiates game reps from practice reps.

**System has zero contextual awareness — all reps treated equally.**

No `count`, `inning`, `leverage`, `runners_on`, or `RISP` fields exist in `micro_layer_data`.

### Design: Context-Aware Engine

**Migration:** Add to `micro_layer_data` schema: `session_context: { type: "game"|"practice"|"scrimmage", count?: string, inning?: number, runners?: string }`

**Modify `hie-analyze/index.ts`:**
1. When building `allMicroReps`, attach `session_type` from the parent session to each rep
2. Run `analyzeHittingMicro` twice: once for game reps, once for practice reps
3. Compare: if game weak% >> practice weak%  for same metric → generate new pattern `practice_game_gap` with description "Practice performer: 42% weak in games vs 18% in practice on inside pitches"
4. Weight game reps 1.5x in pattern severity calculation
5. New prescription case: `practice_game_gap` → pressure simulation drills, live-AB focus, mental performance work

---

## PHASE 4 — TEMPORAL INTELLIGENCE (WITHIN SESSION)

`allMicroReps` at line 1158-1160 is a flat array. Rep order within a session is preserved by array index but **never analyzed for positional trends.**

No code segments reps into "first 10" vs "last 10." No fatigue detection. No consistency degradation check.

**System has no temporal awareness — averages hide performance decay.**

### Design: Rep Segmentation Model

**Modify `analyzeHittingMicro`:**
1. Group reps by session (using session_id or array boundaries from `micro_layer_data`)
2. For sessions with 15+ reps, split into thirds (early/mid/late)
3. Compare weak% in early third vs late third
4. If late_weak% > early_weak% by >20 percentage points across 3+ sessions → pattern `fatigue_dropoff` with severity based on magnitude
5. Prescribe: "Reduce drill volume per session" + "Endurance-focused conditioning" + "Quality-over-quantity protocol"

---

## PHASE 5 — DRILL EFFECTIVENESS TRUTH

Lines 1360-1363: `effectiveness_score: mpiScore - ex.pre_score`. This is global MPI delta.

The system CANNOT answer "Did THIS drill fix THIS specific weakness?" because:
1. `pre_score` and `post_score` are both global MPI, not weakness-specific metrics
2. Multiple drills may be active simultaneously — all get the same delta
3. A hitting drill gets credit if fielding improved MPI

**Drill effectiveness is misattributed — MPI-level measurement is invalid.**

### Redesign: Skill-Specific Effectiveness Engine

**New table:** `weakness_scores` — `{ user_id, weakness_metric, score, computed_at }`

**Modify `hie-analyze/index.ts`:**
1. After computing patterns, store each pattern's `value` as a weakness-specific score in `weakness_scores`
2. When updating `drill_prescriptions`, use the matching `weakness_metric` score instead of MPI: `effectiveness_score = current_weakness_value - pre_weakness_value`
3. A chase_rate drill's effectiveness is measured by chase_rate change, not MPI change

**New field in `drill_prescriptions`:** `weakness_metric TEXT` — stores which specific metric this drill targets (e.g., `chase_rate`, `inside_weakness`)

**Logic flow:**
- Prescribe drill for `inside_weakness` at value 72% → `pre_weakness_value = 72`
- After 5 sessions, `inside_weakness` drops to 58% → `effectiveness = 72 - 58 = 14` (improvement)
- Attribution confidence = number of sessions where only this drill was active / total sessions

---

## PHASE 6 — ENFORCEMENT vs SUGGESTION

Drill constraints at line 568: `"Set machine to ${veloBand} mph, 25 reps"` — this is a plain string stored in `drill_prescriptions.constraints`.

`PracticeHub.tsx` reads URL params and shows a banner. The user then logs reps manually. There is no validation that:
- The machine was actually set to the prescribed velocity
- The user completed the prescribed rep count
- The drill parameters were followed

**No real-world enforcement exists — system relies on user honesty.**

### Design: Constraint Enforcement Layer

**Modify Practice Hub session submission:**
1. Parse `constraints` JSON from drill prescription
2. After session, compare: `logged_velocity_band` vs `prescribed_velocity_band`, `total_reps` vs `prescribed_reps`
3. If mismatch > 20% → flag as `partial_adherence` in `drill_prescriptions`
4. If mismatch > 50% → do not count toward `adherence_count`
5. Surface warning: "Prescribed: 25 reps at 80-85mph. Logged: 12 reps at 70-75mph. This session may not address your weakness."

**Requires:** Structured constraints (JSON, not string) in `drill_prescriptions`

---

## PHASE 7 — ADAPTIVE INTELLIGENCE CLASSIFICATION

The system is: **Static logic + rotating alternatives.**

Evidence:
- `buildDrillRotations` (line 530): switch statement with fixed outputs per case — never changes
- `mapPatternToDrills` (line 782): rotates when primary fails, falls back to first alternative — fixed pool
- No per-athlete state model exists beyond `drill_prescriptions` table
- No action → outcome → policy update loop exists
- No reinforcement signal modifies future drill selection beyond binary "ineffective or not"

### Design: Real Adaptive Engine

**State model:** `athlete_learning_profile` table
```
{ user_id, drill_category, response_rate (sessions to improve), 
  preferred_modality (visual/kinesthetic/repetition), 
  fatigue_threshold (reps before degradation), 
  last_updated }
```

**Decision engine:** Replace `buildDrillRotations` switch with a scoring function:
1. For each candidate drill targeting the weakness, compute: `score = base_relevance × effectiveness_history × (1 - fatigue_penalty) × modality_match`
2. `effectiveness_history` = avg effectiveness_score for this drill across resolved prescriptions
3. `fatigue_penalty` = `adherence_count / fatigue_threshold` (diminishing returns on repeated drills)
4. `modality_match` = 1.0 if drill modality matches athlete's `preferred_modality`, 0.7 otherwise
5. Select top-scoring drill

**Update mechanism:** After each prescription resolution:
1. Update `response_rate` based on how many sessions it took to improve
2. Update `preferred_modality` based on which drill categories have highest effectiveness
3. Write to `athlete_learning_profile`

---

## PHASE 8 — MLB-LEVEL GAP ANALYSIS

| Capability | MLB Dev Departments | This System |
|---|---|---|
| Biomechanical analysis | Hawk-Eye, KinaTrax, Blast Motion sensors | None — no mechanical data |
| Real-time feedback | In-cage sensor alerts | Post-session only |
| Video-linked diagnostics | Synced video per pitch/swing | Video stored but not linked to mechanical analysis |
| Individualization | Coach-athlete relationship + data | Template switch statement |
| Pitch sequence analysis | Trackman tunneling data | Not analyzed |
| Game-situation context | PBP data integration | Not captured |
| Drill enforcement | Structured program compliance | Text suggestions |
| Adaptation speed | Daily coach adjustments | 5-session resolution cycle |

---

## PHASE 9 — FINAL TRUTH

### 1. Classification: **Advanced statistical pattern-matching system**
Not elite. Not world-class. Advanced because: real micro-data analysis, multi-module integration, adaptive rotation (not adaptation). Below elite because: no mechanical causation, no contextual awareness, template prescriptions.

### 2. Single limitation preventing dominance:
**The prescriptive engine is a static switch statement.** Every insight flows through 21 fixed cases producing pre-written drill cards. No amount of better diagnostics matters if the output is always the same 2-3 drills per weakness type.

### 3. One architectural change for biggest leap:
**Replace `buildDrillRotations` switch with an AI-driven prescription generator** that receives: the specific pattern data, the athlete's training history, past drill effectiveness scores, and learning profile — then generates a truly individualized prescription via Gemini. This converts the system from "pattern → template" to "pattern + context → generated intelligence." The drill catalog becomes a constraint set (available drills), not the decision engine. The AI becomes the decision engine.

### Implementation:
- Modify `mapPatternToDrills` to call a Gemini prompt with: pattern details, athlete history (last 10 prescriptions + effectiveness), available drills from catalog, athlete age/level
- Return structured drill prescription with individualized constraints
- Cache per athlete to avoid excessive AI calls (invalidate on new session)
- Estimated effort: 1 edge function modification + 1 new prompt template

