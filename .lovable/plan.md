# Production Path Activation Sprint

Activation-and-verification sprint only. No new architecture, doctrine, intelligence, or pillars. Closes the one remaining production gap (invite acceptance → linkage activation), then runs runtime rehearsals and produces operational documentation.

## Verified gap (single P1)

`acceptParentInvite` (`src/lib/runtime/relational/parentLinking.ts:169`) emits `relational.relationship.confirmed` but does **not** insert a row into `public.parent_athlete_links`. Without that row, `is_authorizing_parent()` returns false and the RR-10 trigger blocks every parent authorization write — minors stay hidden forever in real onboarding.

Adjacent state:
- `parent_invite_dispatches` (send-side dispatch log) exists; no acceptance pathway writes to `parent_athlete_links`.
- `AcceptParentInvite.tsx` (route `/accept-parent-invite`) already decodes the token and calls `acceptParentInvite`.
- `parent_athlete_links` schema, RLS, and `is_authorizing_parent()` are already shipped.

## Section A — Parent invite activation (the only code change)

**Approach:** activate the linkage from the trusted server side, driven by the canonical `relational.relationship.confirmed` ASB event. The client keeps emitting; the server projects.

1. **DB trigger** on `public.asb_events` AFTER INSERT, `WHEN topic_id = 'relational.relationship.confirmed'`:
   - Read `payload.relationship_id`, `athlete_id`, `actor_id` (parent_user_id), `payload.relationship` (default `'parent'`).
   - `INSERT INTO parent_athlete_links (parent_user_id, athlete_user_id, relationship, status, invited_at, accepted_at) VALUES (...,'active', occurred_at, occurred_at) ON CONFLICT (parent_user_id, athlete_user_id) DO UPDATE SET status='active', accepted_at=COALESCE(parent_athlete_links.accepted_at, EXCLUDED.accepted_at), revoked_at=NULL WHERE parent_athlete_links.status <> 'revoked' OR EXCLUDED.accepted_at IS NOT NULL`.
   - Mirror revoke: on `relational.relationship.revoked`, set `status='revoked', revoked_at=occurred_at`.
   - `SECURITY DEFINER`, `search_path=public`, idempotent, never throws (wrap in `BEGIN/EXCEPTION WHEN OTHERS THEN PERFORM 1; END`).
2. **Backfill** existing confirmed/revoked events into `parent_athlete_links` in the same migration (idempotent via `ON CONFLICT`).
3. **Dispatch correlation** (no schema change): after successful `acceptParentInvite` in `AcceptParentInvite.tsx`, fire-and-forget update of the matching `parent_invite_dispatches` row to `status='accepted'` (best-effort, RLS-scoped to dispatches the parent can see; failure does not block).

**Why a trigger, not client RPC:** trigger guarantees replay-safety (linkage is a deterministic projection of the ledger), idempotency, multi-device safety, and refresh safety — all required by the sprint brief — without trusting client code.

## Section B — Minor journey rehearsal

Script `scripts/rehearse-minor-journey.ts` (runtime, not a doc). Walks SQL-level evidence for:
athlete signup → DOB → `is_minor()=true` → recruiting consent default hidden → invite emit (`relational.relationship.created`) → accept (`relational.relationship.confirmed`) → trigger fires → `parent_athlete_links` row active → parent flips `parent_authorized=true` via `ParentRecruitingAuthorization` → `resolve_recruiting_visibility()=true` → coach/recruiter gates open. Capture each event_id, row, and `file:line`.

## Section C — Failure recovery matrix

Re-run the rehearsal with the 9 hostile cases from the brief (double-accept, refresh, second device, revoke/re-authorize, athlete toggle, viewer refresh mid-transition). PASS/FAIL/BLOCKED + evidence per case. Results land in `docs/asb/production-rehearsal.md`.

## Section D — Onboarding production audit

`docs/asb/onboarding-production-audit.md` — trace every entry point (`/auth`, `/onboarding`, `/parent-invite`, `/accept-parent-invite`, `/athlete/recruiting-consent`, `/parent/athletes`, `/parent/athletes/:id/recruiting`). List dead-ends, orphan flows, manual-SQL requirements, admin interventions. Target: zero.

## Section E — Operational readiness audit

`docs/asb/operational-readiness-audit.md` — enumerate required setup, manual steps, hidden deps, env assumptions, missing seed/production data for new athlete / parent / coach / recruiter.

## Section F — Final production rehearsal

Adult, minor, pitcher, hitter, coach, recruiter, parent journeys executed against the live runtime. Results table (PASS/FAIL/BLOCKED + evidence) appended to `docs/asb/production-rehearsal.md`.

## Section G — Launch operations package

`docs/asb/launch-operations-package.md` — launch / rollback / monitoring / support / escalation checklists; critical dashboards, ASB topics (`relational.relationship.*`, `relational.exposure.consent_changed`, `relational.exposure.gate_blocked`), DB tables (`asb_events`, `parent_athlete_links`, `athlete_recruiting_consent`, `*_audit`), and alert conditions.

## Section H — Final go/no-go ratification

`docs/asb/final-launch-ratification.md` — 10 yes/no questions from the brief, each with file:line or SQL evidence. Compute launch readiness %, GO / NO-GO.

## Out of scope

Parent onboarding UX redesign, softball, UHRC, Hammer, new pillars, copy polish, new ASB primitives, intelligence work, infra changes.

## Files

**Migration (1):** new — trigger `project_relationship_to_parent_link` + backfill + revoke mirror.

**Code edits (1):** `src/pages/AcceptParentInvite.tsx` — best-effort dispatch status update post-accept.

**Scripts (1):** `scripts/rehearse-minor-journey.ts` (read-only SQL probes).

**Docs (4):** `onboarding-production-audit.md`, `operational-readiness-audit.md`, `production-rehearsal.md`, `launch-operations-package.md`, `final-launch-ratification.md`.

## Return on completion

Operational audit · production rehearsal results · remaining blockers · launch readiness % · GO/NO-GO · recommended next sprint.
