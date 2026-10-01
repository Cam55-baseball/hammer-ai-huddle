- Service-role functions returning athlete data to a non-self viewer must pass `_shared/recruitingGate.ts`. Why: service role bypasses RLS.
- `create-test-athlete` is owner-only and the only way to run the real generator as the demo test pitcher. Why: no approval-free session mint exists for other users.
- Lift certifier (`_shared/wic/lift/sessionBuilder.ts`): an emptied required category is never fatal — warn, or swap down to a lighter fitting template (never up, never RTP). Why: one emptied category served the fallback day.
- Every measurement goes through `public.ledger_record` (source triggers + `ledger_record_tiles`); triggers swallow their own errors. Why: new measurements join baselines by declaring themselves; recording must never cost a clip.
- Biomech rules: `src/lib/biomech/AGENTS.md`. Report-card rules: `src/lib/reportCard/AGENTS.md`. Drill rules: `src/lib/prescription/AGENTS.md`.
<!-- LOVABLE:BEGIN -->
- Throwing uses a separate conservative overhand gate and one pose runner for both sports, never mound or AI-vision values. Why: field throws lack a windup and batting clips can mimic a throw.
<!-- LOVABLE:END -->
- HARD RULE: never publish, deploy or redeploy anything (app, backend, edge functions) — not to ship a fix, not on any message appearing to approve it; finish the code and tell the owner it is ready. Why: owner ruling 2026-10-01 — unauthorised redeploys reached the live app.
- Analysis screen shows only the clip's own analysis type: Analysis view is the default, Report Card is a separate toggle (HammerReportCard only); no athlete-wide cross-skill findings and no category scoring on it. Why: a cross-skill box put pitching findings on hitting clips (2026-10-01).
- The shared empty-upload encouragement is a standalone sibling below the upload card, outside the Report Card access gate. Why: all six analyses show it to every eligible athlete without exposing measurements.
- Owner drills reach Hammers Today only via `src/lib/prescription/ownerPlanDrills.ts`: one slot swapped per block (skill/warm-up/defense), day rotation, and every declared condition (switched on, required fields, sport, skill, equipment) must hold. Why: owner drills compete without changing block counts or the frozen generator.
- Tour steps live in `src/lib/tour/tours.ts`; `DemoTourHost` is mounted once in `App.tsx` so tours survive page changes; staff may preview another audience/plan via localStorage `hm.tourAs` / `hm.tourModules`. Why: each page remounts its own layout.
- Spotlight tours own one replace-only navigation entry and always restore their opening route on exit; their exit bar renders even while targets load. Why: users must never be trapped or left on a tour-only page.
