- Service-role functions returning athlete data to a non-self viewer must pass `_shared/recruitingGate.ts`. Why: service role skips RLS.
- `create-test-athlete` is owner-only and the only way to run the real generator as the demo test pitcher. Why: no approval-free session mint exists for other users.
- Every measurement goes through `public.ledger_record` (source triggers + `ledger_record_tiles`); triggers swallow their own errors. Why: new measurements join baselines by declaring themselves; recording must never cost a clip.
- Read nested AGENTS.md before edits: `src/lib/{intelligence,biomech,reportCard,prescription,tour,upload}`, `src/lib/hammer/prescription` (warm-up), `src/components/{parent,hammer/cards}`, `supabase/functions/{_shared/wic,wk-daily-plan-job}`, `src/archive/retired-programs`; also settings, ratings, analyze-video.
<!-- LOVABLE:BEGIN -->
- Throwing uses a separate conservative overhand gate and one pose runner for both sports, never mound or AI-vision values. Why: field throws lack a windup and batting clips can mimic a throw.
<!-- LOVABLE:END -->
- No publish/deploy/redeploy/migration without named owner authorization; apply only that change and report live/pending status. Why: unauthorized redeploys went live.
- The shared empty-upload encouragement is a standalone sibling below the upload card, outside the Report Card access gate. Why: shown to all eligible athletes without exposing measurements.
- Analysis findings may influence Hammers Today only through a downstream one-slot skill overlay: top-three ledger priority, 21-day decay, exact fault matching, equipment eligibility, circulation, and no card/dose/duration changes; owner slots are never displaced. Why: findings should shape existing work without becoming a second plan generator.
- Coach/scout roles suppress unsolicited module advertising even on dual-role accounts, but purchase pages and subscribed module navigation remain accessible on deliberate visits under the storefront gate. Why: staff buy without being sold to.
- Landing opening: full sequence on first install, skippable short one on later launches; final wipe waits for the landing page. Why: owner's launch identity without an unloaded page.
- Verify anything a player does signed in as a player (or the affected role), never only as owner/admin. Why: owner accounts skip gates (2026-10-04).
- Never prescribe or recommend an athlete action that the affected athlete cannot open; keep unreleased Game IQ suppressed at one presentation switch until its routes open to athletes. Why: inaccessible prescriptions look broken.
- Athlete-facing headings, notices and status lines must make sense to a 14-year-old; translate plan reasons only at the display edge. Why: athletes must understand without guessing.
- Label every athlete-facing value by kind. Why: bare values confuse athletes.
- Demo auto-start outcomes and inspector state/events go to console.debug only, never app UI. Why: diagnostics are not for users.
- No plan is built for an account without `profiles.hammers_today_started_at` while switch `hammers_today_start_gate` is on — enforced in `wk-generate-daily`, and the client mounts no plan provider before the start. `wk-daily-plan-job` builds only missing plans for started players. Why: one start per account, the same on every device.
- Sessions end only by explicit Sign out (`signOut({ scope: 'local' })`) or server end; `/` and `/auth` forward signed-in players after session load; native auth key mirrored to `@capacitor/preferences` (`src/lib/auth/nativeSessionStore.ts`), restored in `main.tsx`. Why: iOS may clear WebView storage.
- Anonymous training store: bucketed, week-rounded, no free text, Vault-HMAC key; under-13 needs parent opt-in. Why: lawyer-approved scope.
- The plan screen shows the device's last saved plan, start flag and access at once, but acts only after this visit's server answer; device copies clear on Sign out. Why: a reload must never flash, rebuild or change the plan.
- Problem reports save to `problem_reports` first; `report-problem-mailer` only sends/retries. Why: a broken email key never loses a report.
- 13–17 parent waiver gating lives only in `supabase/functions/_shared/legal/teenWaiverRules.ts` (used by `teen-parent-waiver` and tests); `TeenWaiverGate` wraps only the training-plan routes. Why: one rule source, and non-physical parts of the app stay open.
- Pairings (org/coach/player/scout) only via `connection_requests` + definer RPCs (`send_/respond_connection_request`, `end_connection`, `join_by_invite_code`); org coaches see only `org_athlete_assignments`; unverified non-solo orgs add no athletes. Why: one inbox, server checks, instant revocation.
- Staff plan purchase eligibility lives only in `supabase/functions/_shared/staffEligibility.ts` (used by create-staff-checkout and tests). Why: one rule for age, coach role and org-admin status.

- Staff sign-up: `/get-started` → `/signup/:role` (adults, `src/lib/auth/staffSignup.ts`); approvals reuse existing queues. Why: one approval system.
- Read game-specific AGENTS.md in `src/components/games`, `src/lib/games`, and `supabase/functions/gp-ingest-document` before edits. Why: game rules live with their scope.
- Advice reads never await rechecks; show read failures. Why: failures are not empty lists.
