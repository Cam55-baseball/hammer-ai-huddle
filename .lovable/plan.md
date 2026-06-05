# Hammers Modality — Launch Blocker Closure Sprint

**Mandate:** No new doctrine, no new engines. Prove one athlete journey works end-to-end:
`Athlete → Capture → Analysis → Report Card → AI Hammer → Recommendation → Coach → Athlete State → Safety`.

Each section ends with **evidence artifacts** committed to `docs/asb/launch-closure/` so the Section 8 audit can verify reality, not assumptions.

---

## Section 1 — Seal Wave 1 Residuals

**1.1 Parent invite token expiration**
- Add 24h `expires_at` (ms epoch) into the encoded token payload in `src/lib/runtime/relational/parentLinking.ts`.
- Server-side validation in `acceptParentInvite`: reject expired tokens before emitting `relationship.confirmed`; emit `relationship.invite_rejected` with reason `expired` for audit lineage.
- UX: `AcceptParentInvite.tsx` shows expired-token state with re-request CTA.
- Evidence: unit test in `src/lib/runtime/relational/__tests__/parentLinking.test.ts` (valid / expired / tampered).

**1.2 Phase 31 arbitration delivery**
- Verify `safeguardingDelivery.ts → projectDeliveries` is actually subscribed by `safeguardingNotifications.ts` writer.
- Confirm `safeguarding_notifications` table receives rows for each `arbitration_required` classification with full `lineage_refs` chain.
- Add integration test fixture: inject `pitching.v2.arm_health_caution` row → assert notification row + Safety Center surfaces it.

**1.3 `arm_health_caution` end-to-end**
- Confirm `emitPieV2SessionAggregate` emits the topic when RR-6 triggers fire (see `injuryDetection.ts`).
- Confirm projection: athlete state badge, Safety Center timeline entry, coach visibility under roster-membership guard.
- Evidence: ledger event example + screenshot path of each surface.

**Deliverable:** `docs/asb/launch-closure/wave-1-seal-evidence.md` with file:line refs and event JSON examples.

---

## Section 2 — Wave 2 Runtime Proof

**2.1 Pitching V2 mount verification**
- Mount `PitchingV2MicroInput` inside the pitching capture flow (currently orphaned).
- Mount `PieV2FrameTagger` inside video review surface.
- Wire `aggregateSession → emitPieV2SessionAggregate → persistSession` (projection writer to `performance_sessions.pie_v2_signals`).
- Add `src/lib/pieV2/__tests__/endToEnd.test.ts` fixture: synthetic rep array → asserts ledger insert, aggregate composite, projection column, trend query, coach panel read.

**2.2 Hitting runtime path**
- Patch `hie-analyze` edge function to import hitting phase doctrine (P1–P4) — phase attribution + causal chain output keyed by phase.
- Confirm `HittingCausalChainCard` and `HittingRoadmapLadder` render against the new payload.
- Add `/analyze/hitting` route in `src/App.tsx` wired to the analyzer.
- Evidence: curl invocation of `hie-analyze` with sample payload, response JSON, screenshot of the rendered card.

**Deliverable:** `docs/asb/launch-closure/wave-2-runtime-proof.md`.

---

## Section 3 — Universal Hammers Report Card (UHRC)

New surface, pitching first; hitting wires in after Section 6.

```text
src/lib/uhrc/
  computePillars.ts        // pillar aggregation from PIE V2 aggregate
  pillarSchema.ts          // pillar IDs, weights, thresholds
  reportCardTypes.ts
  __tests__/computePillars.test.ts

src/components/report-card/
  UniversalHammersReportCard.tsx   // top-level toggle: Report Card ↔ Detailed
  ReportCardHeader.tsx             // composite score, confidence, missingness
  PillarCard.tsx                   // one per pillar w/ tier + sparkline
  PillarDrilldownSheet.tsx         // signal breakdown when tapped
  HammerBriefPanel.tsx             // AI Hammer 7-field output (Section 4)
```

- Toggle defaults to **Report Card**; "View detailed analysis" reveals the existing PIE V2 detail components.
- Pillars (pitching v1): Stability, Sequencing, Direction, Repeatability, Arm Health. Each maps to a fixed subset of PIE V2 signals.
- Confidence + missingness surfaced per pillar — no fabrication.

---

## Section 4 — AI Hammer Standardization

Single deterministic schema, one generator:

```ts
interface HammerBrief {
  biggest_win: { signal_id; copy; evidence };
  biggest_leak: { signal_id; copy; evidence };
  priority_fix: { signal_id; copy };
  why_it_matters: string;
  drill: { drill_id; title; assignable: boolean };
  video: { video_id; title; playable: boolean };
  trend: { direction: 'up'|'flat'|'down'; window_days; delta };
}
```

- `src/lib/uhrc/generateHammerBrief.ts` — pure function over `PieV2SessionAggregate` + history.
- Drill/video selection delegates to the same engine used by `useDrillRecommendations` (no parallel logic).
- Replace ad-hoc `aiHammerTalkingPoints.ts` consumers with this brief.

---

## Section 5 — Playable Recommendations

- Audit `src/data/baseball/pieV2DrillCatalog.ts` and `pieV2VideoCatalog.ts` against `drills` / `library_videos` tables.
- Seed migration to insert missing canonical drills/videos so every PIE V2 signal → at least one assignable drill + one playable video.
- Add resolver `src/lib/uhrc/resolveRecommendations.ts` returning `{ assignable, playable, locked_reason? }`.
- Coach assignment flow (existing `drill_assignments` table) verified by integration test.
- Evidence: `docs/asb/launch-closure/recommendation-resolution-matrix.md` — table of every signal × drill × video × resolution status.

---

## Section 6 — Hitting Constitution Validation

Audit existing hitting code against the four phases:

| Phase | Concept |
|---|---|
| P1 | Stabilize |
| P2 | Hand Load |
| P3 | Back Hip Direction |
| P4 | Hitter's Move |

- Scan `src/lib/hie/`, `src/data/`, drill catalog, video catalog, tag taxonomy for terminology drift, duplicates, orphans.
- Produce `docs/asb/launch-closure/hitting-mismatch-report.md` with: conflicting terms, duplicate concepts, orphan recommendations, orphan videos, orphan drills.
- Fix only renames + orphan removals in this sprint (no new HIE features).

---

## Section 7 — Throwing Efficiency Gap Matrix

Verify each of the 12 throwing signals across 6 dimensions:

| # | Signal | capture | storage | scoring | report-card | coach | AI Hammer |
|---|---|---|---|---|---|---|---|
| 1 | Eyes on target @ peak leg lift |
| 2 | Hips fire / shoulders closed |
| 3 | ≤1.05s lift→footstrike |
| … | … |
| 12 | Arm slot consistency |

- Cross-reference `src/lib/pieV2/types.ts` (signals already constitutionalized) against capture surfaces, projection writer, UHRC pillar map, coach panel, Hammer brief.
- Output: `docs/asb/launch-closure/throwing-efficiency-gap-matrix.md` — green/yellow/red per cell with file:line.
- Close every red cell that is integration-only (no new doctrine).

---

## Section 8 — Publication Readiness Forensic Audit

Run the following journey-based verification, evidence-only:

1. New athlete onboarding completes (route, role select, sport select, isMinor derivation).
2. Pitcher completes PIE V2 analysis (capture → aggregate → projection → UHRC).
3. Hitter completes HIE analysis (`/analyze/hitting` → causal chain → roadmap).
4. UHRC renders for both pitching and hitting (or hitting marked "preview" if Section 6 blocks).
5. AI Hammer 7-field brief generates from real aggregate.
6. Coach assigns drill → appears in athlete drill list.
7. Athlete plays recommended video → playback works, analytics recorded.
8. RR-6 arm-health caution routes to parent (minor) / Safety Center / coach with correct gating.
9. Recruiting profile reflects latest aggregate.
10. Softball PIE V2 parity status (likely SOFT-LAUNCH gate).

Output: `docs/asb/launch-closure/publication-readiness-audit.md` containing:
- Per-journey: PASS / FAIL with file:line + event-id evidence
- Remaining P0 blockers
- **Verdict: GO / SOFT LAUNCH / NO-GO**

---

## Execution Order

1. Section 1 (seal Wave 1) — small, unblocks safety claims
2. Section 2 (Wave 2 runtime) — required substrate for UHRC
3. Section 5 (recommendation resolver) — required for AI Hammer
4. Section 3 (UHRC pitching)
5. Section 4 (AI Hammer standardization, mounted into UHRC)
6. Section 7 (throwing gap matrix + closures)
7. Section 6 (hitting validation)
8. Section 8 (forensic audit + verdict)

No section is considered done until its evidence document is committed.

## Out of Scope

- Hitting UHRC pillars (post-sprint, after Section 6 cleanup)
- Softball PIE V2 parity (audited in Section 8; closure deferred)
- New AI engines, new doctrine, new recruiting/exposure features

---

**Approve to enter build mode and begin Section 1.**
