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