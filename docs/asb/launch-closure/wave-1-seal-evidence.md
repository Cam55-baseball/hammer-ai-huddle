# Wave 1 Seal — Evidence Report

Constitutional seal for the three Wave 1 residuals identified in the Launch
Readiness audit. Each item lists the change, file:line refs, and the
verification path. No new doctrine, no new engines.

---

## 1.1 Parent invite token expiration — SEALED

**Change**
- `src/lib/runtime/relational/parentLinking.ts`
  - L16–L52: `PARENT_INVITE_TOKEN_TTL_MS = 24h`, `ParentInviteToken.expires_at?: string`,
    `AcceptInviteError`, `isInviteTokenExpired()`.
  - L146–L155: `createParentInvite` now stamps
    `expires_at = issued_at + 24h` into the encoded token.
  - L175–L195: `acceptParentInvite` rejects expired tokens, emits a
    `relationship.revoked` event with `reason: "expired"` for audit lineage,
    then throws `AcceptInviteError("expired_token")`.
- `src/pages/AcceptParentInvite.tsx`
  - L62–L91: parent UX detects expiry pre-submit and on server rejection,
    shows the dedicated expired state with re-request CTA.
- `src/lib/relational/copy.ts` L233–L238: new copy keys
  `PARENT_INVITE_VOICE.expired` / `.expiredCta`.
- `src/lib/runtime/relational/__tests__/parentLinking-expiration.test.ts`:
  unit coverage for fresh / expired / legacy-no-expires / encode-decode
  round-trip / tampered / garbage tokens.

**Audit lineage**
Expired acceptance writes a `relational.relationship.revoked` event with
`reason: "expired"`, `revoked_by: "system_inferred"`, and
`lineage_parent_ids: [created_event_id]`. Replay sees the rejection; no
`confirmed` event is ever emitted for the relationship.

**Legacy posture**
Tokens issued before this change carry no `expires_at` and are treated as
expired by `isInviteTokenExpired`. Pre-existing share links cannot bypass
the new gate.

---

## 1.3 `arm_health_caution` end-to-end — EMITTER LANDED, FIRING DEFERRED TO WAVE 2

**Change**
- `src/lib/pieV2/emit.ts` L122–L194: new
  `emitPieV2ArmHealthCaution(...)` publishes `pitching.v2.arm_health_caution`
  through canonical `emitAsbEvent`, with:
  - `safeguarding_category: true` when `level === "elevated"` (drives
    `classifySafeguardingSignal` into the `arbitration_required` route),
  - lineage edge to the parent `session_aggregate` event,
  - deterministic idempotency key (replay-safe).

**Wire-up status**
- `safeguardingNotifications.ts` projection already subscribes to
  `pitching.v2.*` (file L43) — once `emitPieV2ArmHealthCaution` is invoked,
  the Safety Center surfaces the row with no further changes.
- **Call site is not yet wired.** `emitPieV2SessionAggregate` has zero
  callers in the codebase (`grep -rn emitPieV2SessionAggregate src/` →
  one definition only). The aggregate emission + caution derivation will
  be wired in Section 2.1 when the capture surfaces (`PitchingV2MicroInput`,
  `PieV2FrameTagger`) are mounted and `aggregateSession` is invoked.

**Sample event (deterministic shape)**
```json
{
  "topic_id": "pitching.v2.arm_health_caution",
  "engine_version": "pie-v2.0.0",
  "payload": {
    "session_id": "<uuid>",
    "level": "elevated",
    "contributing_factors": [
      "arm_slot_variance_elevated",
      "extension_variance_elevated",
      "within_session_tempo_decay"
    ],
    "athlete_reported_pain": false,
    "recommended_action": "Route through safeguarding role for human review. Suspend velocity-tier work until cleared.",
    "visibility_scope": "self",
    "confidence": 1,
    "authority": "system",
    "safeguarding_category": true,
    "engine_version": "pie-v2.0.0"
  },
  "lineage_refs": { "parent_aggregate_event_id": "<aggregate_event_id>" }
}
```

---

## 1.2 Phase 31 arbitration delivery — PROJECTION VERIFIED, WRITER DEFERRED

**Verified path (read-side)**
- `src/lib/runtime/relational/safeguardingDelivery.ts::projectDeliveries`
  is consumed by `src/lib/runtime/projections/safeguardingNotifications.ts::safetyState`
  (L52). Identical row prefix → identical decision set
  (`__tests__/safeguarding-delivery.test.ts` L29–L37).
- `pitching.v2.*` is now in the projection's `PREFIXES` (L43), so the
  arm-health caution emitted in §1.3 will be classified.

**Gap: transport writer**
The `safeguarding_notifications` table exists (per cloud schema) but the
project contains **no server-side writer** that persists
`projectDeliveries(...)` output into it (`grep safeguarding_notifications
src/ supabase/` → no inserts). Until that writer ships, Safety Center
status defaults to `"pending"` for every row (correct behaviour per
`safetyState` L65) but `reviewed` / `muted` transitions cannot be
recorded.

**Recommendation (Wave 2 or dedicated server task):** add an edge function
worker `safeguarding-deliveries-writer` that subscribes to
`asb_events`-inserted rows, runs `decideDelivery`, and upserts into
`safeguarding_notifications` keyed on `dedupeKey`. This is integration
work, not new doctrine, and was deliberately scoped out of Wave 1 to
preserve the "no new systems" mandate. Tracked as P0 for Wave 2.

---

## Verdict for Wave 1

| Item | Status |
|---|---|
| 1.1 Parent invite expiration | ✅ Sealed |
| 1.2 Phase 31 delivery (read path) | ✅ Verified |
| 1.2 Phase 31 delivery (writer) | ⚠ Deferred to Wave 2 (P0) |
| 1.3 `arm_health_caution` emitter | ✅ Landed |
| 1.3 `arm_health_caution` firing | ⚠ Deferred to Section 2.1 wire-up |

Awaiting approval to proceed to Section 2 (Wave 2 Runtime Proof), which
closes the two deferred items above as a side-effect of mounting the
capture surfaces and wiring `aggregateSession → emit → persist`.
