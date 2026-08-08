# Elite Speed & Bat-Speed Progression System

Right now both cards frequently show a single, generic item and nothing ties today's work to yesterday's or tomorrow's. Two confirmed causes:

- **Bat speed has no selector engine.** The generator fills only the template's *required* categories (usually one) and never touches the optional ones, so most days produce exactly one movement. Speed does have an engine, but its optional fill is capped by a small CNS budget, so it often lands at 1–2 items.
- **Nothing reads training history.** `wk_session_logs` stores every logged set, load, sprint distance, and bat-speed metric, but the daily generator never queries it. Selection is driven by season phase + day-of-year rotation only — so there is no progression, no re-exposure control, and no "this builds on last week" reasoning.

This plan turns both cards into full, progressive sessions that compound day over day for the athlete's whole career.

## What the athlete will see

Each card becomes a complete session with a named intent, 4–6 sequenced movements, and a visible progression line:

```text
BAT SPEED — Block 2 · Week 3 of 4 (Overload/Underload Contrast)
Goal today: beat 71.4 mph peak (your best 9 days ago)

1  Prime      Banded pelvic dissociation      2 x 8/side
2  Potentiate Trap-bar jump → dry swing        3 x 3
3  Contrast   Overload tee / underload tee     4 x 3 alternating
4  Intent     Radar intent set                 3 x 5 max
5  Transfer   Med-ball side wall toss          3 x 6/side

Why today: Week 3 is the peak week of your contrast block — you added
1.8 mph over Weeks 1–2 with clean bar feel, so intent volume goes up.
Next: Week 4 deloads volume 40% and re-tests peak.
```

Speed gets the same treatment: prep → primer → main quality (accel or max-velocity) → contrast/reactive → decel/CoD, with the day's distance/time target set against the athlete's own logged best.

## How it works

### 1. Bat-speed selector engine (new)
Mirror the existing speed engine as `_shared/wic/engines/batSpeed.ts` selection logic: fill required categories, then fill optional categories in a canonical session order (prime → potentiate → contrast → intent → transfer) up to CNS/PAP budget, with substitution-family de-duplication and a hard minimum of 4 items on full training days (2 on game/recovery days). The generator replaces its inline `pickBatSpeedByCategory` loop with this call.

### 2. Session shape floors for speed
Add explicit minimum shape to the speed engine: never publish fewer than 3 items on a full training day. Raise the block CNS budget for speed days where lifts are secondary, and let low-cost prep/decel items fill outside the primary-quality budget so the quality work is never crowded out.

### 3. Progression state (new module + read path)
A pure `progressionState.ts` derives, from `wk_prescriptions` + `wk_session_logs`:

- current 4-week block index and week-in-block (accumulate → intensify → peak → deload),
- per-movement last exposure date, last load/velocity/time, and completion/RPE trend,
- per-category re-exposure windows so no slug repeats before its window unless it is a deliberate progression re-test,
- a personal-best ledger per tracked metric (bat-speed mph, sprint time/distance, med-ball throw, load).

The generator loads a compact history window (last ~28 days) once and passes it into both selectors.

### 4. Progression rules applied to selection and dosage
- Week 1–3 raise volume/intent inside the same movement family so the athlete measurably progresses the *same* quality; Week 4 deloads and re-tests.
- A movement repeats only when it is the progression vehicle; otherwise the selector rotates within the family for the same adaptation.
- Dosage is written from last logged performance (e.g. sprint distance advances only after a clean prior session; intent sets target last peak + a bounded increment) — never fabricated when history is missing, in which case the card says "baseline session — this sets your reference".

### 5. Why-lineage on the card
Each prescription carries a `progression` payload (block, week, phase-of-block, builds-on, target-vs-best, next-step). `WkSpeedCard` / `WkBatSpeedCard` render a compact header line plus an expandable "Why today · What it builds on · What's next" section, reusing the existing `why_v2` UI patterns.

### 6. Guards
- Validator: fail generation when a full training day publishes fewer than the shape floor for either card, or when a movement repeats inside its re-exposure window without a progression flag.
- A regression script under `scripts/audits/` simulates 60 consecutive days for several athlete archetypes and asserts: no duplicate-day stagnation, block waves advance correctly, deload weeks land, and every day's card has a valid progression lineage.

## Technical notes

- Files touched: `supabase/functions/_shared/wic/engines/batSpeed.ts` (add selector), `.../engines/speed.ts` (shape floors), new `.../wic/progression/progressionState.ts`, `supabase/functions/wk-generate-daily/index.ts` (history load + wiring), `supabase/functions/_shared/wic/validator.ts`, `src/components/hammer/WkSpeedCard.tsx`, `WkBatSpeedCard.tsx`, `WkPrescriptionCard.tsx`.
- No schema change required: progression is derived from existing `wk_prescriptions` and `wk_session_logs`. If the derivation proves too heavy per request, a cached `wk_progression_state` row per athlete can be added later without changing the interface.
- Determinism preserved: all selection stays pure and seeded; history is an input, not a side effect. No AI call is added to daily generation.
- Constitutionally the progression layer is interpretive only — it never authors organism truth, and safety/recovery/medical layers still outrank it.
