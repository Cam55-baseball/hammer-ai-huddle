# Step 11 — Rest-Day Calculator wiring + One-tap logging

Both behind their Control Center switches, default Off. With the switches Off, not one byte of any card changes.

## A. Rest-day calculator (switch: `rest_day_calculator`)

**New pure module** `supabase/functions/_shared/wic/schedule/tissueCost/apply.ts` — turns a scheduler decision into plan adjustments. No database, no side effects, fully unit-tested.

It returns: adjusted CNS cap, whether the lift is dropped, whether today becomes recovery-only, the timing note, the "Next heavy day" chip, and 1–2 plain reasons.

**Class → today's session, the mapping I propose (needs your nod):**

| allowedClass | What the card becomes |
|---|---|
| H | Block cap unchanged; every movement class legal |
| M | Cap trimmed one step; max-effort and eccentric-overload compounds excluded |
| L | Cap trimmed two steps; compounds, max-effort and eccentric work all excluded — accessory, trunk, carries, arm care |
| none | No lift. Recovery & Tissue day |

The cap only ever moves **down**, never up, and it never rises above what the block template already allows, so the calculator can only make a day easier than today's engine would.

**Recovery & Tissue day** reuses the engine's existing `recovery_only` day, which already certifies as a full session (mobility, arm care, movement prep) and can never come back empty.

**Timing** — after skill work by default; on a game day the card is stamped "Do this after the game"; nothing is ever placed before a game.

**Card face** — a "Next heavy day: Thursday" chip plus the 1–2 plain reasons, carried in the card's existing why payload and rendered by the prescription card.

**Circuit breaker** — the same guarded `decide()` used in shadow. Any failure returns the fallback (3 full rest days, class M at most) and the card still ships. If even the guard throws, the generator falls straight back to today's untouched behaviour.

**Offseason templates** — each offseason block day already carries a CNS unit cap; I map cap tiers to `phaseTemplateClass` (top tier → H, middle → M, lowest → L, recovery week → L) and report the exact mapping table in the proof.

## B. One-tap logging (switch: `one_tap_logging`)

- **After each lift**: Done / Skipped / Cut short, an optional "How hard? 1–10", and optional per-set load and reps pre-filled with the target. Foundation and youth athletes see last-session-based targets, never percentages.
- **After each game**: played?, position, innings (or pitch count for pitchers, innings caught for catchers).
- Writes to `wk_session_logs`; the scheduler adapter already reads it. A missing log still counts as done unless it is marked skipped.

## Proof I will produce

- Switches Off: 1,296-cell matrix byte-identical, fingerprint `1435a0592f8964b2`
- Switch On for a test account: 1,296-cell matrix, 100% cards, 0 fatals, 0 floor or hard-rule violations
- The five golden weeks replayed through the real generator with the switch on (REF-OFF, MLB week, starting pitcher, tournament weekend, on-ramp)
- Phone-width screenshots: heavy day, Recovery & Tissue day, post-game day, logging sheet
- Flip-back test: Off → next generation identical to today
- Full suite green, plus a `tcs_test_runs` row if any scheduler input changed

## Stop conditions

If the class mapping, the recovery day or the offseason template mapping would need a threshold, floor or test loosened to pass, I stop and report instead.
