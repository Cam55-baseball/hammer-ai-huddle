# Limb size — what chooses exercises and doses today, and a proposal (Round 9, item 7)

Status: **collection live, prescriptions unchanged.** Nothing below in "Proposal" is built. The owner approves each part before any plan reads a limb size.

## a. Inputs that choose exercises and doses today (file by file)

Every plan is built by `supabase/functions/wk-generate-daily/index.ts`, which reads the inputs below once and passes them to the rule files. Body size enters **only as standing height (growth mode)** and **weight (load context, verified lifts)**. No limb length is read anywhere.

| Input | Read in | Used by (file) | Effect | Groups |
|---|---|---|---|---|
| Sport (baseball/softball) | `athlete_context.sport_primary` | `batSpeed/programGate.ts`, `schedule/finalCheck.ts`, `conditioning/selectConditioning.ts`, `pitching/*` (windmill vs overhand), `phases/armLedger.ts` (budgets) | which program, distances, pitch budgets | all |
| Position / role (P, C, position, two-way) | `athlete_context.position_primary/secondary`, `profiles.position` | `phases/armLedger.ts` (`throwRoleFrom`), `phases/nextThrowDate.ts`, `pitching/*`, PFP/pick-off picker (`src/lib/hammer/pitching/pfpLibrary.ts`) | arm budget, pitching card, start-day rest, pick-offs (baseball pitchers only) | pitcher, catcher, position, 2-Way |
| Subscribed program | `subscriptions.subscribed_modules` | `batSpeed/programGate.ts`, `domainGate.ts`, Base Stealer gate | which cards exist; bat-speed rules (hitter vs Complete Pitcher velocity caps) | all |
| Age (one DOB source) | `profiles.date_of_birth` | `phases/youthThrowing.ts`, `phases/u13ThrowGate.ts`, `legality/*` (exercise minimum ages), `competitionLevel.ts` (default level), plyo-ball 13+ rule | Pitch Smart limits, exercise legality, heavy track 16+ | age bands <13, 13–15, 16+ |
| Training age | `athlete_context.years_in_sport` / `trainingAge.ts` | `trainingAge.ts`, `progression/progressionState.ts`, heavy-track gate | progression speed, heavy track (advanced+) | all |
| Standing height history | `athlete_height_checks` | `growth/*` (2 cm / ¾ in per ~3 months) | growth mode caps on every card | all |
| Competition level | `athlete_context.competition_level` (age default) | `competitionLevel.ts`, bat-speed `min_competition_level` | content eligibility | all |
| Season / phase / games | season settings, `calendar_events` | `season.ts`, `phases/adaptivePhases.ts`, `schedule/gameProximity.ts`, `schedule/inSeasonPlan.ts` | HT phase, dose envelopes, game-day rules | all |
| Readiness, sleep, soreness | `athlete_daily_log`, `vault_focus_quizzes` | `schedule/tissueCost/decide.ts`, `recovery/*`, `lift/trendDeload.ts` (new) | allowed class per day, lighter week | all |
| Pain / injury flags | injury slugs, check-in pain areas | `legality/*`, `lift/substitutions.ts`, barefoot gate (app) | removes/swaps movements | all |
| Equipment | `athlete_equipment_context` | `lift/substitutions.ts`, `conditioning/substitutions.ts`, owner drills (`src/lib/prescription/ownerPlanDrills.ts`) | equipment-free fallback | all |
| Logged sessions | `wk_session_logs`, `arm_ledger_entries`, `wk_external_training_days` | `progression/*`, `phases/armLedger.ts`, `schedule/finalCheck.ts`, `lift/trendDeload.ts` | spacing, arm totals, next-eligible dates | all |
| Verified lift numbers | `wk_session_logs` | `src/lib/lift/verifiedMax.ts` (display), `lift/verifiedMax.ts` (trend signal) | shown weights only; HT %/sets/reps unchanged | lifters |

Per group, the difference is only which of these rows apply: pitchers add pitch counts/start-day rules; catchers add throw-downs; 2-Way takes the stricter arm budget and hitter bat speed; softball changes distances, windmill budgets and pitching anchors; age bands change legality and Pitch Smart limits.

## b. Collection (built)

- New history table `athlete_limb_measurements` (date, standing height, arm span, sitting height, optional hand length, source). Rows are added, never overwritten.
- Asked at onboarding (Body measurements) and with every progress photo, next to the required height.
- Under-13 accounts: the parent fills them in on the managed account.
- Leg length is worked out later as standing height − sitting height. Nothing is estimated when a field is blank.

## c. Proposal (needs owner approval — not built)

Ratios use the newest measurement set; anything missing → today's behavior.

1. **Lift variation (lever lengths).** Ape index = arm span ÷ height; leg ratio = leg length ÷ height. Long femurs (leg ratio ≥ 0.53) → prefer trap-bar deadlift, front-loaded or safety-bar squat and box squat to parallel as the default variant in the same category; long arms (ape index ≥ 1.04) → prefer conventional/trap-bar pulls over sumo, neutral-grip pressing. Same category, same sets/reps/% — only the variant ranks higher.
2. **Stride targets vs leg length.** Express sprint stride and pitching stride as % of leg length or height: overhand pitch stride target band 77–87% of height (shown as a range, record-only first); softball windmill stride against leg length. Steps-to-stride on the sprint stopwatch shown relative to leg length.
3. **Pitching extension and arm-slot context.** Use arm span to show expected release extension so a "short extension" note is judged against the athlete's own levers. Arm slot is never flagged (elite filter); limb size only adds context.
4. **Bat-size guidance.** Display-only bat-length guide from height and arm span (with weight) as a starting range; never changes a bat-speed dose.
5. **Mobility emphasis.** Long-lever athletes get the existing hip/hamstring and T-spine mobility items ranked first inside the same warm-up slot count; no added minutes.

All five would ship as display/ranking only, behind a switch, with tests showing doses identical before and after.

## d. Owner correction (2026-10-07) — BUILT
Limb data comes from `athlete_context.anthropometrics` (onboarding). The duplicate fields added in Round 9
(sitting height, hand length) were removed from onboarding and progress photos; `athlete_limb_measurements`
had 0 rows, so nothing needed moving. Rule built in `_shared/wic/lift/proportionEmphasis.ts`:
proportions shift emphasis only, never rule out an exercise (only injury does).
- Femur ÷ torso (fallback leg ÷ height): long → split squats, lunges, trap bar win on up to 80% of days;
  bilateral squats the rest. Short → the reverse. Lever basis: longer femur relative to torso forces more
  trunk lean and hip moment in bilateral squats; single-leg and trap-bar keep the trunk upright.
- Arm span ÷ height: long arms → dumbbell / neutral / landmine presses favoured (longer barbell range),
  small nudge toward pulls (shorter deadlift range). Barbell pressing still appears.
- Missing measurements = no change. Doses untouched. Simulations: src/test/proportionGoalEmphasis.test.ts (0 violations).
