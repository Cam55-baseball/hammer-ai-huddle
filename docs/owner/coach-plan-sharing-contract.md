# AR2 — Canonical coach plan sharing boundary

Status: design contract only, not a completed coach section. No live changes applied.

## Exact source

The final skill cards shown to an athlete are `HammerDailyPlanResult.blocks` from the existing daily builder after schedule, safety, owner slots, analysis and practice context. They include drill identity, stages, dosage, Because lines and availability. `wk_prescriptions` contains persisted lifting/conditioning work, not the complete client-built skill plan. Reading those rows alone cannot truthfully show “Hammers' plan for this player.”

The eventual sharing source must contain the athlete's actual final plan, not a coach-side reconstruction or a second generator. Capture only after this visit's canonical server answer and start/access resolution. The source must include athlete/date/sport, engine/version identity, the exact final blocks and source/task identities for completion and learning follow-up. Missing final skill data is unavailable, not an empty finished plan.

## Server boundary required before UI

- Authenticate the viewer from the server session; roles come from `public.user_roles`.
- Require an active accepted coach relationship or authorized org-admin roster relationship. Org coaches require the canonical assignment. Recheck revocation on each read; client role flags and broad scout/recruiting visibility are insufficient.
- Service-role non-self reads must also pass `_shared/recruitingGate.ts`, but that gate alone is not coach-only training-sharing permission.
- Resolve the existing training-sharing consent and any required parent control explicitly. Health-sharing is separate and cannot stand in for training consent.
- Never return training plans to a scout-only viewer. A dual-role staff account requires a deliberate authorized coach/org context, never a scout-context read.
- Without health-sharing, redact health-bearing reasons and metadata on the server. If safe separation is not proven, omit that reason rather than exposing pain, readiness or injuries.
- Return explicit denied/unavailable/read-failed states, not fabricated work or silently empty data.

## Coach presentation after this boundary exists

Render the same current focus/Because and today's prescribed work next to Development, preserving its existing issue summaries. Weekly work must come from actual dated prescriptions; the athlete's projected roadmap is not proof those future tasks were prescribed or done. Show exact task completion from canonical logs. Six-week summaries and “What worked” require comparable sport/category/task evidence, not AI commentary or inferred outcomes. Keep coach notes and safety-checked From Coach work. No training doses are authored by this section.

## Acceptance still required

Phone checks as affected TEST coach and org admin, unrelated/revoked staff denial, scout exclusion, health consent on/off, empty new player, and TEST hitter/pitcher with real source histories. A source-only or owner-only test is not this proof.

## Current blockers

No secure endpoint currently returns the final athlete skill plan under verified training-sharing consent. A durable canonical final-plan source and exact server access implementation are prerequisites. Live schema/function application requires named owner authorization for that change. No placeholder UI or alternate plan store was added in AR2.

## AR4 source and permission trace

The final display source is `src/components/hammer/HammerDailyPlan.tsx`: after the daily builder it applies the CNS phase clamp, canonical analysis overlay and athlete adjustments. The shared source must be captured after these, not merely after `buildHammerDailyPlan`. Canonical task completion is read through `useHammerDailyTasks` with the prescription date and side identity; a served drill is not completed work.

`CoachAthleteDetail.tsx` and `CoachDevelopmentTab.tsx` are the existing presentation targets. Parent training opt-in / anonymous-training consent in `parent-consent` does not establish coach training-plan sharing. The general recruiting gate is necessary for service-role reads but insufficient to authorize these plans. No existing verified endpoint was found that combines final skill source, coach/org-context authorization and training-sharing consent.

Do not widen an existing report endpoint, reuse health consent as training consent, display a projected week as completed prescriptions, or render lifting rows as the athlete's skill plan. Coach implementation remains blocked on the exact canonical capture and consent/read contract; no duplicate plan storage, speculative permission logic, live function changes or placeholder coach UI were added.