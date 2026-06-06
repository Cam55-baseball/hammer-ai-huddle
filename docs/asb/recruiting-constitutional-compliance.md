# Recruiting Constitutional Compliance Audit

**Sprint:** RR-9 / RR-10 Authority Correction
**Date:** 2026-06-06
**Engine:** `rr9-1.0.0`
**Scope:** every recruiting-rendering path in the app.

---

## Compliance matrix

| # | Question | Answer | Evidence |
|---|---|---|---|
| 1 | Does athlete own visibility authority? | **YES** | `public.athlete_recruiting_consent` PK = `athlete_id`; INSERT/UPDATE RLS policies pin `athlete_id = auth.uid()`. Athlete-only write path in `src/hooks/useRecruitingConsent.ts:setVisibility` (throws if `user.id !== athleteId`). |
| 2 | Can any viewer override athlete authority? | **NO** | No RLS write policy permits a non-self actor to write the row. `CoachAthleteDetail.tsx` no longer holds local `recruitingOptIn` state; the `Switch`/`Label` controlled by the scout has been removed. |
| 3 | Can minors appear without protection checks? | **NO** | `resolve_recruiting_visibility(athlete_id)` requires `(NOT is_minor OR parent_authorized)`. `is_minor` fails closed (unknown DOB → treated as minor). Server-side RLS denies viewer reads when this returns false. Client `RecruitingVisibilityGate` (`src/components/recruiting/RecruitingVisibilityGate.tsx`) renders nothing when `resolved_visibility` is false. |
| 4 | Can recruiters bypass RR-9? | **NO** | RLS policy `viewers read resolved-visible consent` requires `resolve_recruiting_visibility(athlete_id) = true` AND viewer holds coach/recruiter/scout role. Direct SQL or REST access returns zero rows when off. |
| 5 | Can coaches bypass RR-9? | **NO** | Same RLS policy applies to coaches. UI also wrapped in `RecruitingVisibilityGate` at `src/pages/CoachAthleteDetail.tsx:198-233`. |
| 6 | Can stale cache bypass RR-9? | **NO** | `useRecruitingConsent` invalidates `["recruiting-consent", athleteId]` on every successful write. Server is the final truth on every render path because `resolve_recruiting_visibility` is RPC-called each fetch. Even with a stale client cache, RLS denies the underlying read. |
| 7 | Can direct links bypass RR-9? | **NO** | The recruiting render lives only inside `<RecruitingVisibilityGate>`. Routes to `CoachAthleteDetail` still pass through the gate, and direct REST access against the recruiting payload tables (`asb_events`, `hie_snapshots`) does not synthesize a recruiting view — only the gate renders one. |
| 8 | Can role switching bypass RR-9? | **NO** | RLS evaluates `auth.uid()` per query; switching profile role re-evaluates `has_role(...)` and `resolve_recruiting_visibility`. The gate also re-renders because `useAuth().user.id` changes. |
| 9 | Can replay bypass RR-9? | **NO** | Replay must reconstruct from `athlete_recruiting_consent_audit` (append-only, lineage-complete) plus `is_minor` at the replay time. `resolve_recruiting_visibility` is pure and deterministic at pinned `engine_version`. There is no parallel surface that mutates organism truth from replay. |
| 10 | Are RR-9 and RR-10 now constitutionally sealed in implementation? | **YES** | Authority owner ratified (athlete), storage canonicalized (`athlete_recruiting_consent`), audit lineage append-only, server authority via `resolve_recruiting_visibility`, fail-closed gate (`RecruitingVisibilityGate`) is the single render chokepoint, hitter recruiting surface joins parity (`HittingRecruitingCard`), and ASB lineage events emitted on every consent change and gate block. |

---

## Subordination

Subordinate to Eternal Laws, RR-1…RR-10, Megaphase 151–160, and all prior
immutable invariants across Phases 1–150.

---

## P1-F Appendix — Parent Authorization Completion

Following the P1-F sprint, the 10 constitutional questions remain at
**10/10 PASS**, and the parent authorization lifecycle is now complete.
See:

- `docs/asb/parent-authorization-model.md` — authority model.
- `docs/asb/parent-authorization-verification.md` — 13/13 hostile PASS.
- `docs/asb/minor-recruiting-ratification.md` — 8/8 PASS.
- `docs/asb/minor-governance-completion.md` — 10/10 YES.
- `docs/asb/baseball-launch-reratification.md` — public launch YES.

Key constitutional facts now in production:

- `parent_authorized` is writable **only** by an authorizing parent;
  trigger `enforce_parent_authorization_authority` raises `42501`
  otherwise (defence-in-depth alongside RLS).
- `parent_athlete_links` is the single source of truth for who may
  authorize for whom.
- Athletes cannot self-authorize; coaches/recruiters/scouts/admins
  cannot authorize.
- Revocation is supported, lineage-complete, and ASB-emitted with
  `change_type='revoke'`.
- Aging-out is automatic via age-derived `is_minor()`.
