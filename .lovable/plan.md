## Elite Roadmap & Recovery-Window System

### The vision, in plain terms
Every athlete's daily plan becomes a **rung on a long ladder** whose top is the real-world elite standard: **6 high-level games per week** (MLB for baseball, AUSL for softball). Where each athlete starts on the ladder is decided by training age + season quarter + injury/safety floors. Then a **timestamp-aware recovery clock** (24/48/72/96h) decides whether today's lift, speed, or bat-speed attempt is actually safe to run at full intensity, or must be trimmed, or must roll to a later day. Throwing gets its own build ladder that tells the athlete exactly how many throws to make today on the road to a season-ready arm.

Nothing is invented — every rule is anchored to real signals we already collect: training age, season phase, weekly availability, injury restrictions, side, and completion timestamps.

---

### 1. Elite Target Model (new)
`src/lib/hammer/roadmap/eliteTarget.ts`
- Defines the endpoint capacity per sport: MLB / AUSL 6-game weeks + supporting lift, throw, speed and bat-speed volumes.
- Pure data — no I/O. Used as the "north star" the mesocycle ladder builds toward.

### 2. Roadmap Ladder (new)
`src/lib/hammer/roadmap/roadmapLadder.ts`
Five rungs, resolved from `training_age` + `season_phase` + `weeklyAvailabilityDays`:
1. **Foundation** — beginner / <1yr lifting age → motor learning, low volume ceilings.
2. **Build** — developing → capacity build, primary CNS work 2x/wk.
3. **Bridge** — intermediate → matches full off-season 5-day template.
4. **Peak** — advanced/elite → matches 6-day elite template, near-target volumes.
5. **Sustain** — professional / in-season elite → preservation with sharpness.

Output: `{ rung, nextRung, promotionCriteria, volumeCeilings, description }`. Pure, replay-safe, missingness-permissive.

### 3. Season Quarter Mesocycles (new)
`src/lib/hammer/roadmap/seasonQuarters.ts`
Splits each `season_phase` into **Q1–Q4** (weeks since phase started, from `athlete_mpi_settings.phase_started_at`):
- Off-season: Q1 hypertrophy → Q2 strength → Q3 power → Q4 taper-in.
- Pre-season: Q1 velocity build → Q2 skill density → Q3 game readiness → Q4 competition primer.
- In-season: Q1 heavy maintenance → Q2 sharpness → Q3 game preservation → Q4 playoff peaking.
- Post-season: Q1 unload → Q2 restoration → Q3 movement quality → Q4 base rebuild.

Each quarter tightens or loosens the recovery windows and dosage caps.

### 4. Recovery Window Enforcer (new — the 24/48/72/96h rule)
`src/lib/hammer/roadmap/recoveryWindows.ts` + reads from `hammer_daily_task_completions`.
Per (modality, training-age, quarter) matrix:

```text
Modality        Foundation   Build   Bridge   Peak   Sustain
Heavy lift      96h          72h     72h      48h    48h
Max-velocity    72h          72h     48h      48h    48h
Bat speed max   72h          48h     48h      24h    24h  (side-independent)
Throwing max-i  96h          72h     48h      48h    48h  (side-independent)
```

Behaviour when today is inside the window since last completion:
- >75% of window remaining → **off** (roll to earliest legal day, show "Available Thu 6am")
- 25–75% remaining → **activation** (~30%)
- <25% remaining → **secondary** (~60%)

Runs as a second post-processor after `applyMicrocycle` inside `dailyPlan.ts`. Uses the already-existing side-aware completion keys so a switch hitter's L attempt does not gate their R attempt.

### 5. Throwing Volume Ladder (new)
`src/lib/hammer/roadmap/throwingLadder.ts`
Prescribes `throws_today` and `max_intent_percent` per (rung, quarter, position, days-into-ramp).
Example ladder for a Bridge pitcher entering pre-season Q1: 25 → 35 → 45 throws over 3 weeks, capped at 70% intent, before earning long-toss and pulldowns. Non-pitcher position players get a shorter ladder capped at position demand.

Injects into the throwing block as `dosage_string: "Throw 45 today · 70% intent · long-toss unlocked at week 4"` and stamps `throwLadder` into `why_payload`.

### 6. `dailyPlan.ts` wiring (edit, minimal)
- After `applyMicrocycle`: call `applyRecoveryWindows` and `applyThrowingLadder`.
- Stamp `roadmap: { rung, quarter, nextRung, promotionCriteria }` into plan-level metadata so the UI can render "You're on Rung 3 of 5 — 4 sessions from Peak."

### 7. UI surfaces (thin additions)
- `WeeklyRoadmapStrip.tsx`: add a leading rung badge ("Bridge · Off-season Q2") and, for gated modalities, a small chip "Lift returns Thu 6am."
- `WkPrescriptionCard.tsx`: when a card is trimmed by the recovery clock, show a one-line rationale ("Heavy lower 41h ago — today runs at 60% by the 72h rule for your training age").
- New `RoadmapExplainerSheet.tsx` opened from the header rung badge — one screen, no navigation churn: shows the 5-rung ladder, current position, next promotion criteria, and the elite target.

### 8. Safety floors (unchanged, still supreme)
Injury restrictions, parent-supremacy holds, youth caps, and readiness deload continue to run **before** the roadmap logic. The roadmap can only trim or delay — it can never promote a suppressed block back to `ready`.

---

### Files touched

**New**
- `src/lib/hammer/roadmap/eliteTarget.ts`
- `src/lib/hammer/roadmap/roadmapLadder.ts`
- `src/lib/hammer/roadmap/seasonQuarters.ts`
- `src/lib/hammer/roadmap/recoveryWindows.ts`
- `src/lib/hammer/roadmap/throwingLadder.ts`
- `src/components/hammer/RoadmapExplainerSheet.tsx`
- Unit tests: `roadmapLadder.test.ts`, `recoveryWindows.test.ts`, `throwingLadder.test.ts`

**Edited (small, additive)**
- `src/lib/hammer/prescription/dailyPlan.ts` — two new post-processors + metadata stamp
- `src/lib/hammer/prescription/throwingSelector.ts` — accept ladder dosage
- `src/components/hammer/WeeklyRoadmapStrip.tsx` — rung badge + return-chip
- `src/components/hammer/WkPrescriptionCard.tsx` — trimmed-by-recovery rationale line

**Untouched**
- Auth, database schema (uses existing `hammer_daily_task_completions` and `athlete_mpi_settings`), all engines that already respect `intensity`/`scheduled`.

### Technical notes
- All new modules are pure functions with `today: Date` injected — replay-safe.
- Recovery-window reads: single query fanned in via existing `useHammerDailyTasks` cache; no new network chatter on the plan render path.
- Every rule stamps its rationale into `why_payload` so the "Why?" drawer on each card already surfaces it.
- No new tables needed. If we later want persistent rung history, an additive `athlete_roadmap_rung_history` table can be layered on without changing the engine contract.
