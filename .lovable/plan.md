# Phase 1.0C — Reality Validation Pass (Baseball Hitting)

Goal: get one real athlete through the live BH loop on the deployed preview, capture observed behavior, and surface which assumptions break first. No new code, no doctrine, no architecture.

## 1. Exact Test Scenario

Single end-to-end run, performed once per athlete, on a phone (primary) and once on desktop (secondary if time permits):

1. Open the published URL on a personal phone (cold, no prior session).
2. Create a brand-new athlete account (email + password) — sport: Baseball, discipline includes Hitting, age + handedness filled honestly.
3. From the home/index screen, locate and start the "upload hitting video" path without prompting from the observer.
4. Record OR upload one real swing video (side angle, ~5–10 seconds, phone camera, natural lighting). No retakes for "AI friendliness."
5. Wait for analysis to complete. Observe loading state, time-to-result, and any errors.
6. Open the resulting report card. Read it top-to-bottom unaided.
7. For each of the 4 BH §17 category panels (Hip Load, Hand Load, Stride, Hitter's Move):
   - Read the panel.
   - Tap "Ask Coach Hammer" on at least one panel.
   - Send one real follow-up question in their own words.
8. Attempt to act on one piece of feedback (find a drill, find a video, find a roadmap step) — note where missingness chips appear vs. real content.
9. Close the app, reopen 10 minutes later, return to the same report. Confirm it still loads.

Observer stays silent except to unblock hard stops (auth bug, white screen). All hesitations, wrong taps, and verbal reactions are logged.

## 2. Required Accounts

- 1 fresh athlete account per tester (no reused emails).
- 1 observer account with DB read access (already exists — the operator) for post-session inspection of `videos`, `performance_sessions`, `hammer_state_snapshots`.
- No coach, parent, scout, or org accounts needed for this pass.

## 3. Required Data

- Athlete supplies: 1 real swing video, real age, real handedness, real email.
- System supplies: ratified v0.13 §17 BH schema content (already shipped in `hittingV1Schema.ts`), `hammer-chat` edge function with `categoryFocus` (already deployed), existing analysis pipeline for hitting.
- Nothing seeded. Drill/video/roadmap rendering as missingness is acceptable and expected.

## 4. Recruitment Target (minimum viable signal)

- 3–5 athletes, ages 12–22, who actually hit a baseball weekly.
- At least 1 youth (12–14), 1 HS (15–18), 1 college/adult.
- At least 1 athlete with no prior exposure to the product.
- Recruit via existing personal network; no paid panel.

## 5. Success Criteria

A run counts as a success if ALL of the following are true:

- Athlete completes signup → upload → report → at least one Hammer category exchange without observer intervention.
- Report renders all 4 §17 panels with readable text.
- Athlete can articulate, unprompted, at least one specific thing to work on after reading the report.
- Athlete says they would open the app again on their own.
- Report is still retrievable on cold reload.

## 6. Failure Criteria (any one = failed run, logged with cause)

- Cannot complete signup (auth, validation, confirmation email).
- Upload fails or analysis never returns.
- Report renders blank, errors, or missing one or more §17 panels.
- Coach Hammer dialog fails to open, fails to respond, or returns generic non-category content.
- Athlete cannot describe any takeaway after reading the full report.
- Athlete explicitly says the report is confusing, wrong, or not about hitting.
- Athlete refuses to reopen the app.

## 7. Feedback Collection Process

Per-session, in this order, captured in a single shared doc (one row per athlete):

1. Screen recording of the phone session (athlete consent required).
2. Observer log: timestamps of every hesitation > 3s, every wrong tap, every verbal reaction.
3. 5-minute post-session interview, 6 fixed questions:
   - What did this app just tell you?
   - What would you do tomorrow because of it?
   - What did you not understand?
   - What felt wrong or untrue about your swing?
   - Would you pay for this? How much?
   - Would you show it to your coach / parent / teammate?
4. DB pull after session: rows from `videos`, `performance_sessions`, `hammer_state_snapshots`, `asb_events` for that user_id, attached to the row.
5. One-line verdict per athlete: PASS / PARTIAL / FAIL + dominant failure cause.

Aggregate after 3 runs; do not wait for all 5 before reading signal.

## 8. Highest-Risk Assumptions Still Unvalidated

Ranked by how likely they are to break the loop, highest first:

1. Analysis pipeline produces a §17-shaped result for a real phone-shot swing video (not just curated test clips).
2. The 4 §17 category texts read as true and specific to the athlete's actual swing, not generic.
3. Athletes can find the upload entry point on mobile without guidance.
4. Coach Hammer's category-focused replies feel category-focused, not generic chat.
5. Visible missingness for drills/videos/roadmaps reads as "coming soon" rather than "broken."
6. Athletes (esp. 12–14) can read the report without an adult translating.
7. Report load time on a real phone + real cellular is tolerable.
8. Athletes return on their own within 24 hours without a push notification.
9. Athletes connect the report to a concrete next action (the whole point of V1).
10. Parents/coaches who see the report over the athlete's shoulder don't reject it on sight.

Items 1, 2, and 9 are the loop-killers. If any of them fails across 3 of 5 athletes, stop adding features and fix those before B2/B5/B6/B7.

## 9. Out of Scope for This Pass

BP flow, drill/video/roadmap resolvers, Pass/Fail gate, tone audit, trend chip, payment, beta marketing, any deferred discipline.

## 10. Exit

Phase 1.0C ends when 3–5 athlete runs are logged with verdicts and the top-3 loop-killer assumptions have a real-world PASS/PARTIAL/FAIL determination. Output of 1.0C is the input to whatever 1.0D becomes — not decided here.
