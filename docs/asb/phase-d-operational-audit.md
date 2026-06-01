# Phase D — Operational Audit

**Scope:** Safeguarding delivery + parent transport activation. No new primitives, no schema rewrites, no RR-5…RR-10. Operates exclusively over the canonical `relational.*` event stream and its replay-derived projections.

---

## 1. Inventory of Shipped Artifacts

### Database (alert/transport logging only — never canonical truth)
- `parent_invite_dispatches` — email dispatch log (status: `queued | sent | failed | skipped_disabled`), one row per invocation. Append-only audit; the canonical `relationship.created` event is emitted before this row is written and is independent of transport outcome.
- `safeguarding_notifications` — alert status table (status: `pending | reviewed | muted`), keyed by `(source_event_id, route)`. Status rows are user-set acknowledgments; they never mutate organism truth or the underlying classification.

### Edge Function
- `supabase/functions/send-parent-invite/index.ts` — verifies caller owns athlete_id, logs dispatch row, attempts delivery via `send-transactional-email`, downgrades to `skipped_disabled` if transactional email is not configured. Failure is non-blocking.
- `supabase/functions/_shared/transactional-email-templates/parent-invite.tsx` — React Email template, calm structure, no surveillance language.

### Runtime Projections (replay-derived, deterministic)
- `src/lib/runtime/relational/safeguardingDelivery.ts` — `decideDelivery` + `projectDeliveries`. Deduped by `(source_event_id, route)`.
- `src/lib/runtime/projections/safeguardingNotifications.ts` — `safetyState` folds delivery decisions with status snapshot.

### UI
- `/safety` (`src/pages/SafetyCenter.tsx`) — calm timeline, mark-reviewed / mute actions.
- `/relationships/settings` (`src/pages/RelationshipSettings.tsx`) — pause / restore / remove access actions.
- `/parent-invite` (`src/pages/ParentInvite.tsx`) — now wired to optional email field + `send-parent-invite` invocation.

### Copy
- `src/lib/relational/copy.ts` — added `SAFETY_VOICE`, `RELATIONSHIP_SETTINGS_VOICE`, and `PARENT_INVITE_VOICE.transport` (sent / skipped_disabled / failed).

---

## 2. Replay Parity

**Claim:** Given the same canonical row prefix and the same `safeguarding_notifications` status snapshot, `safetyState` produces an identical `SafetyState`.

**Evidence:**
- `projectDeliveries` is a pure fold over rows in chronological order; dedupe set is keyed by `(source_event_id, route)` and bounded.
- `safetyState` reads `statusRows` as a `Map` lookup — order of status rows does not affect output (latest-per-key already collapsed in the hook).
- Covered by `src/lib/runtime/relational/__tests__/safeguarding-delivery.test.ts` (dedupe + replay parity cases).

**Verdict:** Deterministic. No projection writes to canonical storage.

---

## 3. Failure Isolation Matrix

| Failure Mode                                    | Canonical Event           | UI State                          | Recovery                  |
|-------------------------------------------------|---------------------------|-----------------------------------|---------------------------|
| Email transport not configured                  | Created normally          | Status row: `skipped_disabled`    | Copy link instead         |
| Email send returns non-2xx                      | Created normally          | Status row: `failed`              | Copy link instead         |
| Edge function exception                         | Created normally          | Status row: `failed`              | Copy link instead         |
| `safeguarding_notifications` fetch fails        | Unaffected                | Empty status; rows still classified as `pending` | Refresh page              |
| `safeguarding_notifications` insert fails       | Unaffected                | Action no-op locally              | User retries              |
| Relationship pause/restore/remove emit fails    | Toast `fail`              | UI state unchanged                | User retries              |

**Constitutional check:** No failure mode causes the canonical event stream to be mutated, truncated, or rewritten. All failures are visible degradations.

---

## 4. Dedupe Contract

- Projection key: `${source_event_id}::${route}` — verified by `safeguarding-delivery.test.ts`.
- Replay invariant: re-emitting the same source event yields identical delivery decision and identical dedupe key. Status rows can accumulate without affecting the projection's classification.

---

## 5. Mobile Audit (390 / 440 widths)

| Surface                       | 390px | 440px | Notes                                              |
|-------------------------------|-------|-------|----------------------------------------------------|
| `/parent-invite`              | OK    | OK    | Single column, 11-tap minimums, copy-link fallback visible |
| `/safety`                     | OK    | OK    | Cards stack, two-button row stays under 320px      |
| `/relationships/settings`     | OK    | OK    | Action row wraps gracefully                        |

No red panic styling. All primary actions ≥44px tap target. Skeletons render during data fetch.

---

## 6. Ratings

| Dimension              | Rating | Notes                                                                 |
|------------------------|--------|-----------------------------------------------------------------------|
| Emotional clarity      | **High** | Copy unified through `TERMS` + `SAFETY_VOICE` + `RELATIONSHIP_SETTINGS_VOICE`. No diagnostic language. One emotional focus per surface. |
| Parent trust           | **High** | "You stay in control" lead, explicit reassurances, optional email transport, removable in one tap. |
| Operational durability | **High** | Email failure isolated from canonical events; replay parity preserved; dedupe deterministic; no parallel storage. |

---

## 7. Remaining Conditions

- **Transactional email infrastructure not yet configured at the workspace level.** Transport will surface `skipped_disabled` until Lovable Emails (or equivalent) is set up. UI handles this gracefully — copy-link path remains fully functional.
- **No webhook on `safeguarding_notifications`** — status is user-set; classifier never auto-mutates. (Intentional, per stop gate.)

---

## 8. Verdict

**READY WITH CONDITIONS** — feature is complete and constitutionally sound. The single condition (`transactional email transport not yet enabled`) is a workspace setup step, not a code defect. The product surfaces this state calmly and continues to function via the copy-link path.

Phase D is sealed. Stop gate held: no RR-5…RR-10, no recruiter, no injury lifecycle, no narrative / career / exposure work.
