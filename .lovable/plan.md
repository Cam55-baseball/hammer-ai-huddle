# Hammer Workout & Speed — Elite Personalization Overhaul

## Goal

Make every Lift and Speed prescription on Hammer's Today Plan elite, personalized, phase-aware, sport-aware, CNS-safe, injury-aware, and fully explainable — for users from youth prospects to MLB/AUSL pros. Every prescription must justify itself with reason and expected result.

---

## 1. Periodization backbone — 4-quarter model, auto-sliced from Season Dates

Engine derives the user's current phase quarter from their Season Dates (preseason/in-season/postseason) and offseason length:


| Phase                         | Compound lift style                                                     | Supplementals (pre-practice)      | Speed cadence | Cross-sport         |
| ----------------------------- | ----------------------------------------------------------------------- | --------------------------------- | ------------- | ------------------- |
| **OS Q1**                     | Double-weighted eccentric dominant compounds                            | KOT full-ROM supplementals        | every 48h     | post-practice daily |
| **OS Q2**                     | Double-weighted eccentric dominant compounds                            | KOT supplementals                 | every 48h     | post-practice daily |
| **OS Q3–Q4**                  | Eccentric dominant -based compounds                                     | Functional Patterning             | every 72h     | post-practice daily |
| **In-season (Spring → Post)** | Concentric dominant -based compounds (strength primer, not hypertrophy) | Functional Patterning pre-pregame | every 96h     | daily               |


**Compound dosing rule (locked):** 2–5 sets × 2–5 reps; in-season skews to the low end (strength maintenance, not muscle building). Supplemental dosing is engine-determined per user with elite reasoning attached.

**Owner/Coach editor:** an admin panel (`/admin/periodization`) lets the owner tune lifts, frequencies, and supplemental selections per phase without code edits. Defaults ship as the model above.

---

## 2. Personalization inputs (all required to unlock full engine)

- Chronological age + years lifting (training age)
- Competition level (existing 6U → Pro picker)
- **Pro/Prospect flag** (unlocks higher volume ceilings + true double-eccentrics + advanced FP)
- Estimated 1RM or recent top sets on squat/hinge/press/pull (optional; auto-prescribes % loads + tempo when present)
- Side context (L/R), sport (Baseball/Softball), discipline (hitter/pitcher/two-way), primary position
- Injury intake (from existing `reportInjury` flow) — drives substitutions
- Daily: sleep, CNS readiness, soreness, mood (existing daily log)
- Environment: heat index from Weather module

**Pace doctrine:** walk users to greatness at their own pace; never accelerate past safe progression criteria; never hold a ready user back. Progression gates are explicit (e.g. "unlock depth jumps after 4 weeks of clean low-box landings").

---

## 3. Movement libraries (seeded, each entry = cue + why-prescribed + contraindications + demo slot + regression/progression)

- **Compound lifts** — back squat, front squat, trap-bar DL, RDL, hip thrust, bench, incline, weighted pull-up, push press; double-eccentric and concentric-only variants
- **Knees Over Toes supplementals** — ATG split squat, Poliquin step-up, reverse Nordic, tibialis raise, sissy squat, full-ROM calf, FHL/peroneal, KOT sled drags
- **Functional Patterning supplementals** — FRC CARs, 90/90 transitions, FP arm-line + leg-line spirals, contralateral cross-crawl, deep-squat breathing, hanging brachiation
- **Bat-speed / rotational power** — overload/underload bat, med-ball rotational throws (shot-put + scoop), band-resisted swings, plyo-ball pitching variants, cable chops, paloffs

---

## 4. Speed Lab — sport-split with cross-modality CNS cap

Library: acceleration (10–30y), max-velocity flys (20y), resisted sled (≤10% BW), overspeed (downhill/band-assist), plyometric ladder (low → depth jumps gated by readiness), reactive starts.

- **Baseball default:** lateral first-step + 90ft repeatability
- **Softball default:** 43ft accel + slap-runner crossover starts
- **CNS cap:** total high-CNS units per day is capped across speed + bat-speed + plyo + sprint work. When the user has a heavy bat-speed day, sprint volume drops automatically (and explains why).

Frequency follows phase table (q48/72/96h) and is re-paced when CNS readiness drops.

---

## 5. Bat-speed / Speed-before-lifts sequencing

- **Smart default:** bat-speed and speed work go BEFORE lifts (preserves the CNS targets that drive bat speed and sprint output)
- **Per-day toggle:** user can reorder; engine warns and shows the tradeoff
- Lifts get auto-clamped if the pre-lift CNS work was heavy

---

## 6. Sport-specific conditioning (the part you called out)

Primary conditioning is built around what makes in-season hard: sitting between innings and re-firing.

- **Inning-restart intervals:** sit 3–5 min → explosive 90ft (BB) / 60ft (SB) sprint × 9 "innings" simulation
- **Bases repeatability:** 1st→3rd, home→2nd, first-step jumps off the bag
- **Position-specific:** catcher up/downs, OF read-and-go, IF lateral repeatability, P field-and-cover, MIF turn-and-fire
- **Heat/CNS aware:** Weather module heat index + sleep/CNS auto-dials volume; user gets an alert: *"Volume reduced today because [heat index 97°F + 5h sleep]. Step up recovery — Hammer can't take the fall for under-recovery. You are responsible."* + an "I will recover" ack
- Aerobic work is recovery-only, never the headline

---

## 7. Explainability + safety scaffolding (on every prescription)

Every Lift and Speed card shows:

1. **Phase quarter** (e.g. "OS Q3 — Eccentric Compound block, week 2 of 6")
2. **Why this lift today** (e.g. "Trap-bar DL chosen over back squat — your reported knee tweak + softball catcher pattern")
3. **Training-age reasoning** ("5+ yrs lifting → true double-eccentric unlocked")
4. **CNS load estimate** ("High — counts as 2 of your 3 CNS units today")
5. **Skill-goal correlation** ("Drives Power #1 goal: rotational med-ball + hip-thrust → exit-velo proxy")
6. **"Why reduced?" card** when engine clamps volume (sleep, CNS, heat, in-season game today)
7. **Recovery-responsibility ack** when reduction triggers
8. **Injury-aware swap** — reads `user_injury_progress`, removes contraindicated movements, substitutes a labeled regression ("Substituted: ATG split squat → Bulgarian split squat with reduced ROM because of your reported left ankle.")

---

## 8. Plan-vs-reality learning loop

- After each session, user logs RPE/completed reps/bar feel
- Engine adjusts next session's % loads, sets, and tempo (within phase rules)
- All adjustments are lineage-visible in a "Why this changed" trace

---

## 9. Bug & fragment audit (full-app sweep)

- Hammer Today Plan → workout buttons E2E (open, log, complete, persist)
- Side Context propagation through all new prescriptions
- Season Dates → phase quarter detection edge cases (mid-phase signups, missing dates)
- Recovery override + injury substitution paths
- CNS cap math when bat-speed + speed + lift collide same day
- Owner periodization editor write/read with RLS
- `tsgo --noEmit` + `scripts/check-eternity-guards.sh` + `scripts/preflight.sh` clean

---

## Technical implementation

**New tables (RLS + GRANTs per platform policy):**

- `wk_periodization_blocks` — owner-editable phase blocks (lift style, supplementals, frequencies)
- `wk_movement_catalog` — compound/KOT/FP/bat-speed entries with cue, contraindications, regression/progression
- `wk_prescriptions` — per-user per-day generated lift/speed/conditioning items with full lineage payload
- `wk_session_logs` — completed reps/RPE/notes
- `wk_cns_ledger` — daily CNS-unit accounting across speed + bat-speed + lifts
- `wk_recovery_acks` — recovery-responsibility acknowledgments

**New edge functions:**

- `wk-generate-daily` — orchestrates phase → catalog → injury filter → CNS cap → explainability payload
- `wk-progression-tick` — nightly job that advances/holds users on progression ladders based on log history

**Frontend:**

- Upgrade `HammerDailyPlan` Lifts + Speed cards to render full transparency payload
- New `PrescriptionCard` component (phase chip, why, CNS bar, swap badge, ack button)
- `RecoveryAckDrawer` when reductions trigger
- Sequence toggle (bat-speed/speed-first vs lifts-first) on the day strip
- `/admin/periodization` editor page (owner role only)
- `WhyReducedSheet`, `WhySubstitutedSheet` explainability sheets

**Engine integrations:** Side Context, Season Dates, Weather, Daily Log, Injury Intake, Skill Goals, GP (game-day suppression already exists via `applyScheduleModulation`).

**Validation gates before "release ready":**

- `tsgo --noEmit` clean
- `check-eternity-guards.sh` PASS
- E2E Playwright: generate plan → see transparency → toggle sequence → trigger CNS clamp → ack recovery → log session → verify next-day adaptation
- Fixture test: each phase quarter produces lifts that obey 2–5×2–5 compound rule and matching supplementals
- Injury substitution test: seeded injury → contraindicated lift never appears