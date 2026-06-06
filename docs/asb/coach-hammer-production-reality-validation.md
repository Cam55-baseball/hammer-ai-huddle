# Coach Hammer — Production Reality Validation

**Date:** 2026-06-06  
**Mode:** Measurement-only (no code changes)  
**Source of truth:** `asb_events`, `asb_topic_registry`, `profiles` (live production)

> Trust runtime behavior only. This sprint validates whether the unified
> Coach Hammer system — accepted as `GO` at 92% guidance completeness in the
> prior ratification — is actually being **adopted, used, and effective** in
> production, or whether the accepted GO is architectural-only.

---

## Population baseline

| Metric | Value |
|---|---|
| Total profiles | **145** |
| WAU (profile updated ≤ 7 d) | **2** |
| MAU (profile updated ≤ 30 d) | **5** |
| Total `asb_events` ever emitted | **26** |
| Distinct athletes in `asb_events` | **2** |
| `asb_events` window | 2026-05-26 → 2026-06-05 |

**Observed emitted topics (all-time, all topics):**

| topic_id | count |
|---|---|
| `behavioral.stress` | 3 |
| `athlete.plan.today` | 3 |
| `behavioral.checkin` | 3 |
| `behavioral.fatigue` | 3 |
| `behavioral.hydration` | 3 |
| `behavioral.readiness` | 3 |
| `behavioral.sleep` | 3 |
| `behavioral.soreness` | 3 |
| `athlete.schedule.day_type` | 2 |

Hammer-namespaced topics emitted: **0** across all 16 registered Hammer topics.

---

## Section A — Hammer Adoption Funnel

```sql
SELECT topic_id, count(*) AS n, count(DISTINCT athlete_id) AS users
FROM asb_events
WHERE topic_id LIKE 'hammer.%'
   OR topic_id LIKE 'intelligence.next_step%'
   OR topic_id LIKE 'onboarding.%'
   OR topic_id LIKE 'prescription.daily%'
GROUP BY topic_id ORDER BY n DESC;
-- 0 rows
```

| Stage | Events | Distinct athletes | % of population |
|---|---|---|---|
| Hammer surfaced (`prescription.daily.rendered`) | 0 | 0 | 0% |
| Hammer viewed | 0 | 0 | 0% |
| Onboarding started (`onboarding.path_selected`) | 0 | 0 | 0% |
| Onboarding completed (`onboarding.step_completed`) | 0 | 0 | 0% |
| Next step opened (`intelligence.next_step.resolved`) | 0 | 0 | 0% |
| Daily plan opened (`prescription.daily.rendered`) | 0 | 0 | 0% |
| Chat opened (`hammer.chat.message`) | 0 | 0 | 0% |
| Modality started (`prescription.daily.modality.*`) | 0 | 0 | 0% |
| Modality completed | 0 | 0 | 0% |

- **Funnel %:** undefined (numerator 0 at every stage)
- **Drop-off %:** undefined
- **Largest abandonment point:** **stage 1 (surfacing)** — Hammer never reaches an athlete in production.

---

## Section B — Guidance Utilization

| Surface | Viewed | Opened | Acted | Completed |
|---|---|---|---|---|
| Hammer Now (next step) | 0 | 0 | 0 | 0 |
| Hammer Plan (daily prescription) | 0 | 0 | 0 | 0 |
| Hammer Chat | 0 | 0 | 0 | 0 |

**Utilization rate:** 0 / 5 MAU = **0%**.

---

## Section C — Next Step Effectiveness

`intelligence.next_step.resolved` events: **0**.

| Bucket | Count |
|---|---|
| Opened | 0 |
| Ignored | 0 |
| Completed | 0 |
| Replaced | 0 |
| Abandoned | 0 |

- Top-performing next steps: **n/a — no data**.
- Lowest-performing next steps: **n/a — no data**.

---

## Section D — Onboarding Effectiveness

`onboarding.knowledge_gap_resolved` events: **0**.

**Knowledge-acquisition reality check** — the prior sprint claimed to add
9 coaching columns to `profiles` (`goal_summary`, `lifting_age_years`, etc.).
Live schema query:

```sql
SELECT column_name FROM information_schema.columns
WHERE table_schema='public' AND table_name='profiles'
  AND (column_name LIKE '%goal%' OR column_name LIKE '%hammer%'
    OR column_name LIKE '%coach%' OR column_name LIKE '%lifting%'
    OR column_name LIKE '%equipment%');
-- 0 rows
```

- Most commonly missing gaps: **all 9** (no acquisition has occurred and no
  persistence column exists to store answers).
- Most commonly answered: **none**.
- Most commonly skipped: **none**.
- Acquisition effectiveness: **0%**.
- Remaining blind spots: **9 / 9**.

---

## Section E — Daily Plan Modality Utilization

All 9 modality topics registered; all 9 have **0 events**.

| Modality | Opens | Completions |
|---|---|---|
| warmup | 0 | 0 |
| speed | 0 | 0 |
| strength | 0 | 0 |
| hitting | 0 | 0 |
| throwing | 0 | 0 |
| defense | 0 | 0 |
| baserunning | 0 | 0 |
| fueling | 0 | 0 |
| recovery | 0 | 0 |

- Most-used: **none**.
- Least-used: **all (tie)**.
- Never-used: **all 9**.

---

## Section F — Chat Effectiveness

`hammer.chat.message` events: **0**.

| Metric | Value |
|---|---|
| Athlete questions | 0 |
| Hammer responses | 0 |
| Conversation abandonment | undefined |
| Repeat questions | 0 |
| Unanswered questions | 0 |

**Largest conversational weakness:** Coach Hammer has had **no production
conversations**. Effectiveness cannot be measured from telemetry.

---

## Section G — Athlete Confusion Detection

No navigation lineage events are emitted by current Hammer surfaces. Route
loops, repeated opens, and confusion patterns are **not observable** from
telemetry today.

**Top confusion sources (inferred):** unobservable — no instrumentation
emits route-transition events for Hammer surfaces.

---

## Section H — Coach Hammer Reality Scorecard

| Dimension | Weight | Score |
|---|---|---|
| Adoption % | 0.25 | 0% |
| Utilization % | 0.20 | 0% |
| Completion % | 0.15 | 0% (n/a) |
| Guidance effectiveness % | 0.20 | 0% (n/a) |
| Conversation effectiveness % | 0.10 | 0% (n/a) |
| Confusion (inverted) | 0.10 | unobservable → 0 |

**Overall Coach Hammer Reality Score: 0 / 100.**

> The architectural ratification (92% completeness) reflects **code-level
> wiring**, not lived athlete experience. Reality telemetry shows the
> system has never been exercised in production.

---

## Section I — Final Workstream Closure

### Is Coach Hammer functioning as the athlete's primary developmental coach?
**NO.** Hammer is **mounted** but not **operating**. Zero athletes have
been surfaced a Hammer next step, opened a Hammer daily plan, completed a
Hammer modality, or sent a Hammer chat message in the live ledger.

### Is additional architecture required?
**Partially.** Three concrete reality gaps:

1. **Persistence gap (RFL-020):** the 9 `profiles` coaching columns the
   prior sprint claimed to add do not exist in production. Onboarding can
   ask questions but has nowhere durable to write answers — gap resolution
   cannot persist across sessions.
2. **Emission gap (RFL-021):** mounted Hammer components do not appear to
   call `emitAsbEvent` against the 16 registered topics. Surfaces render
   without ledger writes, so no telemetry exists to validate anything.
3. **Observability gap (RFL-022):** Hammer surfaces emit no
   route-transition events, so Section G (confusion detection) is
   structurally unmeasurable.

### Is additional authority work required?
**No.** Authority unification (single `useHammerNextStep`) is sound. The
problem is downstream of authority — it is execution + persistence +
emission.

### Can Coach Hammer workstream be closed?
**NO — Workstream OPEN.** Closing now would seal a coach that exists only
in code, not in athlete experience. Constitutionally this would violate
RW-1 (organism truth supersedes architectural framing), RW-8 (real-world
observability mandatory), and EI-7 (silent infrastructure mutation
forbidden — Hammer surfaces silently render without emitting).

### Highest-value next concern
**Hammer Emission & Persistence Closure Sprint.** Three deliverables:

1. **Migration:** add the 9 coaching columns to `profiles` (or store gap
   answers in a dedicated `hammer_athlete_context` table) so onboarding
   answers persist.
2. **Emit:** wire `emitAsbEvent` into the four Hammer surfaces
   (`useHammerNextStep`, `HammerDailyPlan`, `HammerChat`,
   `HammerOnboardingChat`) so the 16 registered topics actually receive
   events.
3. **Re-run this validation** after ≥ 7 days of post-instrumentation
   athlete activity. Only then can the architectural GO be promoted to a
   production-reality GO.

---

## Verdict

- **GO / NO-GO:** **NO-GO** for production-reality readiness.
- **Workstream:** **OPEN**.
- **Architectural status:** still GO (unchanged).
- **Production status:** 0% adoption, 0% utilization, 0% effectiveness.

> Architecture without emission is invisible. Invisible coaches do not
> coach. The constitutional doctrine of organism truth requires that what
> we ship be **observable in the ledger**, not merely **mounted in JSX**.

---

## Roadmap (do not implement this sprint)

| ID | Priority | Item |
|---|---|---|
| HCR-P0-A | P0 | Add the 9 `profiles` coaching columns (or `hammer_athlete_context` table) + GRANTs + RLS. |
| HCR-P0-B | P0 | Wire `emitAsbEvent` into all four Hammer surfaces against the 16 registered topics. |
| HCR-P0-C | P0 | Emit `hammer.surfaced` / `hammer.viewed` route-transition events for Section G observability. |
| HCR-P1-A | P1 | After 7 d of post-instrumentation telemetry, re-run this validation. |
| HCR-P1-B | P1 | Define minimum adoption thresholds for promoting architectural GO → production GO (suggest: ≥ 30% MAU surfaced, ≥ 15% completion). |
| HCR-P2-A | P2 | Add lightweight chat-clustering for Section F effectiveness once chat volume exists. |
