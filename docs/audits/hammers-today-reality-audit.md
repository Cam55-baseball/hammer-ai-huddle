# Hammers Today — Reality Audit (Phase 1)

Read-only, evidence-only. Every claim references file:line or a live DB query executed 2026-07-01.  
No code, schema, UI, or architecture changes were made in this phase.

> Companion files:
> - `docs/audits/hammers-today/dependency-map.json` — nodes + edges
> - `docs/audits/hammers-today/variables-matrix.csv` — personalization coverage
> - `docs/audits/hammers-today/fragments.csv` — dead / legacy / disconnected surfaces

---

## 0. Executive summary — six critical findings that must land before any rewrite

| # | Finding | Evidence | User-visible symptom |
|---|---------|----------|----------------------|
| C-1 | `useWkDailyPrescriptions` is instantiated **4× per Hammers Today render** (HammerDailyPlan + WkSpeedBatCard + WkLiftsCard + WkConditioningCard), each with its own `autoTriedKey.current` guard, producing up to **4 concurrent `wk-generate-daily` invocations** on a cold day. The generator does `delete → insert` non-atomically. | `src/components/hammer/HammerDailyPlan.tsx:157`, `src/components/hammer/WkSpeedBatCard.tsx:21`, `src/components/hammer/WkLiftsCard.tsx:36`, `src/components/hammer/WkConditioningCard.tsx:17`; generator `supabase/functions/wk-generate-daily/index.ts:630-641`. Live DB: 14 movement slugs each duplicated exactly **4×** for one user on `2026-07-01`. | Duplicate exercises within the same session (all cards). |
| C-2 | `wk_prescriptions.generator_version`, `adaptation`, `engine`, `why_v2`, `validator_report` are **NULL for 100 % (81/81) of rows in the last 14 days**, despite the generator setting them at `wk-generate-daily/index.ts:430-464, 636`. Columns exist (`information_schema` verified). | Live DB: `SELECT count(...) FROM wk_prescriptions WHERE plan_date > current_date - 14` → `count=81, gen_ver_nn=0, adapt_nn=0, engine_nn=0, why_v2_nn=0, vr_nn=0`. | Stale-version detector in the hook (`useWkDailyPrescriptions.ts:219-230`) reads `why_payload.generator_version` (present) not the column — masks the failure, but the WIC "Why this? six answers" panel (`WkPrescriptionCard.tsx:157-175`) never renders. Also breaks the wic-audit script (`scripts/audits/wic-audit.ts:47`). |
| C-3 | Every `useWkDailyPrescriptions` mount's `useEffect` (`src/hooks/useWkDailyPrescriptions.ts:217-242`) depends on `generate` (which itself depends on `generating`), so `autoTriedKey` is not a durable guard when the callback identity churns during state transitions. Combined with C-1 this is the duplicate-insert amplifier. | Same file, `useCallback` deps `[user?.id, planDate, qc, generating, invokeOnce]`. | Duplicate exercises, phantom regenerations after Complete/Skip. |
| C-4 | Ordering rule "Speed / Bat-Speed → Lifts → Practice → Conditioning" is enforced **only in text** in the header strip and in bucket grouping. The **DB has no cross-slot canonical sequence** — `sequence_order` restarts per generator invocation. If two invocations race (C-1), rendered order is nondeterministic between mounts. | `src/components/hammer/HammerDailyPlan.tsx:285-302` (text banner), `src/hooks/useWkDailyPrescriptions.ts:250-281` (client-side grouping). Generator writes `sequence_order` from a single-run `seq++`. | Users can see cards reorder on refresh; game-day crossover placement inconsistent. |
| C-5 | **Warm-up is fully dual-track.** Hammers Today uses `dailyPlan.ts:builder → warmup` (hard-coded drill list) *and* a separate AI generator at `supabase/functions/generate-warmup/index.ts` reachable only through `HammerWarmupDialog` when the user taps the CTA. Neither writes to `wk_prescriptions`. The WIC constitution enumerates `warmup` as an engine (`_shared/wic/constitution.ts:36`, `dayStructure.ts:6-19`), but no engine module or generator branch exists for it. | Generator `wk-generate-daily` has zero `warmup` or `movement_prep` emission; catalog has no warmup category (see §5.1). | Warm-up doesn't respect CNS/season/game-day/injury logic. Cannot be re-ordered by validator. |
| C-6 | Catalog seasonal metadata contradicts the constitution. `atg_split_squat`, `sissy_squat`, `slide_lunge` are in `IN_SEASON_BLOCKED_SLUGS` (`wk-generate-daily/index.ts:134-139`) but only `slide_lunge` has `season_eligibility` including `in_season` — so the hard-coded list is the only barrier and it is **out of sync with the row-level metadata**. Every `is_eccentric_dominant=true` row already excludes `in_season` in `season_eligibility` (verified for 8 slugs). Two independent gates → contradiction risk when either drifts. | Live DB query on 8 slugs; generator `wk-generate-daily/index.ts:119-139, 297-303, 313-320`. | Nordic-style movements *are* correctly blocked in-season today, but by two overlapping mechanisms — a future edit to only one gate will silently re-open them. |

---

## 1. Workout Intelligence Architecture Map

```
┌──────────────────────────────────────────────────────────────────────┐
│                    HAMMERS TODAY CARD SURFACE                        │
│  src/components/hammer/HammerDailyPlan.tsx  (824 LOC)                │
├──────────────────────────────────────────────────────────────────────┤
│  Text banner "Do in this order" (285-290)                            │
│  Rendered card sequence:                                             │
│    1  HammerScheduleStrip                                            │
│    2  GpInGameAdvisoryStrip                                          │
│    3  <ErrorBoundary> WkSpeedBatCard    ─── useWkDailyPrescriptions  │
│    4  <ErrorBoundary> WkLiftsCard       ─── useWkDailyPrescriptions  │
│    5..N BlockCard × plan.blocks         ─── buildHammerDailyPlan()   │
│         (warmup, speed, strength, hitting, throwing, defense,        │
│          baserunning, game_iq, fueling, recovery)                    │
│    N+1  <ErrorBoundary> WkConditioningCard ── useWkDailyPrescriptions│
│    plus HammerDailyPlan itself: useWkDailyPrescriptions              │
│  Result: 4 concurrent hook instances (see C-1)                       │
└──────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│  TWO PARALLEL PLANNING TRACKS — NOT UNIFIED                          │
├──────────────────────────────────────────────────────────────────────┤
│  Track A (server, DB-backed):                                        │
│    supabase/functions/wk-generate-daily/index.ts  (783 LOC)          │
│      → writes wk_prescriptions, wk_cns_ledger                        │
│      → reads athlete_context, profiles, user_injury_progress,        │
│        athlete_daily_log, gp_games, wk_periodization_blocks,         │
│        wk_movement_catalog, wk_prescriptions (72h lookback),         │
│        wk_movement_overrides                                         │
│      → uses WIC: adaptationSelector, engines/{strength,sprint,       │
│        batSpeed,conditioning,crossSport,reserved}, validator         │
│      Slots authored: lift, supplemental, speed, bat_speed,           │
│        conditioning, cross_sport                                     │
│      Slots NEVER authored: warmup, movement_prep, recovery,          │
│        arm_care (as slot), mobility, return_to_play, power           │
│                                                                       │
│  Track B (client-only, pure function, no I/O):                       │
│    src/lib/hammer/prescription/dailyPlan.ts  (1530 LOC)              │
│      buildHammerDailyPlan(ctx, scheduleSignal, sideBias, gpForPlan)  │
│      Modalities authored: warmup, speed, strength, hitting,          │
│        throwing, defense, baserunning, game_iq, fueling, recovery    │
│      Reads: athlete context envelope only. Never touches wk_* tables.│
│      Output: PrescribedBlock[] rendered as BlockCard.                │
└──────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│  TRACK A ONLY — persistence + user actions                           │
├──────────────────────────────────────────────────────────────────────┤
│  WkPrescriptionCard (196 LOC) → wk_prescriptions.status update,      │
│    wk_session_logs.insert on Complete                                │
│  WkLiftsCard → wk_recovery_acks.upsert ("I will recover")            │
│    → useBlockedLiftMovements → wk_movement_overrides.insert          │
└──────────────────────────────────────────────────────────────────────┘
```

**Track A vs Track B are not integrated.** WIC lives entirely inside Track A. Track B's `strength` block is client-computed from `strengthSelector.ts` and never reconciled against Track A's Lift card.

---

## 2. Dependency Map (summary)

Full graph is in `docs/audits/hammers-today/dependency-map.json`. Key edges:

**Server → DB reads (in `wk-generate-daily/index.ts`)**
- L165-176 `profiles`, `athlete_context`, `user_injury_progress`, `athlete_daily_log`, `gp_games`
- L194-197 `wk_periodization_blocks`, `wk_movement_catalog`
- L276-288 `wk_prescriptions` (last 72h, slot=lift), `wk_movement_overrides` (ack_date=today, unexpired)
- L548-555 `wk_prescriptions` (last speed date)

**Server → DB writes**
- L630 `DELETE FROM wk_prescriptions WHERE user_id=? AND plan_date=?`
- L639 `INSERT INTO wk_prescriptions` (bulk)
- L643-653 `UPSERT wk_cns_ledger`

**Server → engine imports** (`wk-generate-daily/index.ts:17-28`)
- `_shared/wkPhaseQuarter.ts` `resolveWkPhase`
- `_shared/wic/constitution.ts` (`WIC_VERSION`, `WicEngine`)
- `_shared/wic/adaptationSelector.ts`
- `_shared/wic/rationale.ts` (`buildWhy`, `whyIsComplete`)
- `_shared/wic/validator.ts`
- `_shared/wic/engines/{strength,sprint,batSpeed,conditioning,crossSport}`

**Client hooks that call the generator**
- Only `src/hooks/useWkDailyPrescriptions.ts:170` (`supabase.functions.invoke("wk-generate-daily")`)

**Legacy generators still reachable elsewhere in the app** (not from Hammers Today; see §12):
- `generate-training-block` — invoked by `src/hooks/useTrainingBlock.ts:111,205` from `/training-block` page
- `generate-block-workout` — invoked by `src/hooks/useBlockWorkoutGenerator.ts:91`
- `generate-elite-layer` — invoked by `supabase/functions/compute-hammer-state/index.ts:339`
- `recommend-workout` — invoked by `src/hooks/useWorkoutRecommendations.ts:202`
- `generate-drills` — owner-only queues (`PendingDrillsQueue.tsx`, `DrillCmsManager.tsx`)
- `generate-warmup` — reached only via `HammerWarmupDialog → WarmupGeneratorCard` (see C-5)

None of the six above write to `wk_prescriptions`.

---

## 3. Canonical Data Flow (actual, not idealized)

```
User opens Home / Dashboard
        │
        ▼
<HammerDailyPlan/> mounts
        │
        ├── useHammerAthleteContext() ─── reads athlete_context RPC envelope
        │        (src/lib/hammer/context/athleteContext.ts)
        ├── useScheduleWindow() ─── projects calendar_events + gp_games
        ├── useSideContext()    ─── athlete_side_preferences
        ├── useGpSignal()       ─── gp_at_bats, gp_pitches, gp_games (last 7d)
        ├── useWkDailyPrescriptions()  ── instance #1  ┐
        │                                                │
        ├── <WkSpeedBatCard/>                            │
        │     └── useWkDailyPrescriptions()  ── instance #2
        ├── <WkLiftsCard/>                               │
        │     └── useWkDailyPrescriptions()  ── instance #3
        ├── <WkConditioningCard/>                        │
        │     └── useWkDailyPrescriptions()  ── instance #4
        │                                                │
        │  Each instance: query wk_prescriptions;        │
        │  if empty AND autoTriedKey miss → invoke      │
        │  wk-generate-daily.                            │
        │  Race window ≈ 200-800ms → up to 4 concurrent │
        │  invocations → 4× delete/insert                │
        │                                                │
        └── buildHammerDailyPlan(ctx,sched,side,gp)  ← Track B, pure
              → PrescribedBlock[] (warmup..recovery)
              → BlockCard × N
```

**Server-side inside `wk-generate-daily`** (annotated line ranges):

```
1  Auth + parse body                                  L141-162
2  Load athlete + injuries + daily_log + game today   L165-184
3  Resolve WkPhase quarter (os_q1..post_season)       L186-192
4  Load phase block dosing + movement catalog         L194-201
5  Compute reductions (sleep/CNS/soreness/ack)         L203-231
6  WIC selectAdaptation()  → primary adaptation       L232-262
7  Load 72h lift history + active overrides           L272-291
8  Filter (eligible), swap (injury contra→regression) L293-346
9  Compose lifts (game day: cross-sport primer only;
   else: arm_care→trunk_primer→compound_lower→
   unilateral_lower→upper_push→upper_pull→
   carry_antirotation→(offseason: trunk_finisher))    L468-536
10 Bat speed (pre-lift, non-game)                     L538-545
11 Speed (cadence-gated, non-game)                     L547-566
12 Conditioning (position-aware, non-game/post-season) L568-577
13 Offseason cross-sport                              L579-590
14 dedupePrescriptions(rxs) — slug + name dedupe      L592, 719-729
15 wicValidate(...) — full-body roles, game-day slot  L594-617
16 Idempotent DELETE by (user_id,plan_date), INSERT   L630-641
17 UPSERT wk_cns_ledger                                L643-653
```

The pipeline does **not** persist WIC field values (see C-2). Steps 14 (`dedupePrescriptions`) and 8 (`eligible.usedThisSession`) handle intra-run dedupe correctly; C-1 causes cross-run duplicates that neither step sees.

---

## 4. Personalization Audit

Full matrix: `docs/audits/hammers-today/variables-matrix.csv`. Summary of what actually influences today's Wk plan (Track A):

| Variable | Collected in | Stored in | Consumed by `wk-generate-daily` | Consumed by `dailyPlan.ts` (Track B) | Status |
|----------|--------------|-----------|-----|-----|-----|
| age / chronological age | `profiles.age` (and variants) | `profiles` | L240 `ageYears` → `selectAdaptation` (only used to trigger `movement_literacy` when `< 8`) | via envelope indirect | Under-used; only youth cutoff. |
| training age (years lifting) | `profiles.years_lifting` | `profiles` | L181 → filter `min_training_age_years` L310 | via `proj.liftingAgeYears` L145 | OK |
| pro prospect | `profiles.is_pro_prospect` | `profiles` | L182 → overrides age gate L310-311 | not used | Track A only |
| position (primary) | `profiles.primary_position` | `profiles` | L180 → conditioning selection L679-694 | via ctx `position_primary` | OK |
| pitcher / two-way | none in Track A | — | **NOT consumed** | via `dailyPlan.ts` `pos` | **Gap** — pitcher/two-way status never modulates Wk lifts, only Track B cards. |
| handedness (bats / throws) | `athlete_side_preferences` | `athlete_side_preferences` | Passed to invoke body (`side_hit`, `side_throw`) L173-174 **but never read** by generator (search in file returns no consumer) | via SideContext | **Gap** — server ignores the values it receives. |
| season phase | `athlete_context` season fields | `athlete_context` via `resolveWkPhase` | L187 → gates seasonal legality, dosing, block choice | via `proj.seasonPhase` | OK (dual computation — could drift; see §8) |
| game today | `gp_games` | `gp_games` | L170-176 `isGameDay` → suppresses lifts, injects cross-sport primer | via `gpSig.gameToday` | OK |
| practice today | `scheduled_practice_sessions` | — | **Passed as `isPracticeDay: false`** hard-coded L236 | via `scheduleContext.ts` | **Gap** — Track A never learns about practices. |
| tournament / camp / travel | `calendar_events` | — | not consumed | via `useScheduleWindow → projectScheduleSignal` | Track B only |
| sleep hours | `athlete_daily_log.sleep_hours` | `athlete_daily_log` | L207 → CNS cap reduction L210-213 | not used | Track A only |
| CNS readiness | `athlete_daily_log.cns_readiness` | `athlete_daily_log` | L208 → cap reduction + adaptation gate | via `readiness.score` L152 | OK |
| soreness | `athlete_daily_log.soreness` | `athlete_daily_log` | L209 → substitution + safety gate | not used | Track A only |
| injuries (active) | `user_injury_progress` | `user_injury_progress` | L168, L183 → `injurySlugs` → contra filter + swap | via `proj.injury/injuryRegions` | OK |
| recent recovery ack | `wk_recovery_acks` (last) | `wk_recovery_acks` | Passed as `recent_ack`; L221-230 → conservative cap | not used | OK — learning loop present |
| equipment | envelope `equipment_effective` | derived | **NOT consumed** by generator | via `proj.equipment` | **Gap** — filter for band/hotel only exists in Track B. |
| available time | envelope `typical_session_length_min` | derived | **NOT consumed** | via `proj.availDays` | Gap |
| goals (5-category) | `athlete_context.category_goals` | `athlete_context` | **NOT consumed** | via `categoryGoals.ts` | Gap — WIC does not read ranked goals. |
| historical workload | `athlete_load_tracking` | `athlete_load_tracking` | **NOT consumed** | via `proj.workloadHigh` | Gap |
| anthropometrics / limb proportions | envelope `anthropometrics` | derived | **NOT consumed** | via `buildAnthroProfile(...)` | Gap |
| compliance history | `wk_prescriptions.status` + `wk_session_logs` | `wk_*` | Only via 72h compound repeat block L289 | not used | Weak — no per-athlete adherence signal beyond 72h. |
| 72h lift history | `wk_prescriptions` | same | L272-289 → compound dedupe | — | OK |
| bat side / throw side | envelope + `SideContext` | `athlete_side_preferences` | Server payload receives, ignores (see above) | Track B badges only | Gap |
| lifecycle_band (u10..pro) | envelope | derived | not consumed | via `lifecycleBand` L146 | Gap |
| development priorities | envelope | derived | not consumed | via `proj.devPriorities` | Gap |

Net: **Track A personalizes on ~12 signals; Track B personalizes on ~15**. Roughly half the athlete signals collected during onboarding never influence the actual DB-backed prescription.

---

## 5. Exercise Selection Audit

### 5.1 Movement catalog reality (`wk_movement_catalog`, 88 rows, all `wic_metadata_complete=true`)

Category breakdown (live DB, 2026-07-01):

| category | count | complete |
|---|---|---|
| arm_care | 2 | 2 |
| bat_speed | 8 | 8 |
| carry_antirotation | 2 | 2 |
| compound | 24 | 24 |
| conditioning | 9 | 9 |
| cross_sport | 4 | 4 |
| functional_patterning | 7 | 7 |
| kot | 8 | 8 |
| speed_lab | 11 | 11 |
| supplemental | 1 | 1 |
| trunk | 2 | 2 |
| unilateral_lower | 6 | 6 |
| unilateral_pull | 2 | 2 |
| unilateral_push | 2 | 2 |

Gaps vs. slots the generator emits:
- **No `warmup` or `movement_prep` category** (C-5). Generator emits neither slot.
- **Only 2 `arm_care` rows** ⇒ the "non-negotiable" first slot rotates between exactly two picks (`crossover_symmetry_full`, `jband_full_chart`, `_shared/wic/engines/strength.ts:57`). No progression variety.
- **Only 2 `trunk` primer** and **1 `trunk_finisher`** row — role diversity is one movement deep.

### 5.2 Selection function chain (`wk-generate-daily/index.ts`)

1. `eligible(m)` L306-331 — hard blocks: `wic_metadata_complete=false`, min training age, min chronological age, injury contra, `season_eligibility` mismatch (bypassable via override), phase hard-block, session dedupe, 72h compound repeat, adaptation compatibility.
2. `swap(m)` L332-339 — injury-triggered regression to `regression_slug`.
3. `pickFirst(slugs[])` L340-346 — first-match against ordered slug list.
4. Engine slug lists (`_shared/wic/engines/strength.ts:20-64`) drive role fills, plus `ensureFullBodyLift` guardrail (L731-780) that back-fills any role missing after the primary pass.

### 5.3 Substitution + override paths

- **Auto-swap**: only for injury contraindications (L332-339). No swap for equipment, no swap for CNS-clamp above budget (movement is added with `cns_clamped=true`, sets are trimmed by −1 L415).
- **User override**: `wk_movement_overrides` (`ack_date=today`, expires_at>now). Insert via `overrideMovement()` (`useWkDailyPrescriptions.ts:309-321`). Overrides bypass both `season_eligibility` and `phase_allow` gates (L315, L319). Role: `self` (no role check).

### 5.4 Progression / regression

- `progression_slug` **not consumed** anywhere in `wk-generate-daily/index.ts` (grep). Only `regression_slug` is read.
- No time-based progression: same seed rules regardless of week within a mesocycle.

### 5.5 Duplicate prevention

Three layers:
1. Intra-invocation: `usedThisSession` (slug) + `usedNamesThisSession` (normalized name) — L291-292, checked in `eligible()` L322-323 and `push()` L381-385.
2. Post-composition: `dedupePrescriptions(rxs)` L592, 719-729 — same rules, redundant to (1).
3. 72h compound history: `recentCompoundSlugs` L272-289 blocks compound repeats.

Missing: **cross-invocation coordination**. See C-1 / C-3. `DELETE` on L630 clears the day, but with 4 concurrent runs `DELETE1 → DELETE2 → INSERT1 → INSERT2` yields double rows; with 4 concurrent, quadruple.

Validator (`_shared/wic/validator.ts:62-71`) catches intra-payload duplicates and marks fatal — but the validator runs per-invocation, so 4 separate valid payloads collide at INSERT time.

---

## 6. Card Generation Audit

| Card | Built by | Where | When | Inputs | Outputs |
|---|---|---|---|---|---|
| Warm-Up | `dailyPlan.builder({modality:"warmup"})` `dailyPlan.ts:170-220` | Client | Every render | ctx, season | Hard-coded drill list (in/off/pre variants) |
| Warm-Up (AI) | `generate-warmup` edge fn | Server | On CTA in HammerWarmupDialog | Exercises + goals + `warmupContext` | AI-tool-call JSON `warmupExercises[]` |
| WkSpeedBatCard | `WkSpeedBatCard.tsx` reading `grouped.speedBat` | Client | Every render | `wk_prescriptions` slot in {`speed`,`bat_speed`,`cross_sport`+`placement=early_activation`} | WkPrescriptionCard × N |
| WkLiftsCard | `WkLiftsCard.tsx` reading `grouped.lifts` | Client | Every render | slot in {`lift`,`supplemental`} sorted by `LIFT_ROLE_ORDER` | WkPrescriptionCard × N + blocked-movements drawer |
| BlockCard × 10 | `dailyPlan.builder({modality})` for each of `ALL_MODALITIES` | Client | Every render | ctx envelope only | PrescribedBlock (drills, cues, stopIf) |
| WkConditioningCard | `WkConditioningCard.tsx` reading `grouped.conditioningCard` | Client | Every render | slot=`conditioning` or (`cross_sport` && placement≠early_activation) | WkPrescriptionCard × N |
| Recovery / Arm Care / Mobility / Mental / Nutrition | Only via Track B `dailyPlan` modality cards | Client | Every render | ctx | Hard-coded drill lists |

Slots that WIC declares but no builder emits: `movement_prep`, `power`, `recovery`, `arm_care` (as its own slot), `mobility`, `return_to_play` (`_shared/wic/constitution.ts:34-47`).

---

## 7. Ordering Audit

- Header banner text is fixed strings, not driven by data (`HammerDailyPlan.tsx:285-290`).
- Rendered order of parent card list is hard-coded in JSX order (`HammerDailyPlan.tsx:291-302`): Wk cards wrap the middle Track B blocks — this is the actual "in this order" hierarchy. The banner text says "Warm-up → Speed → Lifts → Practice → Conditioning → Sport" but the actual JSX renders: SpeedBat → Lifts → (all Track B blocks including warmup) → Conditioning. **Banner ≠ layout**.
- Track A `sequence_order` restarts at 0 per invocation. Not globally ordered across slot boundaries.
- Client re-sorts lifts by `LIFT_ROLE_ORDER` (`useWkDailyPrescriptions.ts:91-101, 252-256`); other slots rely on the server's `sequence_order` only.
- Duplicate concurrent invocations (C-1) cause the client sort to see 4 items per role → **rendered card list can visibly reshuffle when React Query refetches** because tie-breaking on `sequence_order` is not stable across duplicate rows with the same value.

---

## 8. Season Intelligence Audit

- Season resolution runs **twice** with different codepaths:
  - Server: `_shared/wkPhaseQuarter.ts:33` → 6 phases (`os_q1..q4`, `in_season`, `post_season`) computed from `athlete_context` date windows.
  - Client (Track B): `dailyPlan.ts` uses `proj.seasonPhase` which maps to 3 buckets (`in`, `off`, `pre`) via `athlete_context` projection.
- Client mirror `src/lib/hammer/workout/phaseQuarter.ts` exists (marked "keep in sync" comment) and is separately imported for other surfaces.
- Quarter labels are hard-coded in `wkPhaseQuarter.ts:12-19`.
- Drift risk: `IN_SEASON_BLOCKED_SLUGS` (`wk-generate-daily/index.ts:134-139`) is a static hardcoded set; `season_eligibility` is per-row DB metadata. Any future catalog change touching only one gate produces silent regression (C-6).
- Default fallback when season windows aren't set: `os_q1` (`wkPhaseQuarter.ts:55`). Silent — no user visible signal that they're on a default.

---

## 9. Duplicate Detection Audit

Confirmed root causes:

- **C-1 (multiple hook instances)** — primary. Fix requires either (a) turning the hook into a stable singleton keyed on `(user, planDate)` with a module-level in-flight promise, or (b) hoisting the auto-generate side effect to `HammerDailyPlan` only and passing a stable disabled prop to the child cards. Recommend (a) since the child cards can be used independently.
- **C-3 (unstable `generate` identity)** — amplifier. `generate` depends on `generating` inside its own `useCallback` deps. Fix: keep `generating` in a ref and drop it from deps, or split effect into `queryFn` completion trigger.
- **`DELETE → INSERT` not in a transaction** (`wk-generate-daily/index.ts:630-641`). Fix: wrap in an RPC that uses `SET LOCAL lock_timeout` + advisory lock on `(user_id, plan_date)` hashed, or move to an `UPSERT` keyed on `(user_id, plan_date, sequence_role, movement_slug)`.
- **`sequence_order` collisions across concurrent runs** → non-deterministic client sort (C-4).

Live evidence: 14 slugs × 4 for user `95de827d…` on `2026-07-01`.

---

## 10. Formatting Audit

- Slot label + color: `WkPrescriptionCard.tsx:18-34`.
- Phase label: `wkPhaseQuarter.ts:12-19` → surfaced in `useWkDailyPrescriptions.grouped.phaseDisplay` → shown in every Wk card header.
- Rationale text: assembled in `wk-generate-daily/index.ts:397-411` — long concatenated string, includes doctrine + reductions + override; can exceed 3 lines and truncates with `line-clamp-2` in some headers.
- `why_v2` panel: `WkPrescriptionCard.tsx:157-175` — expects `rx.why_v2` present. Because of C-2 this panel renders for zero rows in the current DB.
- BlockCard drills: `HammerDailyPlan.tsx:497-529` — supports `setup / dosage / cue / stopIf`, all optional.
- Duration badge only rendered when `> 0` (L430-434).
- Track A cards do not render Track B `stopIf` / `cues` conventions — different visual grammar per track.

---

## 11. Regression Audit (surfaces most likely to break with future edits)

| Risk | Surface | Why fragile |
|---|---|---|
| High | Any change to `useWkDailyPrescriptions` deps or hoisting | C-1/C-3 mean auto-generate side effects are load-bearing; small refactors easily amplify duplicates. |
| High | `wk-generate-daily` insert shape | Silent field drop confirmed by C-2. Adding/removing columns without a migration + typed row builder will keep swallowing. |
| High | Catalog seasonal metadata edits | C-6 dual gate — updating `season_eligibility` without matching `IN_SEASON_BLOCKED_SLUGS` reopens Nordic-family movements. |
| Med | `LIFT_ROLE_ORDER` in client vs `ensureFullBodyLift` roles in server | Two lists that must stay identical, no shared enum. |
| Med | `engineForSlotRole` L263-270 mapping vs `WIC_ENGINES` enum | Slot→engine table is inline in generator; no compile-time link to constitution. |
| Med | `_shared/wkPhaseQuarter.ts` server vs `src/lib/hammer/workout/phaseQuarter.ts` client | "Keep in sync" comment. No test asserts equivalence. |
| Med | `WkPrescriptionCard` slot list vs generator slot enum | Two enums typed by hand: `SLOT_LABEL`/`SLOT_TONE` (`WkPrescriptionCard.tsx:18-34`) will silently ignore any new slot. |
| Low | `LOVABLE_API_KEY` in `generate-warmup` | Warmup silently fails-open with fallback list if AI down — masks outages. |

---

## 12. Fragment Audit

Full CSV: `docs/audits/hammers-today/fragments.csv`.

- **Legacy generators** still deployed but not part of Hammers Today:
  - `generate-training-block` — page `TrainingBlock.tsx`
  - `generate-block-workout` — hook `useBlockWorkoutGenerator`
  - `generate-elite-layer` — invoked from `compute-hammer-state`
  - `recommend-workout` — `useWorkoutRecommendations`
  - `generate-drills` — owner-only
- **Track B `strength` and `speed` modality cards** (`dailyPlan.ts` `builder`) duplicate concepts already authored by Track A but never reconcile. Athlete sees both, one from each track.
- **`useEliteWorkout.ts`** (287 LOC) — no import from Hammers Today; not referenced by `HammerDailyPlan` or any Wk card.
- **WIC engine modules with zero exported logic**:
  - `_shared/wic/engines/batSpeed.ts` — 2 LOC, only `BAT_SPEED_PREFERRED = ["med_ball_shot_put"]`.
  - `_shared/wic/engines/crossSport.ts` — 2 LOC, only game-day primer slugs.
  - `_shared/wic/engines/reserved.ts` — 4 LOC, placeholder.
  - `_shared/wic/engines/sprint.ts` — 8 LOC.
  - `_shared/wic/engines/conditioning.ts` — 13 LOC (function `conditioningSlugFor` **not called** by generator; generator inlines the same logic at `wk-generate-daily/index.ts:679-695`).
- **`wk_movement_overrides.actor_role`** column exists but is always written as `"self"` (`useWkDailyPrescriptions.ts:316`). Coach/medical overrides are constitutional per WIC (`WIC_PRIORITY: medical_restrictions`) but no path writes them.
- **`wk_session_logs.rpe`** — always inserted as `null` (`WkPrescriptionCard.tsx:62`). Learning loop cannot use it.
- **`side_hit` / `side_throw`** — passed by client (`useWkDailyPrescriptions.ts:173-174`) but generator does not read them (grep). Dead payload.
- **`isPracticeDay` hard-coded false** — `wk-generate-daily/index.ts:236`. Practice signal never modulates.

---

## 13. User-report traceback

| Report | Root cause | Evidence |
|---|---|---|
| "Duplicate exercises in the same workout" | C-1 + C-3 + non-transactional delete/insert | 14 slugs × 4 on 2026-07-01 |
| "Lift is all lower body" | `ensureFullBodyLift` (`wk-generate-daily/index.ts:731-780`) triggers only after primary pass fails to fill a role — if `eligible` filter rejects upper picks (catalog scope, or seasonal metadata, or contraindication), no exception is raised; the fallback picks the first from a hardcoded backup list. If the catalog for a user's sport has zero eligible push/pull, the whole role is silently skipped. | Only 2 `unilateral_push` + 2 `unilateral_pull` rows in DB; no seasonal filter on them so this is currently OK, but the fallback path can leave role gaps and doesn't surface a warning to the user. |
| "Nordic curl in season" | Correctly blocked today (both `IN_SEASON_BLOCKED_SLUGS` and `season_eligibility` exclude in-season). **However** C-6 means a single-sided catalog edit could re-open. | DB rows for nordic_curl, reverse_nordic, plyo_depth_jump, back_squat_double_ecc, copenhagen_adduction_ecc, atg_split_squat, sissy_squat all have `season_eligibility=[os_q1..os_q4]`. |
| "Order is wrong / cards move around" | C-1 duplicates cause `sequence_order` collisions → tie-breaks are non-deterministic between refetches; C-4 banner text does not match JSX render order. | `useWkDailyPrescriptions.ts:250-281` grouping sort. |
| "Kicked out on Video / Calendar / typing in Add Event" | Not in Hammers Today generator scope — already addressed in prior phases via `lazyWithRetry`, `canEvictNow`, `protectedEditing`. Requires further investigation to confirm no new regressions. | Prior phases 55-57. |
| "AI analysis just spinning" | `generate-warmup` has no timeout on the AI call (`supabase/functions/generate-warmup/index.ts:191-306`) but the client hook `useWarmupGenerator.ts` also has no timeout — reachable via `HammerWarmupDialog`. Falls back to hard-coded list on parse failure but not on AI stall. | File as noted. Requires further investigation on the video-analysis surface (separate module). |
| "Add to Game Plan doesn't work" (prior report) | Verified currently wired via `useCustomActivities.createTemplate` (`HammerDailyPlan.tsx:340-417`). No open issue in the reality audit. | File as noted. |

---

## 14. Prioritized Implementation Plan

Ordered by user impact × technical dependency. Every item has a regression risk tier.

1. **[P0, high-impact, low-risk] Kill the duplicate generation.** Fix C-1 by making the auto-generate effect the exclusive responsibility of `HammerDailyPlan` and passing an `autoGenerate={false}` prop to the child cards; or convert `useWkDailyPrescriptions` to guard invocation with a module-level `Map<userId+planDate, Promise>`. Add advisory lock in `wk-generate-daily` before `DELETE`. Verify with the same SQL that produced the 14×4 evidence. Risk: **low** — additive guards.
2. **[P0, high-impact, low-risk] Persist WIC fields to columns.** Fix C-2. The row builder at `wk-generate-daily/index.ts:631-637` spreads `...r`; audit why top-level columns land NULL (either a stale deploy or a serialization strip), add an explicit column mapping, and add a nightly assert (`scripts/audits/wic-audit.ts`) that fails when >0 recent rows are NULL. Risk: **low**.
3. **[P0, high-impact, med-risk] Collapse the dual season/legality gates.** Fix C-6 by removing `IN_SEASON_BLOCKED_SLUGS` and reading `season_eligibility` only, with a migration-verified assertion that no in-season legal slug is `is_eccentric_dominant`. Risk: **med** — need a test suite verifying no regression on any of the 88 catalog rows.
4. **[P1, med-impact, med-risk] Add `warmup` + `movement_prep` engines to WIC.** Move `HammerWarmupDialog`'s AI generator into a WIC engine that writes `slot=warmup` rows to `wk_prescriptions` so warm-up participates in ordering, injury filtering, CNS budget, and the "Why this?" panel. Risk: **med** — new persistence surface.
5. **[P1, med-impact, low-risk] Consume signals the generator already receives but ignores.** `side_hit / side_throw` (server body), `isPracticeDay` (hardcoded false), `practice today` (via `scheduled_practice_sessions`), `equipment` (via envelope), `category_goals` (5-category ranked goals), `anthropometrics`. Each is an isolated read → filter/dose modulation. Risk: **low** if guarded behind feature flag per signal.
6. **[P1, med-impact, low-risk] Ordering determinism.** Compute `sequence_order` from a canonical `(engine, sequence_role)` table so cross-slot order is stable regardless of invocation, and drop the client re-sort. Align the JSX layout with the header banner (or drop the banner). Risk: **low**.
7. **[P1, med-impact, med-risk] Unify Track A + Track B.** Migrate `strength/speed/hitting/throwing/defense/baserunning/recovery/game_iq/fueling` modality builders to WIC engines, or split cleanly so Track B stops re-authoring domains WIC owns. Risk: **med-high** — architectural.
8. **[P2, low-impact, low-risk] Progression path.** Consume `progression_slug` and adherence signals from `wk_session_logs.rpe` + status to graduate the athlete role by role. Requires (5) to have data. Risk: **low**.
9. **[P2, low-impact, low-risk] Coach/medical override role.** Wire `actor_role` beyond `"self"` for coach and clinician-authored overrides; enforce via RLS. Risk: **low**.
10. **[P2, low-impact, low-risk] Catalog depth.** Grow `arm_care` past 2 rows, `trunk_primer` past 2, `trunk_finisher` past 1 to give the "non-negotiable" opener meaningful variety. Risk: **low** — pure content.

---

## Appendix — evidence conventions

- File references use `path/file.ext:line` or `line-range`.
- DB evidence is stamped `Live DB 2026-07-01` and reproduced verbatim.
- Any statement that could not be verified from repository or DB is explicitly marked *requires further investigation* — see §13 rows for video-analysis and kicked-out-on-typing (separate modules).
