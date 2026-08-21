# Weight-Room Standards v1 — the ceiling we build toward

## Mission

Every quarter of the program already knows *what* to prescribe. What it did not
have was a stated endpoint: the mark an athlete is climbing toward, expressed in
numbers a 16-year-old can chase and a pro can respect.

Standards v1 adds that endpoint — and nothing else. It is a measurement and
recognition layer sitting *on top of* the prescription engine. It cannot write a
set, a rep, or a pound.

## Why we want it (beyond the tag)

1. **Motivation.** A visible ladder converts "do your lifts" into "own the mark."
2. **Honest transfer research.** We record, per athlete, the physical marks held
   *and* the on-field outputs (throwing velocity, bat speed) at the same moment.
   Over enough athletes this is the dataset that tells us which weight-room marks
   actually transfer and which ones are gym folklore. We fully expect some of the
   famous formulas to correlate weakly. We want to know that, not assume it.
3. **Our own standards eventually.** v1 seeds from widely-used field benchmarks.
   Once we hold enough paired data, the targets get recalculated from our own
   population and become Hammers standards.

## Non-negotiables

- **Zero dose authority.** No standard, tier, or near-miss changes a set, rep,
  load, or session order. The dosage doctrine remains the single authority.
  Standards are rendered as *targets*, always labelled as such.
- **Safety first.** Every mark carries a chronological floor (14 minimum) and a
  training-age floor. Loaded spinal and heavy-barbell marks open at 16 and at
  `advanced` training age. Bodyweight ladders are open to everyone at 14+.
  Marks that must never be loaded (shins-parallel squat) say so on the card.
- **Self-logged, honest framing.** Awards come from the athlete's own logged
  sets. Nothing is presented as verified. Near misses (within 10%) are surfaced
  as "closing in" so the climb is visible before the win.
- **No outside branding.** Athlete-facing copy never names another coach,
  company, or program. Tiers are generic difficulty levels: **Standard**,
  **Elite**, **World Class**. Provenance is recorded in
  `internalProvenance` on each definition, for our reference only.

## Families

| Family | Thesis |
| --- | --- |
| Joint Armor | Full-range knee/ankle capacity — the injury base under everything else. |
| Posterior Armor | Eccentric hamstring, spine and hinge capacity — the braking system. |
| Relative Strength | Force per pound, including the headline combined-lift ladder. |
| Rotational Power | Rotational med-ball output tracked beside bat speed. |
| Arm Speed Base | Explosive base tracked beside throwing velocity. |

The last two families deliberately pair a *cause candidate* with its *outcome*
so the transfer question stays measurable rather than assumed.

## Implementation

```text
src/lib/hammer/standards/catalog.ts   — definitions, tiers, safety, provenance
src/lib/hammer/standards/evaluate.ts  — pure evaluator over logged sets
src/hooks/useStandards.ts             — logs + bodyweight + age + awards
src/components/hammer/standards/
  StandardTargetLine.tsx              — target line inside the log sheet
  StandardsBoard.tsx                  — trophy wall (History page)
public.wk_standard_awards             — one row per (athlete, standard, tier)
```

Loaded marks are stored as **% of bodyweight** so the ladder scales with the
athlete instead of rewarding mass. The evaluator converts to real pounds only at
render time, using the athlete's most recent logged bodyweight.

Awards are written on save from `ExerciseLogSheet`, inside a `try/catch` — a
standards failure can never block a log from saving.

## What v1 deliberately does not do

- No verified tier, no video proof requirement, no leaderboard.
- No gating: an unmet standard never withholds an exercise or a progression.
- No correlation reporting yet. We are collecting the paired data first.
