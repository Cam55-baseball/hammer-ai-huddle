# Elite Defensive Drills — Expansion, Clarity Rewrite & Position Cleanup

Three coordinated fixes to bring the defensive drill library to pro standard.

## 1. Position filter cleanup (Drill Library UI)

The chip row on `/drill-library` renders whatever raw `position` strings exist on drill rows in `drill_positions`, so both `2B` and `second_base` (and `SS`/`shortstop`, `1B`/`first_base`, etc.) show up as separate chips. Same problem in any position-picker that reads drill data directly.

- Normalize every stored `drill_positions.position` value in the DB to the canonical short code set already used everywhere else in the app (`P, C, 1B, 2B, 3B, SS, LF, CF, RF, IF, OF, MI, CI`). Migration converts `second_base → 2B`, `shortstop → SS`, `first_base → 1B`, `third_base → 3B`, `pitcher → P`, `catcher → C`, `left_field → LF`, `center_field → CF`, `right_field → RF`, `middle_infield → MI`, `corner_infield → CI`, `infield → IF`, `outfield → OF`, dedupes resulting duplicates.
- Add a shared `src/lib/drills/positionLabels.ts` with `normalizePositionCode()` + `positionLabel()` so any legacy row that slips in still renders as one canonical chip with a full label ("2B — Second Base").
- Update `DrillLibraryPlayer.tsx` chips to use `positionLabel(pos)` and render short code + name (single chip per position, no duplicates).
- Sort chips in scorecard order: P, C, 1B, 2B, 3B, SS, LF, CF, RF, plus IF/OF/MI/CI groupings at the end.

## 2. Rewrite all defensive drill explanations for clarity

Every existing defensive drill in `drills` gets its `description`, `instructions`, and coach-facing markdown normalized to the same clear elite structure so pros stop complaining about vague copy:

- **What it trains** (1 sentence, plain language)
- **Setup** (equipment + spacing, bulleted)
- **Execution** (numbered steps, one action per step)
- **Elite cues** (3–5 bullets, athlete-facing verbs)
- **Common mistakes** (3 bullets)
- **Success markers** (measurable — reps, time, %, feel)
- **Progressions / regressions**

Applied via a data migration that rewrites every `drills` row where `category` is defense/fielding/catching/throwing or where `positions` includes any defensive code. No drills deleted — copy only.

## 3. Expand the elite defensive drill catalog

Seed ~60 new pro-grade defensive drills spanning every position, tagged and mapped so the engine surfaces them automatically:

- **Catcher (12)** — one-knee stab receiving, lateral block ladder, quick-hands transfer under stopwatch, blocking-to-throw combo, pop-time gauntlet, backpick to 1B, framing edge ladder (top/bottom/glove/arm side), pitch-in-dirt read progression, bunt pop-and-plant, tag-play sweeps at the plate, pickoff footwork vs LH/RH runners, throw-down under fatigue.
- **Middle infield — 2B/SS (10)** — glove-side funnel, backhand shuffle-replace, double-play feed ladder (flip / underhand / dart / behind-the-back), pivot at 2B under runner pressure, slow-roller barehand, in-between hop read, deep-hole plant-and-throw, relay footwork, tag-and-tap DP finish, first-step reactive ball drops.
- **Corner infield — 1B/3B (10)** — 3B in-at-the-line reactions, slow-roller barehand-and-throw, backhand-plant-throw, bunt charge to bare-hand-throw, tag plays; 1B picks vs each hop (short/in-between/long), stretch mechanics, 3-6-3 turn, footwork off the bag on throws, holding runners with quick pickoff catch.
- **Outfield (12)** — drop-step and crossover reads, over-the-shoulder catches (glove side / arm side), do-or-die charge, one-hop long-hop crow-hop, wall reads and caroms, sun-ball tracking with sunglasses drill, communication ladder for gaps, cutoff-hit setups, sliding vs diving decision reps, foul-line barrier drills, wind-adjusted flyballs, high-fly reads under fatigue.
- **Pitcher fielding — PFP (8)** — 1-3 covering first, come-backers to second, 1-6-3 double plays, bunt fielding to each base, backing up bases (3rd/home), pickoff timing (slide-step to 1B/2B), rundown participation, fly-ball priority calls.
- **Universal — throwing & communication (8)** — 4-seam grip re-set on the fly, on-line footwork ladder, crow-hop consistency test, cutoff/relay communication grid, priority-call sequences, tag-application reps at every base, dive-and-recover throws, decoy plays.

Each drill row includes:
- Position tags using only the canonical short codes from §1.
- `skill_tags` (e.g., `receiving`, `blocking`, `double_play_feed`, `read_route`, `crow_hop`) inserted into `drill_tag_map` so `wk-generate-daily` and Fix-Your-Game surface them.
- Sport (`baseball`, `softball`, or `both`) and difficulty (`intro`/`core`/`advanced`/`elite`).
- Elite clarity structure from §2 baked in from creation.

## Technical details

- **Migrations**
  - `normalize_drill_position_codes` — updates `drill_positions.position` to canonical codes; safe upsert to drop duplicates via `ON CONFLICT DO NOTHING` on `(drill_id, position)` (add composite unique first if not present).
  - `rewrite_defensive_drill_explanations` — sets standardized markdown on every defensive drill.
  - `seed_elite_defensive_drills_v2` — inserts ~60 new drills + `drill_positions` + `drill_tag_map` rows.
- **Code**
  - New `src/lib/drills/positionLabels.ts` with `POSITION_ORDER`, `normalizePositionCode`, `positionLabel`.
  - `src/pages/DrillLibraryPlayer.tsx` — sort + label chips via the helper.
  - `src/hooks/usePlayerDrillLibrary.ts` — filter comparison passes through `normalizePositionCode` so legacy strings still match.
- **No behavior change** to engine selection logic, subscriptions, or gating; drills use existing tables and RLS.
