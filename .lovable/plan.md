# P1-F — Parent Authorization Completion Sprint

Constitutional completion only. No new intelligence, scoring, recruiting systems, doctrine, onboarding, or softball work. Closes the RR-10 parent-governance loop so minors can publicly launch.

## Current verified state (no rework)

- `public.athlete_recruiting_consent` (athlete-owned, RLS fail-closed) — already exists.
- `public.athlete_recruiting_consent_audit` (append-only via `record_recruiting_consent_change` trigger) — already exists.
- `public.resolve_recruiting_visibility(uuid)` and `public.is_minor(uuid)` — already exist.
- `RecruitingVisibilityGate` single chokepoint, `useRecruitingConsent` hook, athlete `/athlete/recruiting-consent` page — already exist.
- `relational.exposure.consent_changed` + `relational.exposure.gate_blocked` ASB topics — already emitted.

**Gap:** `parent_authorized` is a column with no canonical write path. There is no `parent` role, no parent↔athlete linkage table, no parent surface. The athlete cannot self-flip it (RLS allows the athlete to update the row, but doing so would violate RR-10 — needs trigger enforcement).

## Sprint scope

### Section A — Authority model audit (doc only)
`docs/asb/parent-authorization-model.md` documenting authority owner, source, storage, read/write paths, audit/replay lineage, failure modes, revocation, aging-out (minor → adult flip). Explicitly answers the five "who" questions with file:line + SQL evidence.

### Section B — Parent linkage + write surface (DB)

Single migration:

1. **Enum extension:** `ALTER TYPE app_role ADD VALUE 'parent'`.
2. **`public.parent_athlete_links`** — canonical linkage:
   - `parent_user_id uuid → auth.users`, `athlete_user_id uuid → auth.users`, `relationship text`, `status text` (`pending|active|revoked`), `invited_at`, `accepted_at`, `revoked_at`, unique `(parent_user_id, athlete_user_id)`. Created via existing `parent_invite_dispatches` accept flow (reuses dispatcher; no new invite UI).
   - GRANT to `authenticated` + `service_role`. RLS: parent reads/writes own row; athlete reads own row; service_role full.
3. **`public.is_authorizing_parent(_parent uuid, _athlete uuid)`** security-definer helper returning true when an active link exists.
4. **Trigger `enforce_parent_authorization_authority` on `athlete_recruiting_consent`:** if `NEW.parent_authorized` differs from `OLD.parent_authorized`, require `auth.uid()` to satisfy `is_authorizing_parent(auth.uid(), NEW.athlete_id)`; otherwise `RAISE EXCEPTION 'rr10: only an authorizing parent may change parent_authorized'`. Athletes, coaches, recruiters, scouts, and admins are blocked. The trigger also stamps `actor_role='parent'` and `reason` on the audit row.
5. **New RLS policy** on `athlete_recruiting_consent`: parent of athlete may `SELECT` and may `UPDATE` only the `parent_authorized` column (enforced via trigger above + a column-aware policy).
6. **Aging-out:** since `is_minor()` is age-derived, no migration needed — the resolver re-evaluates on every read and `parent_authorized` becomes irrelevant once the athlete turns 18. Document this in Section A.

### Section C — Parent revocation
Same trigger path: parent sets `parent_authorized=false`; audit row records previous→new; existing `emitExposureConsentChanged` ASB event fires (extended with `actor_role: 'parent'` + `change_type: 'revoke'`); `RecruitingVisibilityGate` re-resolves on next render (already wired via React Query invalidation on the consent key — gate also invalidates on the ASB topic).

### Section D — Single canonical resolver (verification only)
Audit every caller of recruiting visibility — confirm only `resolve_recruiting_visibility` and `useRecruitingConsent` are used; document call sites in Section A doc. Remove any stray local checks if found.

### Section E — Parent-facing surface
- New route `/parent/athletes` (`src/pages/ParentAthletes.tsx`) — lists linked athletes via `parent_athlete_links` with status, athlete name, minor flag, current `parent_authorized` state, last-change timestamp.
- New route `/parent/athletes/:athleteId/recruiting` (`src/pages/ParentRecruitingAuthorization.tsx`) — approve/deny/revoke toggle, consequences copy, audit history (reuses `useRecruitingConsentAudit`). Guarded by `is_authorizing_parent` check at mount.
- New hook `src/hooks/useParentLink.ts` and `useParentRecruitingAuthorization.ts` wrapping the write path (trigger does the enforcement).
- Wire both routes into `src/App.tsx`.

### Section F — Hostile parent governance verification
13 scenarios in `docs/asb/parent-authorization-verification.md` with PASS/FAIL/BLOCKED + SQL evidence:
parent approves, parent denies, parent revokes, athlete toggles consent (parent flag preserved), recruiter refresh, coach refresh, role switch, direct link bypass, cached query bypass, session replay, unauthorized parent (different family), unauthorized recruiter writing `parent_authorized`, unauthorized athlete writing `parent_authorized`.

### Section G — Minor recruiting ratification
`docs/asb/minor-recruiting-ratification.md` — 8 cases (minor+approved, minor+denied, minor+revoked, adult unaffected, coach/recruiter/scout visibility per case, no bypass) each PASS/FAIL with evidence.

### Section H — Constitutional completion audit
`docs/asb/minor-governance-completion.md` — 10 YES/NO questions per spec with file:line + SQL evidence. Target: 10/10 YES.

### Section I — Baseball public-launch re-ratification
`docs/asb/baseball-launch-reratification.md` recomputed from scratch (no inheritance): readiness %, P0/P1 blockers, adult/minor/overall verdicts, exact remaining work, YES/NO public launch for all athletes.

## Files

**Migration (1):** parent enum value, `parent_athlete_links` table + RLS + GRANTs, `is_authorizing_parent` function, `enforce_parent_authorization_authority` trigger, new column-aware RLS policy on `athlete_recruiting_consent`.

**New code:**
- `src/hooks/useParentLink.ts`
- `src/hooks/useParentRecruitingAuthorization.ts`
- `src/pages/ParentAthletes.tsx`
- `src/pages/ParentRecruitingAuthorization.tsx`
- `src/lib/asb/topics/exposure.ts` — extend payload with `actor_role` + `change_type` (additive).

**Edited:**
- `src/App.tsx` — two routes.
- `src/hooks/useRecruitingConsent.ts` — surface `is_parent` for the consent page banner (read-only).

**Docs (6 new):** parent-authorization-model, parent-authorization-verification, minor-recruiting-ratification, minor-governance-completion, baseball-launch-reratification; updated appendix on recruiting-constitutional-compliance.

## Out of scope
Parent onboarding/invite UX redesign (reuses existing `parent_invite_dispatches`), softball, UHRC, Hammer, coach surfaces, scoring, new pillars, copy polish.

## Return on completion
Parent governance audit, hostile verification matrix, launch readiness %, remaining blockers, adult / minor / baseball public launch verdicts, recommended next sprint.
