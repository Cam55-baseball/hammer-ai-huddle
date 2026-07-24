# Huangdi Neijing Su Wen Integration Plan

## Goal
Fold the Su Wen holistic philosophy — seasonal adaptation, Yin-Yang balance, Qi/energy flow, prevention-first recovery, and lifestyle harmony — into Hammers Modality as a single interpretive layer. It must ride the existing Hammers Today Plan pipeline and Command Center signals without adding duplicate cards, parallel storage, or new user-facing modules.

## Chosen approach
- **Terminology**: blend modern sports science with concise Neijing explanations (e.g., "circulate blood and Qi before intent").
- **Scope**: all baseball/softball positions, served through the existing context envelope.
- **Level**: first version targets serious developing athletes, with cues simple enough for youth and deep enough for elite users.
- **First milestone**: Daily Plan Intelligence Layer — the surface every athlete already opens every day.

---

## Phase 1 — Seasonal Philosophy Overlay for Hammers Today Plan

Extend the existing seasonal authority so every phase carries a Su Wen "performance climate" in addition to the current programming clamps.

1. **Extend `src/lib/seasonPhase.ts`**
   - Add narrative fields to `SeasonProgrammingProfile`:
     - `element` (Wood/Fire/Earth/Metal/Water) + `elementQuality` text
     - `organEmphasis` (e.g., Liver/Wood for flexibility/planning, Kidney/Water for stamina/fear response)
     - `qiDirective` (what the phase asks the athlete to cultivate)
     - `yinYangEmphasis` (e.g., "Yang rising" or "Yin restoration")
     - `seasonalAdaptation` (practical climate/food/clothing notes)
   - Populate `SEASON_PROFILES` with authentic, accessible framing for each of the four phases.

2. **Thread narrative into `src/lib/hammer/prescription/dailyPlan.ts`**
   - Warm-up block: `roadmapReason` and `why` include the seasonal Qi directive (e.g., off-season = "Yang rising — build the engine with honest movement before adding load").
   - Recovery block: blend modern parasympathetic downshift with Yin restoration language and seasonal notes.
   - Fueling block: add seasonal food/thermal guidance (e.g., warming foods in cold, cooling foods in heat) as a `DrillStep` or cue.

3. **Update `src/components/hammer/DailyIntentHeader.tsx`**
   - If seasonal data is present, prepend the daily intent headline with the phase's element/quality (e.g., "In-Season Metal phase — preserve sharpness, protect freshness").
   - Keep the existing mentor voice and streak/rotation logic untouched.

## Phase 2 — Human Performance Intelligence (HPI) Signal

Compute a lightweight, read-only HPI score from the existing canonical data and surface it as "Today's Focus" inside the Today Plan.

1. **Derive HPI in `src/lib/hammer/context/athleteContext.ts`**
   - Inputs: latest HIE readiness, `wk_recovery_acks` trend, sleep hours, hydration log, 7-day workload, current season phase.
   - Output: `{ score: 0-100, focus: string, balance: "yang-heavy" | "yin-heavy" | "balanced" | null, why: string }`.
   - No new DB table — computed at read-time from existing tables.

2. **Surface in `DailyIntentHeader`**
   - Add a "Today's Focus" line below the headline: score, balance state, and one actionable insight (e.g., "Yang-heavy week — prioritize the breathing block").

3. **Use HPI to bias existing blocks in `dailyPlan.ts`**
   - If balance is "yang-heavy" → expand recovery breathing dose, reduce optional high-CNS blocks.
   - If balance is "yin-heavy" (low readiness) → front-load movement and circulation work, keep skill work light.
   - Keep all changes inside the existing block logic; no new cards.

## Phase 3 — Seasonal Wisdom & Breathing Micro-Doses

Add small, coach-educational touches that explain why the plan is structured the way it is.

1. **Extend `DailyTipHero.tsx` / tip system**
   - Add a `seasonal` tip category with 10–15 Neijing-based tips (e.g., "Summer Yang peak — front-load intense work, cool down with hydrating foods").
   - Reuse the existing `get-daily-tip` edge function and `nutrition_daily_tips` table structure.

2. **Add breathing/mindfulness micro-doses**
   - In `dailyPlan.ts` recovery block, include a season-aware breathing drill (e.g., long exhales for down-regulation, box breathing before a game).
   - In warm-up block on low-readiness days, add a 60-second "breath-first" primer step.

3. **Inline "Why this works" tooltips**
   - Add short Su Wen-style explanations to the existing movement guide for warm-up and recovery drills (e.g., "Hip CARs open the Liver/Wood channel so rotation flows").

4. **Backend mirror & tests**
   - Mirror `SEASON_PROFILES` changes in `supabase/functions/_shared/seasonPhase.ts` so edge functions and frontend stay in lockstep.
   - Add regression tests in `src/test/seasonPhase.test.ts` verifying the new narrative fields are populated and do not break existing clamps.

---

## Out of scope (for now)
- New dashboard page or dedicated HPI tab — would duplicate Command Center signals.
- New onboarding questionnaire — can be added later if the HPI data proves useful, but the first version derives everything from existing context.
- Wearable integrations — uses existing HIE/wearable data if present; does not add new integrations.
- Literal TCM therapies (acupuncture, herbs) — app stays within education, self-massage, breathing, and recovery guidance.

## Success criteria
- Hammers Today Plan opens without new cards and shows season-aware, readiness-aware language.
- Warm-up, recovery, and fueling blocks reference the seasonal Neijing framing in their `why` or `roadmapReason`.
- `DailyIntentHeader` displays a "Today's Focus" line with a derived HPI signal.
- No duplicate cards, no duplicate DB tables, and no parallel storage.