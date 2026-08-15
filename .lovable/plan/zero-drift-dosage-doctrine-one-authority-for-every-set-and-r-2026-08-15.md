# Zero-Drift Dosage Doctrine — One Authority for Every Set and Rep

Users are right. I traced every place a set or rep number can come from in the daily generator, and there are four competing sources with no single authority:

1. **`wk_periodization_blocks`** (one row per quarter) — the only real phase doctrine, but only the lower-body compound reads it.
2. **Hardcoded literals in `wk-generate-daily/index.ts`** — over 20 call sites like `{ sets: 1, reps: 10 }`, `{ sets: isInSeason ? 2 : 3, reps: 3 }`, plus a full duplicate set of "guardrail" literals near the bottom of the file that fire when a session is incomplete.
3. **`wk_movement_catalog.default_sets / default_reps`** — used for everything else.
4. **`LIFT_TEMPLATES` in `_shared/wic/lift/templates.ts`** — has proper per-adaptation envelopes (`compoundSets`, `compoundReps`) and **is imported nowhere**. Dead code.

That is the drift. Concrete evidence:

- The compound lower call does `clamp(2, min_sets, max_sets)` — it clamps the constant `2`, so an Offseason Q1 strength day and an Offseason Q3 elastic day both emit ~2-3 sets no matter what the quarter says. Quarters are effectively cosmetic for volume.
- Catalog defaults for the philosophy-seeded categories are placeholder-identical: `westside`, `driveline`, `ido_portal`, `heenan`, `marinovich`, `summers`, `pap_bridge`, `cressey_sp` are **all 2 sets x 8 reps**, on every single movement. Advanced athletes get generic 2x8 for Westside max-effort work.
- Outliers that reach athletes raw: `arm_care` max reps **999**, `strength` max reps **45**, `speed_lab` max sets **9**.
- `wk_periodization_blocks` itself has inverted rows: `os_q2` has min_sets 3 / max_sets 5 with min_reps 2 / max_reps 5, `os_q3` has min_sets 2 / max_sets 5 — ranges that overlap other quarters so quarters aren't distinguishable.
- Training age gates *eligibility* (`min_training_age_years`) but never scales dose. A 1-year and a 10-year athlete get identical numbers.

## The fix: a single dosage authority

Create `_shared/wic/dosage/doctrine.ts` as the **only** module allowed to produce a set or rep number. Every engine and the generator call it; nothing else emits a number.

### 1. Canonical dose matrix

A frozen matrix keyed by `(quarter, domain, sequence_role, adaptation)` returning a dose envelope, replacing the four sources above:

```text
quarter x role      -> sets x reps x intent
os_q1 strength      main compound   4-5 x 4-6   accumulate
os_q2 power         main compound   4-6 x 2-3   intensify
os_q3 elastic       main compound   3-5 x 2-3   express
os_q4 sharpen       main compound   3-4 x 1-3   peak
in_season maint     main compound   2-3 x 2-3   maintain
post_season         main compound   2-3 x 5-8   decompress
```

Same treatment for accessory, unilateral, trunk primer/finisher, carry, arm care, bat speed, speed, conditioning — each domain gets its own row set rather than reusing lift numbers.

### 2. Deterministic modifiers, applied in fixed order

Envelope -> training-age scale -> week-in-block wave -> readiness/CNS cap -> season safety clamp -> final. Each modifier is a pure function and each one records what it did, so the card's "why" line can say exactly why the number is what it is.

- **Training age**: beginner truncates toward the low end and caps reps-in-reserve; advanced/pro unlocks the top of the envelope. Fixes the generic-2x8-for-everyone problem.
- **Week wave**: week 1 low end, weeks 2-3 climb, week 4 deload. Replaces the current ad-hoc `sets - 1` deload patch.
- **Readiness**: existing CNS cap becomes a modifier on the envelope instead of a separate clamp path.

### 3. Unit-aware dosing

Movements measured in time, distance, contacts, throws, or innings never get set/rep math applied. `dosage_unit` selects the correct dose shape so a 9-inning sim or a 30-yard sprint never renders as "8 sets".

### 4. Catalog cleanup

Catalog `default_sets`/`default_reps` stop being a dose source and become a **fallback of last resort plus a sanity bound**. A migration fixes the corrupt values found above (999 reps, 45 reps, 9 sets) and replaces the placeholder 2x8 rows in the philosophy categories with real per-movement dosing appropriate to each methodology.

### 5. Drift guards

- `LIFT_TEMPLATES` is either wired into the doctrine module or deleted — no dead dose tables allowed to exist.
- The generator loses every hardcoded `{ sets: N, reps: N }` literal, including the duplicated guardrail block.
- A new audit script (`scripts/audits/dosage-doctrine-audit.ts`) simulates all six quarters x training-age bands x day types and asserts: every quarter is distinguishable in volume, no row exceeds its envelope, no row falls below a minimum effective dose, and no literal dose exists outside the doctrine module. CI fails on violation.
- A repo lint rejects any new `sets:`/`reps:` literal in engine or generator files.

## Technical notes

- New: `supabase/functions/_shared/wic/dosage/doctrine.ts` (matrix + modifiers), `scripts/audits/dosage-doctrine-audit.ts`.
- Edited: `wk-generate-daily/index.ts` (all push sites route through the doctrine), `_shared/wic/engines/strength.ts`, `speed.ts`, `batSpeed.ts`, `conditioning.ts`, `_shared/wic/lift/templates.ts`, `_shared/wic/validator.ts` (reject out-of-envelope rows before publish).
- One migration: repair `wk_periodization_blocks` quarter ranges so quarters are non-overlapping and directional, and repair the corrupt/placeholder `wk_movement_catalog` dose defaults.
- Determinism preserved: matrix and modifiers are pure and version-stamped (`dosage_doctrine_version`) so a replay reproduces the exact numbers.
