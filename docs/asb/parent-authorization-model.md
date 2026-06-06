# Parent Authorization Model (RR-10) — P1-F

Section A of the P1-F Parent Authorization Completion Sprint. This
document is the canonical authority model for parent-driven recruiting
authorization. All other docs in this sprint cite it.

## Five-question matrix

| Question | Answer | Evidence |
|---|---|---|
| **Who can authorize?** | An *authorizing parent* — a user with a row in `public.parent_athlete_links` where `parent_user_id = auth.uid()`, `athlete_user_id = <athlete>`, `status = 'active'`, `revoked_at IS NULL`. | Migration `20260606*`: `is_authorizing_parent(_parent, _athlete)`. |
| **Who can revoke?** | The same authorizing parent, by setting `parent_authorized = false`. | Trigger `enforce_parent_authorization_authority` (same migration). |
| **Who can override?** | No one. Athletes, coaches, recruiters, scouts and admins are all rejected by the trigger when attempting to change `parent_authorized`. | `enforce_parent_authorization_authority` raises `42501`. |
| **Who can view?** | (a) the athlete themself — RLS policy `athlete reads own consent`; (b) the authorizing parent — RLS policy `authorizing parent reads consent`; (c) any coach/recruiter/scout for whom `resolve_recruiting_visibility(athlete_id) = true` — RLS policy `viewers read resolved-visible consent`. | `pg_policies` on `athlete_recruiting_consent`. |
| **Who can audit?** | The athlete reads their own audit (`athlete reads own consent audit`). Service role reads everything. Parent audit visibility flows through the parent surface which reads the shared `athlete_recruiting_consent_audit` via the athlete RLS scope when surfacing — parents do not currently receive an independent SELECT policy on the audit table (deliberate: audit history belongs to the athlete). | `pg_policies` on `athlete_recruiting_consent_audit`. |

## Authority owner

The **athlete** owns visibility (`visibility_enabled`). The
**authorizing parent** owns the minor's authorization
(`parent_authorized`). Both flags must be true *and* the athlete must
either be an adult or have an active parent authorization for
`resolve_recruiting_visibility` to return true.

```text
resolve_recruiting_visibility(athlete) =
     visibility_enabled
  AND (NOT is_minor(athlete) OR parent_authorized)
```

`is_minor()` is age-derived from `public.profiles.date_of_birth` and
fails closed (unknown DOB → treated as minor).

## Storage

| Field | Location |
|---|---|
| Athlete visibility intent | `public.athlete_recruiting_consent.visibility_enabled` |
| Parent authorization | `public.athlete_recruiting_consent.parent_authorized` |
| Audit lineage | `public.athlete_recruiting_consent_audit` (append-only, trigger-fed) |
| Parent↔athlete link | `public.parent_athlete_links` |
| Minor status | derived at read time via `public.is_minor()` |

There are no parallel surfaces, no caches authoritative for visibility,
no role flags carrying authorization independently. All consumers route
through `resolve_recruiting_visibility`.

## Read path

```text
client → useRecruitingConsent (src/hooks/useRecruitingConsent.ts)
       → supabase.rpc('resolve_recruiting_visibility', { _athlete_id })
       → server: SELECT against athlete_recruiting_consent + is_minor()
```

Single chokepoint for UI rendering: `RecruitingVisibilityGate`
(`src/components/recruiting/RecruitingVisibilityGate.tsx`).

## Write paths

| Field | Hook | DB enforcement |
|---|---|---|
| `visibility_enabled` (athlete) | `useRecruitingConsent.setVisibility` (`src/hooks/useRecruitingConsent.ts`) | RLS `athlete updates own consent`; client refuses if `user.id !== athleteId`. |
| `parent_authorized` (parent) | `useParentRecruitingAuthorization.setParentAuthorized` (`src/hooks/useParentRecruitingAuthorization.ts`) | RLS `authorizing parent updates parent_authorized` + trigger `enforce_parent_authorization_authority` (raises `42501` otherwise). |

No other write paths exist. Coaches, recruiters, scouts, and admins have
no RLS UPDATE policy on `athlete_recruiting_consent` and are additionally
trigger-blocked from changing `parent_authorized`.

## Audit lineage

Trigger `record_recruiting_consent_change` runs BEFORE INSERT OR UPDATE
and writes one row per *actual* state change to
`athlete_recruiting_consent_audit` with:

- `previous_state` / `new_state` JSON snapshots
- `changed_by = auth.uid()` (or `NEW.last_changed_by` fallback)
- `actor_role`: `'parent'` if the actor is an authorizing parent for the
  athlete, otherwise `'athlete'`.

## Replay path

Both write paths emit `relational.exposure.consent_changed` via
`emitExposureConsentChanged` (`src/lib/asb/topics/exposure.ts`) with
`actor_role` and `change_type` ∈ `{grant, revoke, toggle}`. The gate
emits `relational.exposure.gate_blocked` on each fail-closed render.
ASB lineage is preserved through `asb_events` + `asb_event_lineage`.

## Failure modes

| Mode | Behaviour |
|---|---|
| Unknown DOB | `is_minor()` returns true → resolver returns false → hidden. |
| `resolve_recruiting_visibility` RPC errors | `useRecruitingConsent` fails closed (returns `false`). |
| Unauthorized actor attempts parent flip | Trigger raises `42501`; no row written, no audit row. |
| Audit insert fails | Atomic with the consent UPDATE — both roll back. |
| Athlete deletes account | `ON DELETE CASCADE` on FK removes consent row and links. |

## Revocation behaviour

`setParentAuthorized(false)` triggers a normal UPDATE; the audit row
records `parent_authorized: true → false` with `actor_role='parent'` and
`change_type='revoke'`. Visibility recomputes on the next call to
`resolve_recruiting_visibility` (React Query invalidation forces this on
the next render). RecruitingVisibilityGate immediately re-renders to the
fail-closed branch and emits `gate_blocked` with reason
`minor_without_parent_authorization`.

## Minor aging-out behaviour

`is_minor()` is computed at read time from `date_of_birth`. The day the
athlete turns 18, the resolver stops requiring `parent_authorized` and
the visibility re-evaluates purely from `visibility_enabled`. No
migration, sweep job, or background process is needed. The
`parent_authorized` value is preserved as historical state but no longer
gates visibility.

## Callers of `resolve_recruiting_visibility`

Audit performed at sprint completion:

- `src/hooks/useRecruitingConsent.ts:fetchResolvedVisibility` — sole client caller.
- `RecruitingVisibilityGate` consumes the resolver via the hook.
- Server-side RLS policy `viewers read resolved-visible consent` calls the resolver directly for SELECT.

No other client-side visibility calculations were found
(`rg "recruitingOptIn|recruiting_visibility|parent_authorized" src/`).
