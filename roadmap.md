# Roadmap — Steps 26–27 release
- [x] A1 Nightly critical found: safety scan flagged 50 exercises with outside names in slugs (not an athlete)
- [x] A2 Renamed all 50 (data + code), backup in wk_slug_rename_step26; scan now 0 violations
- [x] B Growth-adjusted pitching age
- [x] C Kept limits: weekly/season/annual caps, innings cap, fatigue flag, pitcher-catcher (×0.70), overlapping teams
- [x] Step 27 A: removed annual rest rule, pitch-type age table, under-14 velocity block
- [x] Step 27 B/C/D: Hammers break ratio, readiness pitch unlock, readiness velocity gate
- [x] Tests: full suite 192/1,817 green; 5,000-season run seed 20260925, 0 violations
- [ ] Wire caps / fatigue flag / growth window into the live pitching plan and check-in (modules + tests done; not yet read by the plan builder)
- [ ] F1 Three clean nightly cycles (earliest: morning of 28 Sep UTC) — waits on the calendar
- [ ] F2 rest_day_calculator → all via preflight after F1
- [ ] F3 tell_hammers, adaptive_phases, phase_feedback → all (after forced generation for all 120 + phone-width pass)
- [ ] F4 Phone-width sweep of every screen

## E2E WP4 status (2026-09-25)
- [x] Silent Signals live (personalization switch), 11/11 synthetic tests
- [x] Youth throwing rules on pitching card; height history table
- [x] Arm ledger stop line on throwing + pitching cards
- [ ] UB plyo reach a card — BLOCKED: owner must pick owning card/slot (domain gate drops upper_body_plyo + hand_wrist_chain today)
- [ ] Switches tell_hammers → adaptive_phases → phase_feedback — waiting on item above (plan order) and preflight
- [ ] 17 benchmarks undated — owner to supply dated sources or mark as estimates
- [ ] WP5, WP6, final 12 gates
