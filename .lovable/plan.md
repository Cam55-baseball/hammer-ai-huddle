# Baseball & Softball IQ 101

A subscriber-wide submodule that teaches every player where they must be on every pitch, for both sports. Organized around **canonical game situations** (the "40 Situations" model, extensible forever). Every situation shows **all 9 defenders** plus **all baserunners** plus **batter/pitcher intent**, with an interactive diamond, a quiz mode, spaced repetition, variant generation, an owner-managed library, and full Hammers integration.

## Pillars

1. **Situation-first taxonomy** — Defense, Offense, Pitching, Baserunning are *lenses* on the same canonical situations. One situation = one source of truth for all 10 actors.
2. **Three B's law** — Ball / Bag / Backup. Every actor on every situation has exactly one of these assignments, validated at content-author time so no actor is ever "missing."
3. **Self-regulating forever loop** — Spaced repetition + variant generator + accuracy guarantee. Module cannot be "completed."
4. **Owner-extensible** — Owner Dashboard library lets the owner add new situations through a guided wizard with triple-confirmation accuracy gates.

## What ships in v1

- **40 canonical situations per sport** (80 total), each at HOF depth:
  - All 9 defensive assignments (with primary route, secondary read, communication call)
  - All baserunner reads (lead, secondary, decision tree)
  - Pitcher intent + catcher signal context
  - Batter situational intent (sac, hit-and-run, slug, take, etc.)
  - "Why it works" coaching note + "Pro reference" (MLB/AUSL example pattern)
  - Common mistakes + Elite cue
- **Interactive diamond** for every situation (teach mode + quiz mode)
- **Scenario card quiz** layered on top of the diamond (position-picker → "where do YOU go?")
- **Spaced repetition engine** with decay curve per situation per user
- **Variant generator** (count, outs, runners, score, inning, handedness, opponent tendency)
- **Hammers daily micro-rep + weekly deep block**
- **Owner Library** for adding/editing situations
- **Sport-aware** Baseball ↔ Softball (terminology, base distances, windmill vs overhand, slap-hit defense, etc.)

## Information architecture

```text
/iq                          ← Landing (sport-aware): paths, daily rep, progress
  /iq/situations             ← All 40 situations, filterable by lens & position
  /iq/situations/:slug       ← Situation detail: diamond + scenario quiz + notes
  /iq/path/defense           ← Lens view: defense-only ordering
  /iq/path/offense
  /iq/path/pitching
  /iq/path/baserunning
  /iq/position/:pos          ← "Your position": every situation filtered to your job first
  /iq/review                 ← Spaced-repetition queue + variant drills

/owner/iq-library            ← Owner-only authoring + accuracy gates
```

## Data model (new tables, RLS scoped to authenticated subscribers; owner-only writes)

```text
iq_situations
  id, sport ('baseball'|'softball'|'both'), slug, title, summary,
  lens_tags text[] (defense/offense/pitching/baserunning),
  difficulty, canonical_order, owner_id, status ('draft'|'published'),
  triple_check_count int, sources jsonb, updated_at

iq_situation_actors           ← the Three B's matrix
  id, situation_id, role ('P','C','1B','2B','3B','SS','LF','CF','RF',
                          'R1','R2','R3','BR','BAT'),
  assignment ('ball'|'bag'|'backup'|'read'|'execute'),
  primary_path jsonb (waypoints on the diamond),
  secondary_read text, communication_call text,
  coaching_note text, common_mistake text, elite_cue text

iq_situation_variants
  id, situation_id, count, outs, runners jsonb, score_state,
  inning, handedness, opponent_tendency, generated boolean

iq_scenarios                  ← quiz question wrapped around a variant
  id, situation_id, variant_id, prompt, position_focus,
  correct_actor_assignments jsonb, distractors jsonb, sport

iq_user_progress
  user_id, situation_id, mastery_score, last_seen_at,
  next_due_at (spaced repetition), streak, lifetime_attempts

iq_user_attempts
  id, user_id, scenario_id, position_chosen, correct boolean,
  answer_payload jsonb, time_ms, created_at

iq_owner_review_log           ← triple-check audit trail
  id, situation_id, reviewer_id, check_round, notes, approved_at
```

GRANT block on every table per Lovable Cloud rules. Authoring writes restricted to `has_role(auth.uid(),'owner')`.

## Core UI components

- `IqDiamond` — SVG top-down field; renders 10 actor dots with animated paths. Teach mode shows all routes simultaneously with staggered playback; Quiz mode hides routes and waits for taps.
- `IqSituationCard` — Hero card for a situation (visual identity per lens via accent token).
- `IqScenarioRunner` — Reuses the proven `ScenarioBlock` pattern from Baserunning IQ, extended with `PositionPicker` + diamond overlay.
- `IqReviewQueue` — Spaced-repetition surface, drives the "never finishes" loop.
- `IqLensTabs` / `IqPositionFilter` — lets a CF see "my job first, then everyone else."
- `OwnerIqAuthoringWizard` — multi-step: situation → assign all 10 actors → draw paths → add notes → submit for triple-check → publish.

Sport theming uses existing `SportThemeContext` + `useSportTerminology` so every label flips between baseball and softball (windmill circle, slapper defense, riseball, 60ft base, etc.).

## Accuracy guarantee ("triple-checked")

Authoring wizard cannot publish a situation until:
1. All 10 actor rows present and assigned to ball/bag/backup/read/execute (no gaps).
2. Sources field has ≥2 citations (Polk, Geng, MLB rulebook, AUSL coaching, etc.).
3. Owner triple-check ledger has ≥3 distinct review-round entries.

Published situations are flagged "Triple-checked ✓" in the UI; un-flagged ones never reach athletes.

## Hammers integration

- **Daily micro-rep** — `dailyPlan.ts` picks one due scenario from `iq_user_progress.next_due_at`, weighted by athlete's primary position and upcoming opponent posture (from `scheduleContext.ts`).
- **Weekly deep block** — One full situation walkthrough (teach → quiz → variant set) inserted by the existing schedule-aware modulator. Suppressed on `game` and `taper` postures.
- Appears in `HammerDailyPlan` with "IQ rep" pill; "Answer Hammer" wires straight to the scenario runner.

## Self-regulating loop

- **Spaced repetition** — SM-2-style interval scheduler stored in `iq_user_progress`. Mastery decays if untested past `next_due_at`.
- **Variant generator** — Deterministic permutation across count/outs/runners/score/inning/handedness, seeded so the same user keeps seeing fresh permutations. Generated variants flagged `generated=true` and never collide with hand-authored canonical variants.
- IQ score on the landing page is a rolling 90-day weighted accuracy across all situations the user has ever touched, so the number always has something to move.

## Owner Library (admin authoring)

New `/owner/iq-library` route gated by `has_role(...,'owner')`:
- List view of all situations with status, sport, triple-check count.
- Authoring wizard with live diamond preview.
- Bulk-import JSON for seeding the initial 80 situations.
- Edit + version history (writes go through `iq_owner_review_log`).

## Visual & UX direction

- Dark, broadcast-feel aesthetic: deep field-green base (`hsl(150 35% 8%)`), chalk-line whites, lens-accent colors (defense = cyan, offense = amber, pitching = magenta, baserunning = lime). All via semantic tokens in `index.css`, no hardcoded colors in components.
- Typography pair: Bebas Neue for situation titles (broadcast lower-third energy) + Inter for body. Loaded via `@fontsource`.
- Motion: actor dots ease along paths with `framer-motion`; quiz reveals use `animate-scale-in`; situation transitions use `animate-fade-in`.
- Zero clutter rule: landing page shows at most 4 surfaces — Daily rep, Continue your path, Review queue, Browse situations.

## Wave plan after v1

- Wave 2: +40 situations per sport (rundowns, pickoffs, 1st-and-3rd variants, weather/turf adjustments, pitch-out coverage).
- Wave 3: Position-mastery tracks with certifications; coach-shareable QR codes per situation.
- Wave 4: Video overlay of pro examples synced to the diamond animation.

## Technical notes

- Build on existing `baserunning_lessons` / `baserunning_scenarios` patterns — same Supabase + RLS shape, same `ScenarioBlock` UX DNA, extended.
- All new tables get full GRANT statements in the same migration (per project rules).
- Edge function `iq-variant-generator` for deterministic seeded variants (so replay-safe).
- Vitest coverage for: Three-B's completeness validator, spaced-repetition scheduler, variant generator determinism, sport terminology mapping.
- Playwright smoke test: situation list → open situation → quiz a position → submit answer → see it land in `iq_user_attempts`.

## Out of scope for v1 (explicit)

- Live video ingestion / pose overlay (deferred to Wave 4).
- Multi-user team mode (every player on a roster sees the same call).
- Coach-authored situations (owner-only authoring in v1).