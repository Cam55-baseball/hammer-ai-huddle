# Reality Validation Report — Cohort {N}

**Cohort:** C{N}
**Target size:** {10 | 25 | 50}
**Actual size:** {n}
**Signup window:** {YYYY-MM-DD} → {YYYY-MM-DD}
**Report issued:** {YYYY-MM-DD}
**Authored by:** {observer(s)}

Bound by `docs/asb/v1-reality-validation-protocol.md`.
Sources: `docs/asb/v1-launch-operations-plan.md` (funnel, scoreboard, V1.x board).

---

## 1. Cohort summary

Activation funnel (counts, % of cohort, median time-to-stage):

| Stage                       | Count | % cohort | Median time | Drop-off vs prior |
|-----------------------------|-------|----------|-------------|-------------------|
| Signup                      |       | 100%     | —           | —                 |
| Profile completion          |       |          |             |                   |
| First event                 |       |          |             |                   |
| First `/command` visit      |       |          |             |                   |
| First daily-plan engagement |       |          |             |                   |

Activation band (from Scoreboard): **Healthy / Warning / Critical**

---

## 2. Retention table

| Window | Returned | % cohort | Band                     |
|--------|----------|----------|--------------------------|
| D1     |          |          | Healthy / Warning / Critical |
| D7     |          |          | Healthy / Warning / Critical |
| D30    |          |          | Healthy / Warning / Critical |

Top-5 athlete-loss locations from `v1-launch-operations-plan.md` §C —
confirmed / refuted / insufficient signal:

1. Stage 5→6 (onboarding → first event): {confirmed | refuted | insufficient}
2. Stage 7→8 (trust lineage missing): {…}
3. Stage 8→9 (per-modality friction): {…}
4. Stage 9→D7 (no weekly digest): {…}
5. Stage D7→D30 (no trajectory delta): {…}

---

## 3. Trust signal log

| Date | Athlete | Surface | Bucket | Verbatim | Observer |
|------|---------|---------|--------|----------|----------|
|      |         |         | confusion / skepticism / navigation / Hammer |  |  |

---

## 4. Delight signal log

| Date | Athlete | Surface | Bucket | Verbatim | Observer |
|------|---------|---------|--------|----------|----------|
|      |         |         | favorite / most-used / first-value |  |  |

---

## 5. New RFLs created this cohort

| RFL ID | Title | Severity | Source signals (≥2) | V1.x or V2 |
|--------|-------|----------|---------------------|------------|

---

## 6. New positive reality evidence

| Surface | Pattern | Athletes (≥2) | Constitutional expectation confirmed |
|---------|---------|---------------|--------------------------------------|

Append confirmed entries to the `Positive Reality Evidence` section of
`docs/asb/reality-feedback-ledger.md`.

---

## 7. Constitutional expectations: matches vs misses

**Matches** (organism behaved as constitutional doctrine predicted):
- …

**Misses** (organism behavior diverged from doctrine):
- …

Note: a miss is a reality signal, not a doctrine violation. Doctrine is
re-evaluated only via formal RFL escalation, not inside this report.

---

## 8. Recommended V1.x priority changes

Re-rank against the existing V1.x board in `v1-launch-operations-plan.md` §F.
Do not invent new severities. Do not promote one-off signals.

| RFL | Previous tier | Proposed tier | Reality evidence |
|-----|---------------|---------------|------------------|

---

## 9. Verdict for next cohort

**Verdict:** PROCEED / PROCEED WITH ADJUSTMENTS / HALT

**Justification:**

**If PROCEED WITH ADJUSTMENTS:** list the adjustments and the V1.x items
they map to.

**If HALT:** list the blockers and the resolution path before the next
cohort opens.
