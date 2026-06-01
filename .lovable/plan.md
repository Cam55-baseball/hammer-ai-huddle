
# Phase D — Safeguarding Delivery + Parent Transport Activation

Operationalizes sealed RR-4 and the safeguarding classifier. Transport, UX completion, and hardening only — no new primitives, no RR-5…RR-10, no schema rewrites, no recruiter/injury/narrative/career/exposure work. Canonical truth remains the `relational.*` event stream via `emitAsbEvent`; email + notifications are alerts only and never mutate organism truth.

## Section 1 — Parent invite email transport

- New edge function `supabase/functions/send-parent-invite/index.ts` accepting `{ token, athlete_display_name, recipient_email }`. Uses Lovable Emails (`send-transactional-email`) — falls back to logged-only mode if email infra not yet enabled (no hard dep this turn).
- New React Email template `supabase/functions/_shared/transactional-email-templates/parent-invite.tsx` with the calm structure specified (athlete name → one-line frame → 3 bullets: visible / private / removable → "Review invitation" CTA → footer). White body, brand-consistent, no startup language.
- `ParentInvite.tsx`: replace manual copy-link primary with a single "Send invitation" button; secondary "Copy link instead" disclosure. Existing relationships collapse under "People supporting you".
- **Failure isolation:** invite emission via `createParentInvite` runs first and commits regardless of email outcome. Transport result surfaces as a non-blocking status row ("Invitation created" + optional "Email delivery delayed — link copied below"). Retry button available.
- Log transport attempts to a new `parent_invite_dispatches` table (status: `queued|sent|failed|skipped_disabled`). Append-only, separate from canonical events.

## Section 2 — Safeguarding notification delivery

- New `src/lib/runtime/relational/safeguardingDelivery.ts` — pure orchestrator over `classifySafeguardingSignal`. Given a classification, decides transport target: `notify_parent` → parent notification row + email; `arbitration_required` → internal admin row only; `lockdown_commercial` → local UI surface only. No automated authority change.
- New table `safeguarding_notifications` (id, athlete_id, source_event_id, route, status `pending|reviewed|muted`, created_at). Append-only writes; status changes append new rows keyed by `(source_event_id, route)` for dedupe.
- Dedupe rule: `(source_event_id, route)` is unique-by-projection. Replay rebuild deterministically produces identical set.
- New `src/pages/SafetyCenter.tsx` route `/safety` — calm timeline, muted chips, mobile-first, no red panic styling. States: reviewed / pending / muted. One action per row.
- Parent visibility: shows safeguarding notice + observable context for the `source_event_id` only; hides psych inference internals, unrelated conversation, classifier reasoning.
- Copy uses §humanization vocab: "A check-in may be helpful." / "Review recommended." Never diagnostic, never predictive.
- Offline-safe: SafetyCenter reads from projection cache, renders skeletons, no flashes on refresh.

## Section 3 — Relationship management completion

- New `src/pages/RelationshipSettings.tsx` route `/relationships/settings` — list of active relationships with three actions per row: **Pause access**, **Restore access**, **Remove access**. Also "Review what they can see" disclosure rendering the visibility matrix in plain language.
- All actions go through canonical emitters only:
  - Pause → `emitRelationshipPaused`
  - Restore → `emitRelationshipConfirmed` (new confirmation lineage-linked to original `created`)
  - Remove → `revokeParentRelationship`
- No mutable relationship table touched. No raw IDs in UI. Copy uses "Access paused" / "Access removed" — never "revoked".
- Destructive confirmations: plain-language consequence summary inline (no modal stack), single confirm button, single cancel.

## Section 4 — Product stability hardening

- Refresh survivability audit on `/relational`, `/relational/demo`, `/onboarding`, `/parent-invite`, `/accept-parent-invite`, `/safety`, `/relationships/settings`. Add Suspense boundaries + skeletons; eliminate undefined flashes by gating renders on projection readiness.
- Slow-network: replace all `Loading…` text with `<Skeleton>` blocks matching final layout to prevent jump.
- Error recovery: wrap each relational route in a small error boundary with calm fallback ("Something didn't load. Try again.") + retry button. No stack traces, no raw error text.
- Mobile audit at 390px + 440px: tap targets ≥ 44×44 (especially Safety Center row actions and RelationshipSettings buttons), keyboard overlap on invite form, sticky footer collisions, scroll traps in long timelines.
- A11y: aria-labels on icon-only buttons, semantic `<h1>/<h2>` order, focus rings via tokens, contrast verified against `text-foreground` / `text-muted-foreground`, `prefers-reduced-motion` respected on any transitions.

## Section 5 — Human trust polish

- Sweep all relational surfaces against `src/lib/relational/copy.ts` TERMS map. Add any new keys needed (`safeguarding_notice`, `access_paused`, `access_restored`, `access_removed`, `review_recommended`, `check_in_helpful`, `delivery_delayed`, `invitation_created`).
- Enforce: one emotional focus per screen, one primary action, generous spacing (`space-y-4`/`p-5`/`rounded-xl`/`shadow-sm`), progressive disclosure of secondary actions.
- Remove any remaining legalistic / technical leakage flagged in `docs/asb/humanization-audit.md`.

## Section 6 — Operational verification

- `bunx tsc --noEmit`
- Full existing relational suite (103 tests) must remain green.
- New tests:
  - `safeguarding-notification-dedupe.test.ts` — same `(source_event_id, route)` projects once.
  - `safeguarding-replay-parity.test.ts` — identical event prefix → identical notification set.
  - `relationship-pause-downgrade.test.ts` — paused relationship redacts payload in projection; visibility downgrades to presence-only.
  - `parent-invite-transport-retry.test.ts` — email failure does not block `relationship.created`; retry is idempotent on the transport log.
  - `refresh-survivability.test.ts` — projection rebuild from event log produces identical UI state.
  - `offline-rendering.test.ts` — Safety Center + Relationship Settings render from cache without network.
- Mobile walkthroughs at 390 + 440 (Safari iOS chrome): onboarding → invite → accept → pause → remove → safeguarding alert → mid-flow refresh → offline → slow network. Screenshots captured.
- New audit doc `docs/asb/phase-d-operational-audit.md` with screenshots, remaining friction, highest-risk area, exact mitigations, and three ratings: emotional clarity / parent trust / operational durability. Closes with **READY / READY WITH CONDITIONS / NOT READY** verdict.

## Technical details

**Migrations (additive only):**
1. `parent_invite_dispatches` — `id uuid pk`, `relationship_id uuid`, `athlete_id uuid`, `recipient_email text`, `status text`, `attempt_count int`, `last_error text`, `created_at`, `updated_at`. RLS: athletes select own; service_role all. Grants per public-schema rule.
2. `safeguarding_notifications` — `id uuid pk`, `athlete_id uuid`, `source_event_id text`, `route text`, `status text default 'pending'`, `created_at`. Unique `(source_event_id, route, status)` for append-only dedupe. RLS: athletes + linked parents (via `has_role`-style projection) select; service_role all.

Neither table stores canonical organism truth — only transport/alert state. RR-4 invariants (no mutable relationship table, replay-derived truth, lineage completeness) untouched.

**Edge function:** `send-parent-invite` deploys with `verify_jwt = true`. Validates `Authorization` claims = athlete owner of `relationship_id`. On email infra absent: logs `skipped_disabled` and returns 200 with `delivery: "deferred"`.

**Routing additions in `src/App.tsx`:** `/safety` (SafetyCenter), `/relationships/settings` (RelationshipSettings). Both auth-gated.

**Files (new):**
- `supabase/functions/send-parent-invite/index.ts`
- `supabase/functions/_shared/transactional-email-templates/parent-invite.tsx`
- `supabase/migrations/<ts>_parent_invite_dispatches_and_safeguarding_notifications.sql`
- `src/lib/runtime/relational/safeguardingDelivery.ts`
- `src/lib/runtime/projections/safeguardingNotifications.ts`
- `src/pages/SafetyCenter.tsx`
- `src/pages/RelationshipSettings.tsx`
- `src/lib/runtime/relational/__tests__/safeguarding-notification-dedupe.test.ts`
- `src/lib/runtime/relational/__tests__/safeguarding-replay-parity.test.ts`
- `src/lib/runtime/relational/__tests__/relationship-pause-downgrade.test.ts`
- `src/lib/runtime/relational/__tests__/parent-invite-transport-retry.test.ts`
- `src/lib/runtime/relational/__tests__/refresh-survivability.test.ts`
- `src/lib/runtime/relational/__tests__/offline-rendering.test.ts`
- `docs/asb/phase-d-operational-audit.md`

**Files (edited):**
- `src/pages/ParentInvite.tsx` — single CTA + transport status surface
- `src/pages/AcceptParentInvite.tsx` — calm confirmation polish
- `src/pages/Relational.tsx` — add SafetyCenter + RelationshipSettings entry points
- `src/lib/relational/copy.ts` — new TERMS keys
- `src/lib/runtime/relational/relationshipEmitters.ts` — verify `emitRelationshipPaused` exists; add if missing (RR-4 verb already sealed)
- `src/App.tsx` — two new routes
- `supabase/config.toml` — `[functions.send-parent-invite] verify_jwt = true`

## Out of scope (stop gate)

RR-5…RR-10 sealing, recruiter workflow, injury lifecycle expansion, `narrative_event`, `exposure_event`, `recruiter_contact_event`, `career_arc`, schema rewrites, new organism primitives, projection architecture rewrites, new event families.
