# Step 26 — nightly critical, growth-adjusted pitching age, youth limits, stage release

## A. The nightly critical — found

It isn't an athlete or a card. It's the same cause every night:

- 03:10 UTC each night, the safety-floor scan writes **one** critical note, category `rule_violation`, title "A live exercise breaks a safety floor". (Seen on 22, 23 and 24 Sep, identical each night.)
- The note lists **46 live exercises with an outside coach or brand name in the slug** (for example cressey_, driveline_, jobes_, oates_, heenan_, poliquin_, triphasic_, holler_, pfaff_, summers_). No failed card, no empty card, no movement above a ceiling.
- 04:45 UTC, the auto-off job counts every critical `rule_violation` note from the last 24 hours against the rest-day calculator, so it drops one step each night: all → pilot → self → off.
- Separately, your own account has 5 critical "card failed to build" notes today, from forced test runs (full-body template missing compound_lower; one recovery-flush template). These are a real card bug, not an excluded account.

### Fix (no rule loosened)
1. **Rename all 46 slugs and display names** to neutral movement names (e.g. `cressey_wall_slide_with_lift` → `wall_slide_with_lift`, display in the "Movement Patterning" style). All references move with them in one reversible data change: prescriptions, logs, family tables, fault-ledger lists (`families.ts`, `priority.ts`), templates. Revert script saved. The new name list goes to you first — you review before it runs.
2. **Keep the naming check critical**, but record it under its own category (`catalog_naming`) so it still alarms you nightly while it's not charged to the rest-day calculator for something the calculator can't cause. Card failures, empty cards and ceiling breaks still demote it exactly as before.
3. **Fix the full-body compound_lower / recovery-flush card failures** at the source (catalog/equipment fallback), never by relaxing the template.
4. Demo and test accounts: the 8 presentation athletes are local only and never write notes; confirm no seeded test account writes notes, and exclude any flagged test accounts by an explicit list, reported by name.

### Proof
Force a generation for all 120 athletes and the 8 demo athletes, then let three real nightly cycles (03:10 scan + 04:45 auto-off) run with zero criticals. Only then restore rest_day_calculator to "all" through the preflight gate. This means the release lands **no sooner than three nights** after the fix.

## B. Growth-adjusted pitching age (Hammers rule, E3)
- Pure module: growth ≥1 in within ~30 days (Growth Mode height check) → 8 weeks one band younger for Pitch Smart daily max and rest; each extra inch adds 8 weeks and can drop one more band; floor = youngest band.
- During the window: high-intent throwing and velocity work capped, throwing volume progression held at maintain.
- Staff label "growth-adjusted pitching age"; athlete line word for word. Grounding text as specified; the two-month figure is labelled a Hammers rule, not published science.

## C. Published youth limits
Owner-tunable table, age-scaled: weekly/season/annual pitch caps with warnings; 100-inning yearly cap (HS and younger); annual rest = longer of (2–3 months no overhead throwing, 4 preferred, 4 months no competitive pitching) and the 4-days-per-month rule; pitch-type unlock ages (no breaking ball under 14 anywhere, including suggestions); "pitched while fatigued" flag from check-in and velocity/command drop-off that ends the outing and feeds the governors; pitcher-catcher flag (~3× risk wording, correlation only) with tightened combined budget; overlapping teams → stricter combined limit; velocity targets, leaderboards and velocity prompts hidden under 14. Softball windmill untouched.

## D. Regression tests
Exactly the seven listed, plus a test that a `catalog_naming` note never demotes the calculator while a `card_build` note still does.

## E. Stage release
Full suite, a fresh 20,000-season sweep on the current code, matrix 1,296/1,296, zero criticals, phone-width screens; then tell_hammers, adaptive_phases and phase_feedback on through the preflight gate. Report item by item with runtime output and a plain publish-ready verdict.

## Needs your nod
1. Renaming the 46 exercises (new names shown to you before they run).
2. Moving the naming alarm to its own category so it no longer steps the calculator down — it stays critical and still reaches you.
3. The three-night wait before the calculator returns to "all".
