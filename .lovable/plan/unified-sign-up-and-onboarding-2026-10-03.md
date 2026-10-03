# Unified sign-up and onboarding

## Outcome
- Clicking **Sign Up** opens the first click-through screen immediately; the long create-account sheet disappears from the new-user journey.
- Keep the owner’s proposed order unchanged. Longer named sections may use short sub-screens so every phone screen contains at most two fields and never requires page scrolling.
- Preserve Back, Next, per-screen validation, visible progress, and resume across app closes.

## Account creation decision
- Collect email and password first, but do not create the account immediately.
- Create it after the user completes **Sport, position, bats and throws**. At that point they have supplied the minimum meaningful athlete identity, reducing empty abandoned accounts while allowing all later health, body, equipment, and goal progress to save under their account.
- Before account creation, keep the draft on that device. Immediately after creation, attach and persist the draft to the signed-in account, then continue seamlessly.
- Keep terms/privacy acceptance in the account checkpoint without adding a separate long form. Preserve the current age check and guardian branch exactly: do not lower or remove protection, and do not add an under-13 flow, consent table, or new gate. Keep DOB in its current role within a short sub-screen and report the existing behavior.

## Email confirmation
- Use the current auth setting when it returns an active session and continue without interruption.
- If confirmation is required and no session is returned, show an in-flow confirmation screen, retain the full local draft, and resume the same step after the confirmation callback hydrates the session. The user will not be sent back to the old form or lose progress.

## Build
1. Turn sign-up mode on the auth page into the unified onboarding entry while leaving sign-in and password reset intact.
2. Consolidate existing profile and athlete-onboarding fields into one ordered flow: email; password; name/photo; sport/position/bats/throws; height/weight/graduation year; state/team/level; optional measurements; equipment; injuries; sleep/water; mental/career goals; review/Finish. Split dense groups into short sub-screens without changing their order or inventing fields.
3. Reuse existing validation and persistence. Save pre-account state locally, then migrate it to the existing account-scoped draft store after account creation.
4. Keep the exact Finish handoff: explanation line → one-time system permission request → dashboard → eligible new-account demo tour. Decline/errors continue normally; existing users remain unchanged.
5. Match the existing Hammers foil, glass, motion, controls, and typography; use a focused single-question composition, stable bottom navigation, compact progress, and reduced-motion support.
6. Verify the full path on a phone viewport, including close/resume, validation, account checkpoint, Finish handoff, no vertical overflow, and screenshots from at least four representative steps.

## Score lock-down verification
- First inspect the existing authorized migration and report its exact effect plus every reader of `efficiency_score` and `ai_analysis`. Do not rerun an already-applied migration.
- Verify denial with a real regular-user token and successful Report Card rendering with the owner session. Audit service-role responses and daily-plan weaker-side parity.
- Make local code-only leak fixes where required. Do not publish, deploy, redeploy, or run any unrelated migration; report any backend change still requiring separate owner authorization.

## Boundaries
- No changes to legal text, child signup, consent tables, iOS files, or Capacitor configuration.
- No publish, deployment, redeployment, or migration beyond the already named score lock-down authorization.

---

# Analysis-to-plan and daily guidance proposal

## Current facts

### Age protection — unchanged
- Date of birth is checked server-side before account creation. Invalid, future, implausible, or unreadable dates fail closed.
- Under 13 is blocked: no account is created and no alternate child flow is offered.
- Ages 13–17 may continue only after a valid guardian email is supplied. The account is marked as a minor and a guardian-notification attempt is made; that notice does not verify consent or hold the account.
- Adult accounts continue normally. The code labels the 13–17 handling as an interim protection awaiting legal review. This work will not alter any part of it.

### Analysis and Hammers Today today
- Analysis already writes fault-keyed findings into `analysis_fault_findings`; an existing database trigger folds those into `wk_fault_signals` as `video_analysis` evidence.
- The weight-room/speed generator already reads that ledger, ranks at most three root patterns, and adds a non-negative priority bonus only among movements that already passed every legality gate.
- Ranking already uses a 21-day half-life: a finding has full weight today, about half after 21 days, one quarter after 42 days, with a 5% floor.
- The visible Hammers Today skill cards are separately composed in the browser. Their hitting and throwing drills do not currently consume the fault ledger, so the drill shown beside an analysis is not guaranteed to occupy the matching Hammers Today skill slot.
- Report Card supports `report_card` as a source name, but its tile verdicts are currently calculated only for display and are not durably written as fault signals.

## Proposed analysis-to-plan design

1. Add one read-only athlete fault-ledger hook for the visible Hammers Today composer, using the existing ranker and the same top-three/21-day-decay rules as the server generator.
2. For each scheduled hitting or throwing/pitching card, match its highest-ranked same-discipline fault keys through the existing analysis drill matcher and complete drill catalog.
3. Replace at most one existing drill inside that skill card. Never add a card, drill, set, rep, or minute; never change the weekly template, block count, dose, eligibility, recovery, equipment, age, season, or injury gates.
4. Apply the existing drill circulation history and per-fault cap before replacement. If no eligible matched drill exists, preserve the original slot unchanged. Owner-drill eligibility remains an independent gate; an owner drill cannot bypass sport, skill, equipment, completeness, or active-state requirements.
5. Write the selected fault key, source, age/decay weight, matched drill, displaced drill, and selection version into the card's explanation/trace so the choice is replay-visible.
6. Do not alter the frozen generator in this first implementation. The existing server-side priority path remains untouched; the new influence occurs only where the visible skill card fills an already-existing drill position.

### Recency and resolution
- **Decay:** retain the existing 21-day half-life rather than introduce a second formula.
- **Resolved today:** reliable negative evidence is not persisted. A newer clip that does not mention a fault cannot safely prove resolution because missing/unreadable measurements also produce absence. Therefore no fault will be marked resolved merely because it is absent.
- **Practical fade now:** recency decay, top-three ranking, circulation, and the one-slot maximum naturally reduce old findings. A two-month-old signal contributes about 14% before other weighting, rather than driving a week.
- **Reliable future resolution:** persist an explicit per-clip `observed`, `clear`, or `unreadable` state for every measurable fault key. Only repeated recent `clear` observations from readable clips should suppress the fault; `unreadable` must preserve missingness. This needs a separately reviewed persistence change and is not included without authorization.

### Report Card return path
- Do not create a second Report Card-to-plan system. When Report Card returns, its failed, evidence-backed tile keys should enter the same fault ledger with source `report_card`; missing or warning-only tiles should not.
- The prerequisite is durable, server-produced tile verdicts. Current client-only grading is not adequate evidence and should not write directly into the ledger.
- Once those rows exist, the same ranking, decay, slot replacement, circulation, and trace rules apply with no plan rewiring.

## Nutrition before the day/session
- The app already has `nutrition_daily_tips` and a daily-tip function. Tips are selected by sport and optional category, with a two-tip daily limit and viewed-tip rotation.
- The library does **not** store citations, reviewer identity, source URL, or evidence grade. It also has an AI-generation fallback whose output is stored as a tip without a documented clinical review step.
- Therefore no new nutrition advice will be invented or promoted as session-specific yet.
- To build this safely, the owner must supply or approve a sourced library keyed to session context such as heavy lift, speed/power, hitting/throwing skill, game, recovery, and rest. Each tip needs source citation, reviewer/owner approval, safety note, applicable age/sport, and contraindication tags.
- After that library exists, Hammers Today can select one approved one- or two-line tip from the actual upcoming session context and place it in the existing “Before you start” area. It remains one existing fueling surface, not another task or card.

## Mind Fuel+ in the night check-in
- The night check-in is the final of three canonical daily check-ins. It records reflection, sleep goals, mood/stress/discipline, and then locks for the day and shows a nightly recap plus tomorrow's real scheduled workout.
- Its tomorrow preview already has placeholders for Mind Fuel+ and nutrition, but both are deliberately hard-coded off because no real queue backs them.
- Add a single optional “Wind down with Mind Fuel+” action to the completed night-check-in recap, linking to the existing Mental Fuel+ daily checklist/lesson. It will not count as a completed check-in, alter the nightly verdict, or become mandatory.
- If the owner wants it prescribed rather than merely suggested, its appearance should come from Hammers Today's state rather than every night. That requires a real scheduled recommendation source before the preview flag can truthfully turn on.

## Tex Vision facts and recommendation
- Tex Vision is neuro-visual training: 16 drills across beginner, advanced, and chaos tiers. Individual drill labels range from roughly 1–2 to 3–5 minutes.
- A daily checklist requires at least two drills, so a normal minimum session is several minutes. Results, accuracy, streaks, session counts, and tier progression are recorded. That makes it a real training exposure, not merely a passive tip.
- The app currently suggests Tex Vision before 10 a.m. whenever readiness is not red/recovery. That is a clock heuristic, not evidence that it matches the day's plan. It is also unavailable to softball accounts pending content parity.
- **Recommendation:** do not pin it daily. Let Hammers Today prescribe a short Tex Vision primer only when the day's skill/session and athlete state make it relevant, with no suggestion on recovery/red-readiness days and no stacking when a vision session is already complete. Longer/progression sessions remain scheduled training load.
- Nutrition, Mind Fuel+, and Tex Vision should compete for relevance in the existing “Before you start” area rather than all appearing every day. The plan should show the smallest useful set for today's state, protecting attention as well as physical load.

## Implementation boundary awaiting owner ruling
- Build now after approval: the one-slot analysis influence in existing hitting/throwing cards, the optional Mind Fuel+ recap action, and tests proving plan shape is unchanged.
- Hold: session-specific nutrition until an approved sourced library exists; durable Report Card signal writes and explicit resolved-fault state until their persistence design is authorized; adaptive Tex Vision scheduling until the owner rules on the recommendation.
- No publishing, deployment, redeployment, or migration. The already-applied score lock migration will not be rerun.

## Still-outstanding verification
- Unified sign-up exists locally, but a real email-confirmation return, full account checkpoint, Finish handoff, and post-confirmation resume remain unverified end to end.
- The score migration removes ordinary direct reads of `videos.efficiency_score` and `videos.ai_analysis`, preserves owner/admin RPC reads, and exposes only aggregate side-split inputs to the athlete. Owner Report Card rendering was verified; denial with a real regular-athlete token and daily-plan weaker-side parity remain unverified.
- Service-role functions require separate code gates because the database column grant does not constrain them. Local gates/removals exist for the known response paths, but they have not been deployed under the standing rule.
