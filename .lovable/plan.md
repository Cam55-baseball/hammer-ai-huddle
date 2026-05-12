
# Phase 2C — HIGH-Severity Resolution & Acceptance Pass

**Status:** doctrine-only (IIP `specified`). No code, migrations, edge functions, Supabase execution, or UI. Output is a memory artifact + index update + decision request.

**Laws check:** 1, 2, 3, 6, 7, 8, 9, 10
**Canonical owner:** ASB Infrastructure / IIP / Replay & Authority subsystems
**Longitudinal impact:** Removes hidden instability blocking G2; preserves replay determinism, engine-version pinning, athlete-as-root tenancy, append-only sourcing.
**Behavioral impact:** Indirect — protects authority pathways (MAAL/DGL), hard-stop transport (medical/RTP), and offline trust boundaries (AINL).

---

## Deliverables (on approval)

1. Create `mem://architecture/asb-g1-high-severity-resolution.md` — full Phase 2C doctrine artifact (Sections A–H below).
2. Update `mem://index.md`:
   - Replace the §K HIGH-blocker line with the resolved/accepted/deferred-with-containment status set produced by 2C.
   - Add reference: `[ASB §K HIGH Resolution](mem://architecture/asb-g1-high-severity-resolution.md) — Phase 2C resolutions for K1/K2/K3/K4/K6/K11/K13`.
3. No other files touched. No diagrams in 2C (diagram updates belong to 2D–2F).

---

## Artifact structure

The new memory file follows the exact 8-section format the user specified, and IIP §11 reporting on every recommendation.

### SECTION A — Executive Risk Summary
One-paragraph framing per blocker + a single matrix (blocker → severity → recommended disposition → G2 impact). No claims of resolution beyond what the per-blocker analysis supports.

### SECTION B — Per-Blocker Deep Analysis
For each of K1, K2, K3, K4, K6, K11, K13, the artifact will contain the 13 required subsections in a fixed template:

```text
B.K{n} — {title}
  1. Why dangerous
  2. Failure modes
  3. Longitudinal risk to organism continuity
  4. Supabase-specific constraints (Realtime fan-out, WAL, RLS, pg_partman, FCM bridge, etc.)
  5. Temporary doctrine currently assumed (from G1)
  6. Is current assumption acceptable? (yes / no / partial)
  7. Evidence required before production trust
  8. What can be deferred safely
  9. What CANNOT be deferred
 10. Recommended doctrine decision
 11. Disposition: resolved | accepted-with-mitigation | deferred-with-containment | remains-blocking
 12. Exact impact on G2 readiness
 13. IIP §11 line: Implementation state / Verification status / Remaining uncertainty / Drift risks
```

Working dispositions to be encoded (subject to ratification):

- **K1 — Realtime fan-out ceiling (org-of-orgs):** *deferred-with-containment.* Doctrine: ASB Realtime is for soft-RT athlete-scoped channels only; org-of-orgs aggregation runs through pull/materialized projections, not fan-out. Hard cap on per-channel subscribers; overflow routed to projection polling. Containment: explicit channel-tier registry + load-test gate before any org-of-orgs feature ships.
- **K2 — Event-log partitioning beyond month:** *accepted-with-mitigation.* Doctrine: monthly partitions for hot window, quarterly roll-up partitions thereafter; partition key = `(athlete_id, occurred_at)` to preserve athlete-as-root locality. Mitigation: partition manager spec + retention/compaction policy must precede any production write. No cross-partition mutation; replay reads partitions in occurred_at order.
- **K3 — Producer signing / device key rotation:** *deferred-with-containment.* Pre-signing era: every event carries `producer_id`, `producer_trust_tier`, `device_install_id`, `client_clock`, `server_received_at`. Authority decisions never trust client-only signals. Containment: signing is required before any T0/T1 sensor producer is admitted; until then, sensor tiers cannot bypass server reconciliation.
- **K4 — Multi-engine-version coexistence beyond N/N-1:** *resolved (constrained).* Doctrine: only N and N−1 engines may write; older engines are read/replay-only via `engine_snapshot_versions`. Snapshots pinned to `engine_version`; recompute requires explicit migration record. No silent re-scoring of historical events.
- **K6 — iOS PWA background sync durability:** *accepted-with-mitigation.* Doctrine: treat iOS background sync as **non-durable**. Client queue is foreground-flush + opportunistic; safety-critical hard-stops are **never** trusted to client background delivery. Mitigation: hard-stops always travel server-push (see K11); UI surfaces "unsynced" state honestly; no completion claim until server ACK.
- **K11 — Hard-stop push transport:** *resolved (constrained).* Doctrine: hard-stop and medical-override notifications are delivered via FCM/APNs (server→device push), not Realtime. Realtime is best-effort UX; push is the authority transport. Dual-path: push for delivery, Realtime for live UI mirror, server log as truth.
- **K13 — Replay determinism under FP drift cross-runtime:** *accepted-with-mitigation.* Doctrine: all longitudinal scoring math uses fixed-point (integer-scaled) arithmetic at canonical precision; floating-point allowed only in non-authoritative UI. Mitigation: replay golden-vector test suite required as a G2 entry artifact; cross-runtime parity test (browser vs Deno vs Postgres) gates every engine version bump.

### SECTION C — Cross-Blocker Interaction Risks
- K6 × K11: iOS background unreliability forces K11's push-as-authority decision.
- K1 × K2: fan-out containment depends on partition-aware projections; projection cost is bounded only if K2 partitioning holds.
- K3 × K4: unsigned producers + multi-engine coexistence = replay ambiguity; both must be constrained together.
- K13 × K4: FP drift compounds across engine versions; fixed-point doctrine must precede any engine version bump.
- K1 × K11: do not collapse hard-stop transport into Realtime to "save" fan-out budget; that would silently weaken authority.

### SECTION D — Production Trust Requirements
Enumerated, testable preconditions before each blocker may be called `verified` (not just specified): golden replay vectors (K13), partition manager + retention runbook (K2), channel-tier load tests (K1), push delivery SLO + dead-letter (K11), foreground-flush honesty UX + server-ACK contract (K6), engine-version write-fence enforcement test (K4), producer envelope completeness audit (K3).

### SECTION E — Recommended Resolutions
Consolidated table mirroring B.11 dispositions, plus the ordered prerequisite list feeding 2D–2G.

### SECTION F — G2 Readiness Matrix
Per blocker: `G2-unblocking? yes/no` and `condition`. G2 may begin when all seven entries are either `resolved`, `accepted-with-mitigation` (with mitigation owner named), or `deferred-with-containment` (with containment owner + scope named). Any `remains-blocking` halts G2.

Working summary (subject to ratification): K1 deferred-with-containment, K2 accepted, K3 deferred-with-containment, K4 resolved, K6 accepted, K11 resolved, K13 accepted → **G2 entry permitted** once 2D–2F doctrine lands.

### SECTION G — Remaining Unknowns
Explicitly named, not hand-waved: org-of-orgs scale numbers, iOS WebKit roadmap, FCM/APNs cost envelope at scale, signing key custody model, fixed-point precision selection per metric family, partition compaction cadence under real load.

### SECTION H — Ratification Decision Request
Single decision: ratify the dispositions in B/E/F as the locked Phase 2C resolution set, unblocking sequence 2D → 2E → 2F → 2G → G2 realization planning → shadow-mode implementation. No implementation begins on approval.

---

## Invariants preserved (explicit)

Athlete-as-root tenancy · append-only event sourcing · replay determinism · engine-version pinning · closed-loop intelligence · no big-bang migration · offline survivability without fake authority · long-season durability over convenience.

## Out of scope for 2C

Schema DDL, ingress endpoints, edge functions, RLS policies, partition SQL, push integration code, fixed-point library selection, observability dashboards, UI. Those belong to 2D–2G and G2.
