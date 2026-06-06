# Recruiting Intelligence Consumption Audit

**Generated:** 2026-06-06  
**Constitution:** RR-9 (exposure & visibility), RR-10 (recruiter/commercial)

---

## Pitcher recruiting surface

Component: `PieV2RecruitingCard` mounted in `CoachAthleteDetail`
(`src/pages/CoachAthleteDetail.tsx:190-200`).

| Check | Status |
|---|---|
| Renders only PIE V2 pitching aggregates + trajectories | ✅ |
| RR-9 opt-in gated (`Switch id="rr9"`) | ✅ |
| Recruiter visibility requires explicit toggle | ✅ |
| Lineage handle exposed via replay drill-down | ✅ |
| Confidence + missingness preserved (no fabricated certainty) | ✅ |
| No comparative ranking against named peers | ✅ |
| Cross-sport leakage (hitting metrics shown to pitcher recruiter view) | ❌ none — card scoped to `PieV2SessionAggregate` |

## Hitter recruiting surface

Status: **P1 follow-up** — no dedicated `HittingRecruitingCard` yet.
Hitting intelligence reaches recruiters via the shared coach drill-down
(UHRC + `HittingDoctrineBlock`) but a hitter-scoped, RR-9-gated recruiter
card is not yet mounted. Not a baseball soft-launch blocker because:
- Pitcher recruiting is the dominant entry path for the v1 audience.
- Hitter intelligence is already auditable via the shared surface with
  the same RR-9 opt-in semantics.

## Cross-sport leakage check

| Surface | Sport scope | Leakage? |
|---|---|---|
| `PieV2RecruitingCard` | baseball pitching | ❌ none |
| `HittingDoctrineBlock` | baseball hitting | ❌ none |
| `UhrcReportCard` | both — discipline scope passed explicitly | ❌ none (controlled by `disciplines` prop) |

## RR-10 minor protection

- Recruiter contact pathways gated by parent supremacy in
  `parentLinking.ts` invariants.
- No pay-to-win visibility surfaces shipped.
- No engagement-loop ranking in recruiting card.

## Verdict

**Pitcher recruiting GREEN. Hitter recruiting P1 polish (non-blocking).**
No cross-sport leakage. RR-9 and RR-10 invariants intact.

---

## Hostile verification appendix (2026-06-06)

Cross-referenced from `docs/asb/baseball-launch-verification.md`.

| Check | Verdict | Evidence |
|---|---|---|
| Pitcher recruiting card present | PASS | `src/components/recruiting/PieV2RecruitingCard.tsx` |
| Hitter recruiting card present | FAIL (B-2) | no `HittingRecruitingCard` in repo |
| Scout evaluation isolated from organism truth | PASS | `ScoutEvaluationForm.tsx:42` writes only to `scout_evaluations` |
| Cross-discipline leakage (pitcher → hitter signals) | PASS | `PieV2RecruitingCard` only consumes `PieV2SessionAggregate` |
| RR-9 gate structurally exists | PASS | `PieV2RecruitingCard.tsx:23` early return on `!optIn` |
| RR-9 gate controlled by athlete consent | **FAIL (B-1)** | `CoachAthleteDetail.tsx:204-211` — gate toggled by viewing scout, no persisted athlete consent row |
| RR-10 minor protection at recruiting render | **FAIL (B-3)** | no `is_minor` check before render |
| Athlete-facing recruiting consent surface | **FAIL (B-4)** | no such surface in `src/pages/` |

**Recruiting verdict:** downgraded from 90% to 60% under hostile re-evaluation. Public launch blocked by B-1 / B-3 / B-4. Soft launch acceptable only if recruiting card is hidden for the cohort.
