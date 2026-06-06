# 30-Day Launch Success Scoreboard

**Sprint:** Post-Launch Observability & Reality Validation
**Posture:** Measurement baselines, not optimization targets. Per RR-9 anti-engagement-optimization doctrine — targets exist to detect anomalies, not to drive growth-hacking.

## Day 1 — Activation

| metric | target | source |
|---|---|---|
| Signup → onboarding completion | ≥ 60% same-day | funnel (athlete) |
| Onboarding → first session | ≥ 40% same-day | funnel |
| Auth errors | < 2% of signups | `auth_logs` |
| First analysis emitted | ≥ 80% of first-session athletes | `athlete.readiness` topic |
| Safeguarding signals viewed | 100% within 24h | safeguarding reducer |

## Day 7 — Retention & Engagement Floor

| metric | target | source |
|---|---|---|
| D7 retention (≥1 session in days 1–7) | ≥ 30% | funnel |
| First recommendation opened | ≥ 50% of recommended cohort | recommendation funnel |
| Drill completion rate | ≥ 30% of opened recommendations | recommendation funnel |
| Coach engagement | ≥ 1 review per linked coach | coach funnel |
| Recruiter review rate | ≥ 1 review per active recruiter | recruiter funnel |
| Parent invite acceptance | ≥ 50% of dispatched invites | parent funnel |
| Safeguarding parent ack | 100% within 24h (minors) | safeguarding reducer |

## Day 30 — Loop Closure

| metric | target | source |
|---|---|---|
| D30 retention | ≥ 20% | funnel |
| Repeat recommendation completion | ≥ 20% of completers | recommendation funnel |
| Coach repeat usage | ≥ 2 reviews per coach | coach funnel |
| Recruiter repeat usage | ≥ 2 evaluations per recruiter | recruiter funnel |
| Parent continued engagement | ≥ 1 authorization touch / 30d | parent funnel |
| Intelligence utilization (UHRC + Hammer + trends) | ≥ 30% viewer rate per surface | intelligence utilization reducer (BLOCKED on RFL-003/004/007) |
| Safeguarding resolution median | < 72h coach, < 24h parent | safeguarding reducer |
| Athlete progression (readiness trend observability) | ≥ 60% of D30 retained have ≥ 4 analysis events | digest projection |

## Notes

- Intelligence utilization targets are **gated on instrumentation gaps RFL-003/004/007**. Until view topics emit, those rows report `unobservable=true`.
- Targets are **floors for anomaly detection**, not engagement KPIs.
- No target is reweighted to "drive engagement." Observation only.
