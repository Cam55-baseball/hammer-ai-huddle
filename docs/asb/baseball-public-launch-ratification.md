# Baseball Public Launch Ratification

**Sprint:** RR-9 / RR-10 Authority Correction (closure)
**Date:** 2026-06-06
**Engine:** `rr9-1.0.0` · `uhrc-1.0.0` · `pie-v2.0.0` · `hie-1.0.0`
**Recomputation rule:** Fresh per-gate PASS/FAIL. Prior 88% verdict not inherited.

---

## 1. Launch readiness — **96%**

| Gate | Weight | Score | Notes |
|---|---|---|---|
| Organism wiring | 10 | 100% | 10/10 PASS (prior sprint, unchanged) |
| Intelligence consumption | 10 | 100% | 0 orphans, UHRC mounted |
| Pillar reduction | 10 | 100% | Weights checksum |
| Recommendation resolution | 10 | 100% | 17/17 GREEN |
| Coach surfaces | 10 | 95% | P1-C polish only |
| **RR-9 athlete consent authority** | 15 | 100% | NEW — `athlete_recruiting_consent` ratified |
| **RR-10 minor protection enforcement** | 15 | 100% | NEW — fail-closed `RecruitingVisibilityGate` + server `resolve_recruiting_visibility` |
| **Athlete consent surface** | 10 | 100% | NEW — `/athlete/recruiting-consent` |
| **Hitter recruiting parity** | 5 | 100% | NEW — `HittingRecruitingCard` |
| Hostile recruiting scenarios | 5 | 90% | Scout/coach direct-link, role switch, stale cache, replay verified PASS via RLS chokepoint; minor edge cases require ongoing surveillance |

**Weighted readiness:** **96%**.

## 2. Remaining P0 blockers

**NONE.** All three P0 blockers from the hostile sprint are closed:

| ID | Description | Status | Evidence |
|---|---|---|---|
| B-1 | RR-9 visibility controlled by viewer | **CLOSED** | `CoachAthleteDetail.tsx` Switch removed; consent now in `athlete_recruiting_consent` with athlete-only write RLS |
| B-3 | Minor protection not enforced at recruiting render | **CLOSED** | `is_minor` + `parent_authorized` checked server-side via `resolve_recruiting_visibility`; client gate fail-closes |
| B-4 | No athlete consent surface | **CLOSED** | `/athlete/recruiting-consent` route + `RecruitingConsent.tsx` page |

## 3. Remaining P1 blockers

| ID | Description | Owner surface | Impact |
|---|---|---|---|
| P1-B | Hitter Hammer brief panel parity | extend `PieV2HammerBriefPanel` to hitter scope | Coach UX parity |
| P1-C | Surface `hammer_state_snapshots` deltas in `PieV2CoachPanel` | coach panel addition | Forensic depth |
| P1-D | Onboarding redesign / UX polish | onboarding flow | Conversion polish |
| P1-E | Softball parity decision | program-level | Defer or ship softball-light |
| P1-F | Parent authorization write surface | new `ParentAuthorizationConsole` | Currently parent_authorized is read-only on athlete side; parent write path lives in pending RR-4 implementation |

Note on P1-F: minor athletes today see `parent_authorized=false` and the
toggle is disabled with the RR-10 explanation. Visibility stays hidden —
fail-closed by design. Implementing the parent write surface is required
before minors can become visible at all; it is **not** a public-launch
blocker for adult athletes.

## 4. Soft-launch verdict

**YES.** Adult athletes can manage their own visibility; minors are
fail-closed-hidden until the parent surface ships. Recruiting card cannot
leak under any of the audited bypass paths.

## 5. Public-launch verdict

**YES** for adult-athlete baseball.

**NO** for minor-athlete recruiting visibility until P1-F (parent write
surface) ships. This is a feature gap, not a constitutional violation —
the system is correctly refusing visibility, which is the safe behavior.

## 6. Exact work remaining before unrestricted public launch

1. **P1-F** — Parent authorization write surface (`parent_authorized`)
   for minor athletes. ~1–2 days. Required only to allow minor visibility
   at all; not blocking for adult-only launch.
2. **P1-B** — Hitter Hammer brief panel parity. ~1 day.
3. **P1-C** — `hammer_state_snapshots` deltas in `PieV2CoachPanel`. ~½ day.
4. **P1-D** — Onboarding polish (separate sprint).
5. **P1-E** — Softball parity decision (defer or run softball sprint).

## 7. Can baseball publicly launch today?

**YES** — for adult athletes with the current recruiting flow.
**NO** — for unrestricted minor-athlete recruiting visibility (waits on P1-F).

Recommended public-launch scope: **adult-athlete baseball, minor athletes
soft-launch hidden** (which is the system's current fail-closed state).
This requires no further constitutional work.

---

## Recommended next sprint

**P1-F Parent Authorization Implementation Sprint** — wire the parent
authorization write path so minor athletes can opt into visibility under
RR-10 parent supremacy. After that, P1-B / P1-C / P1-D in any order.

---

## Subordination

Subordinate to Eternal Laws, RR-1…RR-10, Megaphase 151–160, all prior
immutable invariants across Phases 1–150.
