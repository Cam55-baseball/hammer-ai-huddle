# Owner decisions — bat speed, growth mode, heavy track, birthdate, under-13 pause

No publish. No cron changes. `rest_day_calculator` and `hammers_today_start_gate` stay as they are. Part 5 (parent-managed under-13 program) is not built.

## Part 1 — Bat speed is velocity training for pitchers
- The Bat speed card on Hammers Today, for pitcher and 2-Way players: title "Bat speed: velocity training", plus the line "Bat speed builds the hip-and-shoulder power that carries into your fastball."
- Start card: pitchers and 2-Way players see the same title and line. Position players keep "Bat speed".
- The rule "no heavy- or light-bat work on back-to-back days" stays in force in both rule checks. No age or season limit is added to Bat speed.

## Part 2 — Growth mode comes only from measured height
- One shared rule, used by the planner and the app: growth of 2 cm (¾ in) or more within about 3 months (the latest height compared with the lowest height in the last ~90 days) turns growth mode on for 8 weeks. Each new qualifying increase renews it. It is never inferred from age. Missing height history means growth mode is off.
- Every "age 15 or younger" shortcut is removed: heavy-track eligibility, weekly workload, and tissue recovery. The upper-body "1 inch in 30 days" rule is replaced by the shared rule.
- When growth mode is on, these change together:
  - Lifting: no heavy track; weekly workload held level.
  - Jumps: easy, rhythmic jumps only (newly wired into the jump card).
  - Upper-body throws and catches: tier 1 only.
  - Tissue recovery: slower recovery.
- A new growth card on Hammers Today shows the doc's text word for word while growth mode is on. It also says when it ends ("Ends on <date> unless you keep growing") and why it ended once it turns off. That off-notice shows for 7 days.
- Height input:
  - Onboarding: height becomes required, with the note "We'll ask you to update this as you grow."
  - Progress photos: height is required before a photo can be saved.
  - Players under 18: a reminder to update height when their last height entry is 28 days old. This is shown in the app; nothing is scheduled.
  - Every entry writes one height record, shared by every place that reads height, so growth mode updates on the very next plan check.

## Part 3 — Heavy track matches the approved plan
- Heavy track: age 16 or older, training age 4+ years (advanced, elite or professional bands), not in growth mode, and no pain flag. The "6+ years only" rule is removed.
- I will compare the code with the approved lifting plan (v4) and the Weight-Room Standards doc (barbell spinal work 16+ advanced, bodyweight ladders 14+, standards 14 minimum, safe session legal at 14). Every place that is stricter or looser gets fixed and listed in the report. Under the standing rule, no exercise's minimum age is lowered. If the plan would require lowering one, I list it for the owner instead.

## Part 4 — Birthdate is the one source of age
- One shared age calculation from `profiles.date_of_birth`, used by the planner, the final rule check, legality, throwing limits, growth mode and the Start card. The separate age field is no longer read anywhere.
- Signup: birthdate is required and asked neutrally ("Date of birth").
  - Under 13: no account is created, nothing they typed is sent or stored, and they see: "Players under 13 need a parent or guardian to set up and manage their account."
  - The device keeps a lock flag with no personal data, so the same device can't immediately retry with a different date.
- Existing players with no birthdate: a required full-screen birthdate step on next open. They can't continue until it's saved. Entering an under-13 date pauses the account (below).
- After a birthdate is saved, players can't change it; only the owner or admins can. This is enforced in the database, not just the screen.
- Pausing an account (the 4 existing under-13 accounts now, plus any account where an under-13 date is entered later). A pause flag on the account means:
  - no plans built: the planner and the daily job skip paused accounts;
  - no uploads or AI analysis: upload and analysis functions refuse paused accounts;
  - hidden from scouts, recruiters, search, leaderboards and public pages;
  - the player sees a full screen: "A parent or guardian must set up and manage this account."
  - No data is deleted.
- Start card: the under-18 "growing body" wording is removed. The growth note appears only while the player is actually in growth mode.

## Testing
- Unit tests:
  - the growth rule: turns on at ¾ in in 3 months, off after 8 weeks, renews;
  - the heavy track: an advanced 16-year-old qualifies; 15 years old, in growth mode, or under 4 years of training does not;
  - age from birthdate;
  - Bat speed wording.
- Re-run the 8-week simulation. All rule violations must stay 0.
- On test accounts (server paths through the job token, as before):
  - a height increase turns growth mode on, and it turns off after 8 weeks of simulated dates;
  - an advanced 16-year-old test player gets the heavy track;
  - a paused account gets no plan.
- Phone screenshots of:
  - the signup birthdate step and the under-13 block;
  - the required birthdate screen;
  - the paused-account screen;
  - the height prompt on a progress photo;
  - the growth card;
  - a pitcher's Bat speed card and Start card.

  These use sample-player preview pages, like the earlier Start-card evidence, because no signed-in player session is available.

## Live now vs after publish
- Live now, once deployed: database changes (pause flag, birthdate lock, hiding paused accounts), the 4 accounts paused, and the redeployed planner, daily job and upload/analysis functions.
- After publish: every screen (birthdate, under-13 block, paused screen, height prompts, growth card, Bat speed wording, Start card).

## Points to confirm (my assumptions in brackets)
1. Google sign-in creates the account before a birthdate can be asked. ["No account created" applies to email signup. A Google signup with an under-13 date is paused immediately, not deleted, because deleting would break the no-delete rule.]
2. How long the under-13 device lock lasts. [30 days.]
3. Upper-body drills currently assume age 14 when age is unknown. Birthdate becomes required, so [unknown age is treated as 13, matching the final rule check].
4. Paused accounts and the scouting and recruiting functions: [hide them through the existing recruiting gate (`_shared/recruitingGate.ts`) plus the database's access rules].

## Technical details
- Migration:
  - `profiles.account_paused_at`, `paused_reason`;
  - a trigger that blocks non-admin changes to `date_of_birth` once it is set, and pauses the account when the birthdate is under 13;
  - paused accounts excluded from the visibility functions behind search, leaderboards and recruiting;
  - a data update pausing the 4 accounts.
- Shared modules:
  - `_shared/wic/growth/growthMode.ts` plus a client mirror;
  - `_shared/age/ageFromDob.ts`;
  - `isHeavyEligible` changed to 4+ years of training.
- Edits:
  - in `wk-generate-daily`: lines ~1481–1486, ~3220 and ~1040–1060;
  - also `tissueCost/shadow/adapter.ts`, `blockContent.ts` (pass growth mode in), `finalCheck.ts` and `startPlanItems.ts`;
  - the onboarding, progress-photo and signup screens;
  - a new `BirthdateGate` and `PausedAccountScreen` at the app root.
- Redeploy: `wk-generate-daily`, `wk-daily-plan-job`, and the upload/analysis functions that gain the pause check.
- Record each decision in `AGENTS.md`. Save to memory: growth mode is height-only, birthdate is the one source of age, and the under-13 pause.
