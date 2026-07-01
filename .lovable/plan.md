
# Elite Lifts Rebuild — no drift, no repeats, personalized for eternity

## 1. Fix the "same exercise 3 times" bug (root cause)

`wk-generate-daily` currently draws movements per `sequence_role` from a small pool without dedupe or cross-day memory, so short catalogs collapse to the same lift repeatedly.

- Add **session dedupe**: no movement ID may appear twice inside one day's prescription. Post-selection pass re-rolls duplicates against the remaining pool; if pool exhausted, fall back to the next-best variant in the same movement family.
- Add **72h non-repeat memory** for `slot='lift'` compound movements. Read `wk_prescriptions` for the last 3 days; exclude any compound movement_id already used. Supplemental has a 48h cool-down.
- Add **weekly family cap**: each compound family (squat/hinge/press/pull) rotates through at least 2 distinct variants per week.
- Deterministic seed = `user_id + iso_date + engine_version` so replay stays lineage-safe.

## 2. Personalization inputs — always honored

Generator reads (fail-visible, missingness preserved — never silently defaults):

- **Training age** (`profiles.training_age_years`) → default recovery window.
- **CNS ledger** (`wk_cns_ledger`) → dynamic extension of window when fatigued (adds 24h per +2 CNS above baseline).
- **Season phase** (`wk_periodization_blocks` + season dates) → OS Q1–Q4 / pre / in-season / taper / post / playoffs.
- **Anthro archetype** (`strengthSelector.ts`) → squat/hinge/press/pull variant bias.
- **Discipline goals** (pitcher/hitter/two-way, softball vs baseball, ranked category goals) → arm-care depth, rotational vs linear power, unilateral emphasis.
- **Injury / RTP / illness / game-today** → hard suppress + variant swap.
- **1RM map** → % load prescription per compound.
- **User goals** (explosive-first, longevity-first, hypertrophy accessory) → biases block count and intensity within the phase envelope.

Missing input → block with a visible "Complete onboarding to unlock personalization" chip, never a silent default.

## 3. Recovery windows (tiered + dynamic CNS)

| Training age | Default compound window | Weekly lift days (OS) | In-season |
|---|---|---|---|
| <1 yr (novice) | 96h | 1 every 4 days | 1 primer/wk |
| 1–3 yr (int)   | 72h | 2/wk | 2 primers/wk |
| 3+ yr (adv)    | 48h | 3/wk | 2 primers/wk |

Dynamic override: CNS score ≥ 7 in last 24h extends the window by +24h; recovery ack drops the extension for 48h. Speed sessions can be scheduled more frequently as short high-quality doses when the calendar allows and CNS permits.

## 4. Lift-day scheduling

- **Auto default** by phase + training age respecting recovery windows and game/practice calendar.
- **User override** in Settings → "Preferred lift days" honored when it doesn't violate the recovery window; violations render as a visible warning, never silent.
- Lift day always sequences: **Warm-up → Speed/Bat-Speed → Lifts → Practice/Game → Conditioning → Crossover sport work**. Non-lift days show only what's actually scheduled — no empty lift card.

## 5. Elite exercise catalog (compound / supplemental / OS-only / arm care)

Rebuild `wk_movement_catalog` with an auditable, philosophy-tagged library drawing from Heenan, McGinty/Pow3rPlus, Westside, GOATA, Summers Method, Marinovich, Cressey — plus foundational barbell staples. Every entry carries: `family`, `pattern`, `intensity_class`, `cns_cost`, `phase_allow[]`, `contraindications[]`, `source_philosophy`, `evidence_note`.

- **Compound (year-round, phase-modulated load)**: Trap-Bar DL, Front Squat, Safety-Bar Box Squat, Bench, Weighted Pull-Up, SL RDL, Hip Thrust, Landmine Press, Cressey Bowler Squat, Westside Box Squat (OS).
- **Supplemental (year-round safe, concentric/iso-dominant)**: SA DB Press, Chest-Supp Row, KOT Lunge, B-Stance RDL, Cable Hip Flexor, Waiter Carry, Renegade Row, Landmine Row-to-Press, Slide Lunge, Heavy Russian Twist, Trap-Bar Trunk Twist, GOATA linear step-ups, McGinty rotational med-ball.
- **OS-only (eccentric / max-effort / high soreness)**: Nordic Curl, Copenhagen Adduction (eccentric), Depth Drop, loaded eccentric ATG Split Squat, Overcoming Iso Max, Heavy Negatives, Westside ME singles, Marinovich reactive eccentrics.
- **Arm care (every session, non-negotiable)**: Crossover Symmetry full, JBand chart, Scap CARs, Cressey Manual Cuff series.

## 6. In-season contraindication — hard block

OS-only bucket is hard-blocked from **10 days before first regular-season game through the last game of the season**. Generator refuses to select them; if a coach/user has an override token, single session unlock is allowed (see §7). Otherwise, replaced with the nearest safe supplemental in the same pattern.

## 7. Coach / athlete override (gated, logged)

- New table `wk_movement_overrides` (user_id, movement_id, ack_date, reason text, actor_role, expires_at).
- Override unlocks a blocked movement for **one session only**, requires reason string, auto-expires end-of-day, and writes an `asb_events` lineage row so replay preserves the decision.
- UI: "Request override" button on any blocked movement card.

## 8. Card structure (no more merged card)

Already split into Speed & Bat-Speed / Lifts / Conditioning / Sport in the last pass. This plan fixes the *content* of the Lifts card and its scheduling logic. Sequence enforced in `HammerDailyPlan.tsx` render order.

## 9. Drift guards (no eternity drift)

- Unit tests: dedupe within session, 72h non-repeat, in-season Nordic block, training-age window mapping, sequencing order.
- Replay test: same seed + same inputs → identical prescription.
- Lint script `scripts/check-no-inseason-eccentric.ts` fails CI if OS-only movement is ever emitted with `phase='in_season'`.
- Every generator run writes `wk_prescriptions.rationale` explaining WHY each movement was chosen (phase, window, anthro, goal, CNS).

## Technical touch-points

- **Migration**: add `wk_movement_overrides` table + grants; add columns to `wk_movement_catalog` (`family`, `intensity_class`, `cns_cost`, `phase_allow`, `contraindications`, `source_philosophy`); seed elite catalog.
- **Edge fn `wk-generate-daily`**: rewrite selection pipeline (phase → training age → recovery window → anthro bias → goal bias → dedupe → 72h memory → weekly family cap → rationale write).
- **Hook `useWkDailyPrescriptions.ts`**: expose `overrideMovement(id, reason)`.
- **`WkLiftsCard.tsx`**: render "why this movement" chip, override button on blocked items, warning banner when user-chosen day violates recovery window.
- **Settings**: "Preferred lift days" picker.
- **Tests**: `wkGenerator.dedupe.test.ts`, `wkGenerator.inseasonBlock.test.ts`, `wkGenerator.recoveryWindow.test.ts`.

Approve and I'll execute end-to-end.
