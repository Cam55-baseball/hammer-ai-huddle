## Goal
Take Game IQ + recent fixes from "deeply built" to "elite, zero-hiccups, best-on-market," with progress fully tracked, wired, and learned from across the system.

Work proceeds in strict sequential waves. Each wave ends with a Playwright verification pass against the live preview before the next wave starts.

---

## Wave 1 — Daily IQ micro-reps wired into `dailyPlan.ts`

Goal: Game IQ stops being a side module and shows up in every athlete's daily plan as 2–4 minute micro-reps.

- Extend `src/lib/hammer/dailyPlan.ts`:
  - New block type `iq_micro_reps` (2–4 scenarios, ~3 min).
  - Selection rule: pull from `iq_user_progress` using SM-2 due-date, filtered by athlete's discipline (baseball/softball), role (pitcher / position / two-way → both), and current `SchedulePosture` (game day → defensive-positioning + situational awareness only, no heavy cognitive load; taper → light; normal → full mix).
  - Respect ranked category goals — pitchers get pitcher situations weighted higher, hitters get offense/baserunning weighted higher.
- Add `iq_micro_reps` rendering to `HammerDailyPlan.tsx` as a first-class card with "Start reps" → routes to `IqScenarioRunner` in quick-rep mode (no full module shell).
- Write completions back to `iq_user_progress` (SM-2 update) AND emit a `behavioral_events` row so Progress Dashboard correlations can learn from IQ performance vs. workload/readiness.
- Add IQ stats to Progress Dashboard "Goals" topic: due count, mastery %, streak, weakest situation category.

Verify: Playwright opens Today Plan → IQ card appears → completes reps → confirms SM-2 record updated + progress dashboard reflects it.

---

## Wave 2 — Seed Wave C2 (~15 situations)

Themes: pickoffs, rundowns, cutoffs/relays by hit location, 1st-and-3rd permutations.

- Author 15 canonical situations across both sports with full Three-B's actor matrices, count/outs/runner variants, and sources.
- Use existing `iq_situations` + `iq_situation_actors` + `iq_situation_variants` tables via `supabase--insert`.
- Auto-publish (status = `published`, `is_canonical = true`).

Verify: Owner Library lists 29 published; quiz runner serves new situations; Playwright runs 3 random C2 scenarios end-to-end.

---

## Wave 3 — Full Playwright regression sweep

Single scripted run covering:
1. Onboarding (5-category goals → Save & Exit → resume → finish).
2. Calendar import (paste schedule text → AI extracts → events created with safe defaults → no crash on date click).
3. Today Plan (Add to gameplan, Answer Hammer, posture pill reflects upcoming game).
4. Manage Events (cancel + reschedule → reflected in posture).
5. IQ quiz (daily micro-reps from Wave 1 + canonical scenarios from Wave 2).
6. Owner Library (create draft situation, publish, verify it appears in athlete pool).

Fix every surfaced bug before Wave 4. Capture screenshots per step as audit trail.

---

## Wave 4 — Waves C3, C4, C5 (Game IQ content to ~80–120)

- **C3 (~20):** bunt coverages by count/score, squeeze defense variants, safety vs suicide, drag bunt by LHH/RHH.
- **C4 (~20):** softball-specific — slap (soft/hard/power), short game, rise-ball strategy, illegal pitch reactions, DP/Flex rules, re-entry awareness.
- **C5 (~25):** pitcher PFP by count, catcher blocking + throwing decisions (pop times, runner leads), pitch-calling logic by count/score/runner, mound visit rules, balk awareness (baseball), illegal pitch (softball).

Each wave: seed → owner library spot-check → quiz smoke test → commit.

Target total at end of C5: ~94 canonical situations × variant generator → effectively unlimited reps.

---

## Wave 5 — Owner authoring polish

- Bulk import (CSV / JSON paste) in `IqLibrary.tsx`.
- Duplicate situation action (clone with `(copy)` suffix, status = draft).
- Publish checklist diff view: before publishing, show side-by-side of canonical-quality checks (all three B's filled, ≥1 source, ≥2 variants, sport+role tagged) with pass/fail.
- Soft-delete + restore for situations.

Verify: Playwright as owner — bulk import 5 situations, duplicate one, run publish checklist, restore a deleted one.

---

## Wave 6 — Progress wiring, tracking, learning

- IQ performance feeds `correlations.ts` as a trusted signal (IQ mastery vs. game-day readiness, vs. workload, vs. sleep).
- Weekly "IQ Insight" card on Progress Landing: weakest category + recommended focus.
- Hammer Daily Plan reads IQ weakness signals to up-weight micro-rep selection (closes the learning loop).
- Owner dashboard gets "Library health" tile: total published, draft backlog, athlete mastery distribution per situation (identifies weak/broken scenarios).

Verify: full Playwright pass repeats Wave 3 flow + checks correlations + library health tile populates.

---

## Wave 7 — Final E2E certification

- One uninterrupted Playwright run: new athlete signs up → onboarding → imports schedule → 7 simulated days of Today Plan + IQ reps + posture changes → progress dashboard shows correlations → owner adds a new situation → athlete sees it next day.
- Fix anything that surfaces.
- Produce a short "elite readiness" report (pass/fail per surface) as the shipping artifact.

---

## Technical notes

- All DB inserts via `supabase--insert`; no schema changes expected (existing IQ tables cover everything). Only Wave 6 may add a small `iq_weekly_insights` materialization if correlations need it — flagged then.
- All edits stay additive and replay-safe per existing organism doctrine.
- Each wave is independently shippable; user can stop after any wave and still have a strictly better system.
