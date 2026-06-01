# Relational Onboarding Flow (Phase A §4)

**Status:** Production-active. Additive overlay on existing `OnboardingFlow`.
**Authority:** Phase 151 visibility firewall, Phase 154 developmental gating, Eternal Laws, RR-1…RR-3.
**Reservation honored:** RR-4 (relationship primitive) remains sealed — no `relational.relationship.*` emissions in this bootstrap.

## Trigger

`src/pages/OnboardingFlow.tsx` calls `emitOnboardingBootstrap(user)` once per
mount, guarded by an in-process ref. Failures degrade visibly via
`console.warn` but never block onboarding progression.

## Flow map

```text
auth.user (session)
   │
   ▼
OnboardingFlow mount ──► useEffect (idempotent guard)
                             │
                             ▼
                  emitOnboardingBootstrap(user)
                             │
                  ┌──────────┴──────────┐
                  ▼                     ▼
            DOB present?           DOB missing
                  │                     │
                  ▼                     ▼
      emitAgeObserved        skipped: explicit missingness
        (canonical            (developmentalState.current_stage = null)
         emitAsbEvent)
                  │
                  ▼
       asb_events row append
       (idempotency_key derived from
        athlete_id + topic_id + occurred_at + payload)
                  │
                  ▼
       useAsbTimeline re-read
                  │
                  ▼
       developmentalState projection
       (chronological_age_years set,
        current_stage derived per Phase 154 gating)
```

## Emission map

| Condition | Topic | Authority | Visibility | Notes |
|---|---|---|---|---|
| DOB present in `user_metadata.dob` / `user_metadata.date_of_birth` | `relational.developmental.age_observed` | `self` | `self` | One event per (user, DOB). |
| DOB absent | — | — | — | Explicit missingness; no event. |
| Always | — | — | — | No `relational.relationship.*` (RR-4 reserved). |
| Always | — | — | — | No `relational.psych.*` (no fabricated inference). |

## Visibility audit

- `visibility_scope: "self"` — onboarding bootstrap is always private to the
  athlete. Parent/coach/recruiter scopes never see the bootstrap event.
- The Phase 151 firewall in `src/lib/runtime/projections/types.ts::prepareRows`
  prevents demo↔production bleed both directions.

## Replay reconstruction proof

`src/lib/runtime/relational/__tests__/relational-onboarding.test.ts`
asserts:

1. DOB-absent bootstrap emits zero events.
2. DOB-present bootstrap emits exactly one event.
3. The emitted payload is constitutionally legal (envelope passes Zod via
   `emitAgeObserved`'s parse boundary; visibility/authority/source =
   `"self"`; chronological_age_years correctly derived).
4. RR-4 reservation holds — no `relational.relationship.*` is authored.
5. No `relational.psych.*` is fabricated at onboarding.

## Idempotency

`occurred_at` is anchored to the DOB (`${dob}T00:00:00.000Z`) rather than
wall-clock `now()`. The canonical idempotency key is
`sha256(athlete_id + topic_id + occurred_at + canonical(payload))`, so
repeated bootstrap visits across days, devices, or sessions collapse to the
same DB row (23505 → dedupe at `emitAsbEvent`).

## What this bootstrap does NOT do

- Does not author `organism_truth`, `athlete_intent`, `authority_override`,
  `hard_stop`, or `rehabilitation_state`.
- Does not create a relationship row (RR-4 sealed).
- Does not infer psych state.
- Does not promote the user out of explicit missingness when DOB is unknown.

## Out of scope (backlog 5+)

- Parent invite + acceptance → bound relationship rows (backlog #5).
- Recruiter visibility scope + safeguarding sub-route (#6).
- Injury intake wiring (#7).
- `narrative_event`, `life_context_event`, `exposure_event`,
  `recruiter_contact_event`, `career_arc` primitives (#8–#12).
- RR-4…RR-10 invariant sealing (#13).
