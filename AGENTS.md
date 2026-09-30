- Service-role functions returning athlete data to a non-self viewer must pass `_shared/recruitingGate.ts`. Why: service role bypasses RLS.
- `create-test-athlete` is owner-only and the only way to run the real generator as the demo test pitcher. Why: no approval-free session mint exists for other users.
- Lift certifier (`_shared/wic/lift/sessionBuilder.ts`): an emptied required category is never fatal — warn, or swap down to a lighter fitting template (never up, never RTP). Why: one emptied category served the fallback day.
- Every measurement goes through `public.ledger_record` (source triggers + `ledger_record_tiles`); triggers swallow their own errors. Why: new measurements join baselines by declaring themselves; recording must never cost a clip.
- Biomech rules: `src/lib/biomech/AGENTS.md`. Report-card rules: `src/lib/reportCard/AGENTS.md`.
<!-- LOVABLE:BEGIN -->
- Throwing uses a separate conservative overhand gate and one pose runner for both sports, never mound or AI-vision values. Why: field throws lack a windup and batting clips can mimic a throw.
<!-- LOVABLE:END -->
