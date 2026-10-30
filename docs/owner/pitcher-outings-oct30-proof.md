# Pitcher outings and arm ledger — October 30, 2026

**Latest result (October 30, 10:38 UTC): saved outing linkage and following-week arm audit PASS; distinct next softball bullpen placement remains OPEN.** The historical findings below are retained, not the current saved-day verdict.

## Latest saved-data proof

- At 390×844, the three exact existing TEST game sheets were opened as their respective athletes; 40 pitches and 10 batters faced were saved through the inputs and Save & exit, then reloaded. These are synthetic TEST facts, not claims about actual athlete performance. Screenshots: `/tmp/browser/outings/{certhsp,certsbp,certsb2}-start.png`.
- Each game now has one `game_pitches_self` arm-ledger row, count 40, status done, matching sport/date and exact game ID in `game_sources`. Repeated UI saves retained 40, not 80. No pitch-by-pitch, innings or starter facts were invented.
- Applied additive migration `0158_game_outing_arm_lineage`; deployed only `wk-generate-daily`, final submitted source hash `6b238321ea3349be84e00649f7f07188d8964ba47058b56ea5bcd876278cb362`.
- Corrected missing aggregate/detail projection (greater count once per game), actual-outing recovery, windmill recovery reopening, shared final arm envelope and game-eve pitching. A refused softball rebuild also exposed duplicate compound pulls after safety step-down: later duplicates are removed before the unchanged certifier, without changing retained doses.
- Sequential server saves/readbacks succeeded. Baseball November16–22; softball following dates November17–23 for both personas. Saved November16 softball outing days retained no ready arm work. Sunday November22 retained no pitching/position throws.

| TEST persona | Outing | Next-day saved protocol | Next saved pitching | Saved week arm audit |
|---|---|---|---|---|
| certhsp — baseball Complete Pitcher | Nov17,40 pitches/10 batters | Nov18: cuff/scap activation, wrist/forearm mobility, sleeper/cross-body stretch; zero throws | Nov19:20-pitch command bullpen,55 total arm units with supplements; Nov16 game-eve has zero throws | No canonical rest/daily/weekly violation; peak55/105 daily,150/263 weekly across checked Nov16–23 |
| certsbp — softball Complete Pitcher | Nov16,40 pitches/10 batters | Nov17: same easy recovery protocol; zero throws | Nov18 and19:35-pitch flat-ground command,43 arm units/day; Nov20 recovery; Nov21–23 no pitching | No windmill/daily/weekly violation; peak43/140 daily,126/420 weekly. No distinct next bullpen in checked saved dates |
| certsb2 — softball Golden2Way | Nov16,40 pitches/10 batters | Nov17: easy recovery protocol; zero pitching or position throws | Nov18 and19:35 windmill pitches plus position work,69.9 combined arm units/day | One shared70/day,280/week envelope; checked peak179.8 weekly, zero canonical violations. No distinct next bullpen in checked saved dates |

Audit uses actual game40 plus explicit armEvent metadata from READY saved drills, never suppressed titles or claimed performance. Innings remain unknown, so unentered innings-dependent rules are not positively certified. Evidence: `/tmp/browser/outings/*-saved.json`, `audit.json`, build receipts and UI screenshots. A clock-shifted Today-screen attempt expired the TEST session and reached sign-in; it is not counted as saved-card UI proof.

Focused regressions:84 passed across7files. Latest automatic preview check: build OK10:34:00UTC. No publish, cron, iOS, account reset, manual prescription/arm-row writes or real-player test data changes.

**Remaining acceptance:** distinct next softball bullpen dates beyond the checked flat-ground sessions, and innings-dependent safety with an actually entered innings value. These are not represented as completed.

## Inputs entered through the phone UI

All observations below are synthetic TEST outing facts entered into the actual game logger, not real-world athlete performance or invented pitch-by-pitch evidence. Each was saved as `final`, position `P`, **40 pitches, 10 batters faced**. Pitching-history-complete was left unchecked; outcomes/innings were left unknown.

| Persona | Existing scheduled date | Saved game | Readback |
|---|---|---|---|
| HS baseball Complete Pitcher | November17 | `210e6db0-ff47-4b3c-b0be-54a6d6a2f0ba` | final, baseball,40 pitches,10 batters |
| HS softball Complete Pitcher | November16 | exact self-owned final row | final, softball,40 pitches,10 batters; UI reload showed final |
| HS softball Golden2Way | November16 | exact self-owned final row | final, softball,40 pitches,10 batters; UI reload showed final |
| HS baseball Golden2Way | None found in calendar/game/athlete-event/timeline reads | Not logged | Manual off-season setting remains; no invented scheduled outing |

Screenshots viewed: `/tmp/browser/outings/certhsp-totals.png`, `certsbp-totals.png`, `certsb2-totals.png`, at390×844. TEST legal/health consent screen was completed where required. Training waiver was not bypassed.

## Saved days in plain words

- **Baseball Complete Pitcher:** November17 game saved. November18 saved pitching card contains bands, wrist/forearm preparation and cooldown, with no declared pitches. November19 saved card includes a20-pitch command bullpen plus existing throw supplements. These dates cannot certify safe release from the40-pitch outing because that aggregate is absent from planning history.
- **Softball Complete Pitcher:** November16 game saved. Previously saved November17 next-day card contains recovery bands/mobility/stretching **and35 pitches** (14 fastballs,5 change-ups,5 drops,6 curves,5 rises). The attempted fresh week rebuild refused November16, leaving the saved day unchanged: `game_day_forbidden_slot`, `easy_base_jog_sb` in conditioning. November17 was not freshly rebuilt in this run for this persona.
- **Softball Golden2Way:** November16 game saved. Fresh November17 card still includes the same35 windmill pitches after recovery preparation. November18 and19 saved cards have35 flat-ground pitches **and position throwing** (respectively16/8 tennis-ball throws,20 regulation tosses,10 routine ground-ball throws). Shared-budget acceptance is not proven because the actual40-pitch outing is missing. November20 rebuild refused on the same game-day conditioning validator; no full fresh week claimed.
- **Baseball Golden2Way:** no scheduled in-season game was found for this exact identity; no outing or next-day proof claimed.

## Reproduced root cause and remaining work

1. Exact readback of `arm_ledger_entries` for the three TEST accounts and November16–23 returned **zero rows** after finalized aggregate game saves. Existing game totals are saved but do not project into that ledger.
2. `readPlanningArmHistory.ts` queries game ID/date only, then counts pitcher-perspective `gp_pitches`; it does not select aggregate `gp_games.pitch_count`. The sibling client `useGamePitchLoad.ts` has the same assumption. No pitch-by-pitch rows were fabricated to hide this defect.
3. Existing arm-ledger uniqueness is athlete/date/throw-type; accepted types include coach game totals but not a self-game-specific type. A proper fix must retain exact game/sport lineage, corrections/idempotency and avoid counting aggregate plus detailed pitches twice or overwriting coach counts. No arbitrary ledger row was inserted as a substitute for a real app save.
4. Live game-day easy-running selection conflicts with `_shared/wic/validator.ts` on fresh softball game builds. This is a refusal, not a safe-week pass.

Unchanged arm-rule regression tests: **106 passed /5files** (arm budgets, youth/PitchSmart, under13, ledger-entry and scheduling corrections). Latest automatic preview: buildOK05:23:27UTC. Passing unit tests are not proof of missing live lineage or whole-week compliance.

Sequential one-date builds, one persona at a time, with60-second pauses preserved IO pacing. No publish, cron, iOS, destructive cleanup, manual saved-plan writes or real-player changes.