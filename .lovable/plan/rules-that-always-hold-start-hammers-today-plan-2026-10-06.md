# Rules that always hold + "Start Hammers Today Plan"

Nothing gets published or scheduled, and `wk_mark_missed_lifts()` is never run. The start-card gate is built switched off.

## Two things to settle before I start

1. **The rules disagree with each other (my standing rule is to stop and report this).** The in-season law says at most 2 lift days a week. Your in-season plan says lift every third day, with 2 full rest days between lifts. Every third day comes to 2–3 lifts in some weeks. Unless you say otherwise, I'll treat both as hard limits: 2 rest days between lifts AND no more than 2 lift days in any Mon–Sun week. In practice that means 2 lifts a week.
2. **Turning the rest-day rule on for everyone takes effect right away.** That switch is read live, so it would change real players' plans today. Publishing doesn't hold it back. Unless you say otherwise, I'll leave it on for your account only, prepare everything else, and give you the one statement that turns it on for everyone.

## Part A — the rules hold in the plan itself

1. **Plans count, check-offs don't.** Spacing and weekly limits are checked against lifts already in the plan, so they hold even if nothing is checked off.
2. **Missed lifts stay put.** A missed lift is never made up and never moves. The next lift goes on the first day the rules allow, counted from the missed lift's date.
3. **Effort uses real work only.** How hard a lift should be is based only on lifts marked Done or Cut short.
4. **Recovery days aren't lift days.** A day with only arm care or mobility no longer counts as a lift day anywhere: the rest-day calculator, the weekly count, the reasons shown to players, or the audits.
5. **Fix the calculator's push-back loop.** Today a lift merely planned for tomorrow can block today's lift, and the day after that is blocked by today's. From now on, each day only looks back at days already planned, so the lift lands on the first legal day. Turning it on for everyone: see question 2.
6. **Final check before saving.** Every plan gets one last rule check before it's saved. If a card breaks a rule (spacing, weekly limit, game-day, age or season), it's replaced with an allowed recovery card and the swap is logged. A broken plan can never be saved.
7. **Card types and their rules.** A plain-words table of every card type the planner creates (warm-up, speed and sprint, bat speed, plyo/power, lift, conditioning, throwing, arm care, mobility, recovery, cross-sport, nutrition, mental). It shows each card's existing rest and frequency rules, taken from the code. Card types with no rule are marked "none". I'll suggest a rule for those for you to approve, but won't apply it.
8. **Eight-week simulation.**
   - **Who:** every mix of season (in-season, off-season, post-season), games or no games, age (13–17 or 18+), role (pitcher, position player, 2-Way), sport (baseball or softball), and what the player does (everything, nothing, a mix).
   - **How:** each one is run through the real planning rules and the final check.
   - **What you get:** the number of violations for every rule, which must be zero, with age rules checked against each movement's minimum age.

## Part B — "Start Hammers Today Plan"

1. **Start date per account.** A new `hammers_today_started_at` field on the profile. It's set once on the server, and a second tap leaves the first date untouched.
2. **New switch.** A `hammers_today_start_gate` switch, built OFF.
   - **While it's off:** everything works exactly as it does today.
   - **When it's on:** accounts without a start date get no plan built — not on opening the app, and not from any background job.
3. **The Start card.** Shown where the plan normally appears, under the same access rules as the plan:
   - one large "Start Hammers Today Plan" button
   - a short plain description underneath
   - a tidy list of what's on the plan, built from the card types the planner actually creates for that player (sport, role, season)
   - designed phone-first and matched to the app
4. **Tapping it** saves the start date, builds today's plan straight away and shows it. The card never comes back on that account, on any device.
5. **A plan every day.** A daily job builds each started player's plan for their own local day (built, not scheduled). Opening the app builds it if it's missing. A daily check retries any missing plans and logs failures. A plan is never rebuilt once anything on it is marked.
6. **Testing** on a test account:
   - the card shows
   - one tap builds the plan
   - the card stays gone after a reload and in a fresh browser
   - several simulated days each get a plan
   - an account that hasn't started gets none
   - everything is undone afterwards
   - includes a phone-size screenshot of the Start card

## What goes live when

- **Database changes:** live as soon as they're applied. That covers the new start-date field, the new switch (built off), and the start and daily-check functions.
- **Planner changes:** live once the planner function is updated on the server. I'll list exactly which ones.
- **Screen changes:** live when the owner publishes. That covers the Start card and last round's check-off fixes.

The report will end with the exact statements to:
- switch the gate on
- schedule the daily plan job
- schedule `wk_mark_missed_lifts()`

## Technical notes

- **Planner touches.** Changes to the frozen planner: the calculator's history window, the shared lift-day rule, the final check before saving, and the start-gate check. I'll report each one.
- **Simulation and tests.** The simulation lives under `scripts/audits/`, and new unit tests sit next to the rule code.
- **Rules for future work.** Two rules go into `AGENTS.md`: the final check before saving, and the start gate.
