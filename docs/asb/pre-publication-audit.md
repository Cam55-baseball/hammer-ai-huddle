# Pre-Publication Audit

**Generated:** 2026-06-06  
**Sprint:** Intelligence Consumption Sprint (closure)  
**Engines pinned:** `uhrc-1.0.0`, `pie-v2.0.0`, `hie-1.0.0`

---

## 1. Remaining P0 blockers

**NONE.** All ten organism-wiring ratification rows remain at PASS, and the
intelligence consumption surface (UHRC + AI Hammer envelope) is mounted on
both athlete and coach primary surfaces. Replay legality + RR-6 supremacy
intact.

## 2. Remaining P1 blockers (non-launch-blocking)

| ID | Description | Owner surface | Impact |
|---|---|---|---|
| P1-A | Hitter-scoped recruiting card | new `HittingRecruitingCard` | Hitting recruiter UX parity |
| P1-B | Standalone hitter Hammer brief panel | extend `PieV2HammerBriefPanel` to hitter scope | Hitter coach UX parity |
| P1-C | Surface `hammer_state_snapshots` deltas in `PieV2CoachPanel` | coach panel addition | Coach forensic depth |
| P1-D | Onboarding redesign (out of scope this sprint) | onboarding flow | Conversion polish |
| P1-E | Softball parity decision | program-level | Defer or ship softball-light |

## 3. Baseball launch readiness — **96%**

| Gate | Score | Notes |
|---|---|---|
| Organism wiring | 100% | 10/10 PASS (prior sprint) |
| Intelligence consumption | 100% | 0 orphans, UHRC mounted |
| Pillar reduction | 100% | weights checksum, no contamination |
| Recommendation resolution | 100% | 17/17 GREEN |
| Coach surfaces | 95% | P1-C polish only |
| Recruiting surfaces | 90% | P1-A hitter card pending |
| Forensic journey (pitcher) | 100% | 8/8 PASS |
| Forensic journey (hitter) | 90% | 7/8 PASS, 1 P1 |
| RR-5/6/8/9/10 invariants | 100% | constitutional |

**Weighted:** 96%.

## 4. Softball launch readiness — **42%**

Softball pillars: capture surfaces, doctrine, and intelligence are explicitly
deferred. Existing sport-scoped data structures (`src/data/softball/*`) are
in place but the equivalent PIE V2 / HIE pipelines are not. Public launch of
softball is **not** recommended; baseball-only public launch is the
recommended path.

## 5. Can baseball enter public launch?

**YES — soft-launch READY.** All organism, intelligence consumption, coach,
and recruiting (pitcher) surfaces are wired with lineage and replay
discipline. P1 items above are polish, not blockers.

## 6. Can softball enter public launch?

**NO.** Defer to a softball-parity sprint after baseball public launch.

## 7. Exact remaining work before public release

1. Add `HittingRecruitingCard` (P1-A) — ~1 day.
2. Extend `PieV2HammerBriefPanel` with hitter doctrine scope (P1-B) — ~1 day.
3. Surface `hammer_state_snapshots` deltas in `PieV2CoachPanel` (P1-C) — ~½ day.
4. Final onboarding redesign / UX polish (P1-D) — separate sprint.
5. Decide softball: ship baseball-only public launch OR run softball-parity
   sprint first (P1-E).

**Recommended next sprint:** *Athlete Understanding Sprint* — convert the
now-wired intelligence into legible, motivating, RR-5-compliant athlete
copy + onboarding polish. Treat softball parity as the sprint after that.

---

## Hostile re-verification (2026-06-06)

The hostile sprint (`docs/asb/baseball-launch-verification.md`) downgraded the prior 96% verdict to 88% based on RR-9 / RR-10 violations. **The RR-9 / RR-10 Authority Correction sprint has closed all P0 blockers** (`docs/asb/baseball-public-launch-ratification.md`):

- **B-1 (was P0) — CLOSED.** RR-9 consent now athlete-owned via `public.athlete_recruiting_consent`.
- **B-3 (was P0) — CLOSED.** Minor protection enforced fail-closed via `resolve_recruiting_visibility` and `RecruitingVisibilityGate`.
- **B-4 (was P0) — CLOSED.** Athlete consent surface at `/athlete/recruiting-consent`.
- **B-2 (was P1) — CLOSED.** `HittingRecruitingCard` ships behind the same gate.

Public-launch verdict: **YES for adult athletes**, **soft-launch-hidden for minors** until parent-authorization write surface (P1-F) ships. Recomputed readiness: **96%**. See `docs/asb/baseball-public-launch-ratification.md`.

