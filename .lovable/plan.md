## Goal
Take Game IQ + the broader Hammers Modality system from "Waves 1–2 shipped" to fully elite, zero-hiccups, best-on-market — with progress fully wired, tracked, and learned from.

Each wave ends with a Playwright verification pass against the live preview before the next wave begins.

---

## Wave 3 — Full Playwright regression sweep

Single scripted run under `/tmp/browser/wave3/` covering:

1. Onboarding — 5-category ranked goals → Save & Exit → resume → finish (incl. discipline-specific pitcher/softball branches).
2. Calendar import — paste schedule text → AI extracts → events created with safe `games` defaults → clicking a date does not crash.
3. Today Plan — Add to gameplan, Answer Hammer drawers open + scroll, posture pill reflects upcoming game.
4. Manage Events — cancel + reschedule → posture/daily plan reflect change.
5. IQ daily micro-reps card (Wave 1) → Start reps → SM-2 progress writes back → `behavioral_events` row emitted.
6. Owner Library — create draft → publish → appears in athlete pool next pull.

Capture screenshots per step as audit trail. Fix every surfaced bug before Wave 4. Likely fix surface: any auth-eviction regressions, toolbar overflow, AI analysis timeout under real load.

---

## Wave 4 — Seed C3, C4, C5 (~65 more canonical situations → ~94 total)

- **C3 (~20):** bunt coverages by count/score, squeeze defense (safety vs suicide), drag bunt by LHH/RHH, fake bunt slash, push bunt to 1B side.
- **C4 (~20):** softball-specific — slap (soft/hard/power), short-game DP/Flex rules, re-entry awareness, rise-ball strategy, illegal pitch reactions, drop-third-strike (softball rules), look-back rule.
- **C5 (~25):** pitcher PFP by count, catcher blocking + throwing decisions (pop times, runner leads), pitch-calling logic by count/score/runner, mound visit rules, balk awareness (baseball), illegal pitch (softball), comebackers, 1-3 putouts.

Each sub-wave: seed via `supabase--insert` (situations + actors + variants) → owner library spot-check → quiz smoke test → continue.

---

## Wave 5 — Owner authoring polish

Edit `IqLibrary.tsx` + new helpers:

- Bulk import via JSON paste (validated against canonical schema before insert).
- Duplicate situation action (clone with `(copy)` suffix, status = draft).
- Publish checklist diff view — pre-publish modal showing pass/fail for: all 9 defender Three-B's filled, ≥1 source, ≥2 variants, sport+role tagged, lens tags present.
- Soft-delete + restore (add `deleted_at` filter to existing list query; restore action; never hard-delete published canonical rows).

Verify via Playwright as owner: bulk-import 5 → duplicate one → run publish checklist → soft-delete + restore.

---

## Wave 6 — Progress wiring, tracking, learning

- Extend `correlations.ts` whitelist with `iq_mastery` signal (sources from `iq_user_progress` aggregate).
- New "IQ Insight" card on Progress Landing: weakest lens category + recommended focus (links into `GameIqReview?lens=…`).
- Update `dailyPlan.ts` `game_iq` builder to up-weight situations from the athlete's weakest lens (closes the learning loop).
- Owner dashboard: "Library health" tile — total published, draft backlog, athlete mastery distribution per situation (identifies weak/broken scenarios via low-mastery cluster).

Verify: full Playwright pass repeats Wave 3 + checks correlations populate after seeded attempts + library health tile renders.

---

## Wave 7 — Final E2E certification

One uninterrupted Playwright run:

1. New athlete signs up → onboarding (incl. ranked goals + pitcher branch).
2. Imports schedule (text + image).
3. Simulate 7 days of Today Plan completions + IQ reps + a posture-changing canceled game.
4. Progress dashboard shows ≥1 correlation card with `n ≥ MIN_SAMPLES`.
5. Owner adds a new situation → athlete sees it the next day.

Fix anything that surfaces. Produce a short pass/fail-per-surface "elite readiness" report at `docs/asb/elite-readiness-wave7.md` as the shipping artifact.

---

## Technical notes

- No schema changes expected. Wave 6 may add a tiny `iq_weekly_insights` materialization only if correlations need it — flagged at that point.
- All DB writes via `supabase--insert`; all edits additive and replay-safe per organism doctrine.
- Each wave is independently shippable.
- Stop points are explicit between waves so you can halt after any wave with a strictly better system.

```text
Wave 3 ──► Wave 4 ──► Wave 5 ──► Wave 6 ──► Wave 7
 regress    C3–C5     authoring    learning    final
  sweep    content     polish        loop      E2E cert
```
