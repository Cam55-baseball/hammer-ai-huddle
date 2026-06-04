# Hammers Modality — Parent Launch Blocker Resolution Audit

**Status:** SEALED · Audit-only · No implementation · No schema · No migrations · No emitters · No projections · No capability additions · No RR-7 · No RR-9 · No RR-10.

**Subordination:** Eternal Laws · Megaphase 151–160 · RR-5 Narrative Continuity · RR-6 Injury Recovery · RR-8 Life Context · Hammer Execution Constitution · Hammer Waves 1–4 Ratified · Hammer Critical Stack Validation Audit · Production Launch Readiness Audit.

**Inputs:** `docs/asb/hammer-critical-stack-validation-audit.md`, `docs/asb/production-launch-readiness-audit.md`, `src/components/parent/HammerParentVoice.tsx`, `src/lib/runtime/parent/{resolver,types}.ts`, `src/pages/AcceptParentInvite.tsx`, `src/pages/Relational.tsx`, `src/lib/runtime/silence/types.ts`.

---

## §0 Audit Objective

- **What is G1?** Absence of a *silence rationale surface*. The C7 silence engine correctly classifies lawful silence (e.g. `unpopulated-surface-no-signal`, `awaiting-input`, `missing-data-dominant`), but no surface translates the verdict into a human-visible "why nothing is here" microcopy. User sees a blank/quiet region with no explanation.
- **What is G2?** Absence of a *parent dashboard `HammerParentVoice` mount* for post-accept states. `HammerParentVoice` is mounted only on `AcceptParentInvite.tsx` for the `invited-not-accepted` state. After acceptance, no parent-visible surface (`Relational.tsx` or a dedicated dashboard) mounts the component with `accepted-active-athlete`, `accepted-missingness-state`, `accepted-recovery-state`, `accepted-no-athlete-activity`, `accepted-onboarding-state`, or `accepted-setback-state`.
- **Why blockers?** G1 erodes parent comprehension of lawful silence; G2 leaves the parent without any Hammer-authored interpretive surface post-accept. Together they make lawful silence indistinguishable from a broken product on the parent side.
- **User harm if unresolved:** Parent confusion → trust loss → churn → false escalation requests. Athletes are unaffected (G2) or only marginally affected (G1).
- **Severity:** G1 — Launch Minor (athlete) / Launch Major (parent). G2 — Launch Major (parent only).
- **Minimum valid resolution:** G1 — copy-only microcopy slot rendered by the existing silence consumer when verdict ∈ {`lawful`}. G2 — mount existing `HammerParentVoice` on `Relational.tsx` (or post-accept parent route) with `accepted-*` input derived from existing relationship + timeline state. Both fixes consume only Wave 1–4 primitives. No constitutional capability added.

---

## §1 G1 Forensic Analysis — Silence Rationale Surface Absence

- **Description:** Lawful silence is enforced (`src/lib/runtime/silence/types.ts::SilenceZoneKind`, classifier in `silence/`), but no UI affordance explains *why* a slot is silent. The Hammer identity label is shown by `HammerParentVoice` and Today surfaces, but no microcopy renders for verdict=`lawful`.
- **Originating evidence:** Critical Stack Validation Audit §G1; Production Launch Readiness Audit §0 (athlete verdict) and §2 ("First confusion point" row).
- **Affected surfaces:** Today (`Today.tsx` + `TodayGuidanceSlots`), Practice empty windows, Relational post-accept, `HammerParentVoice` empty branch (returns `null` when `allLawful`).
- **Affected users:** Athlete (mild — most lawful silences are early-session and self-explaining via next-action CTAs). Parent (severe — parent has no other interpretive surface).
- **Constitutional implications:**
  - RR-8 missingness visibility: missingness *count* is exposed by `HammerParentVoice` ("N signals missing"), but the *lawful silence itself* is not narrated. No violation — visibility is preserved at the data layer. UX gap, not constitutional gap.
  - Organism State silence row (Execution Constitution §3): silence remains lawful and Hammer authors no organism truth. No violation.
- **Trust implications:** Athletes infer "first session, system is waiting" — tolerable. Parents infer "I don't know if this is working" — corrosive.
- **Launch implications:** Non-blocking for athlete launch (Readiness Audit §2 confirms tolerable). Major for parent launch.
- **Classification:** **Major (parent-facing)** · **Minor (athlete-facing)**.

---

## §2 G2 Forensic Analysis — Parent Dashboard `HammerParentVoice` Mount Absence

- **Description:** `src/components/parent/HammerParentVoice.tsx` is fully implemented and the resolver (`src/lib/runtime/parent/resolver.ts`) supports all seven `ParentStateKind` values, but the only mount site is `AcceptParentInvite.tsx` with `state: "invited-not-accepted"`. `Relational.tsx` does not mount the component for any accepted state. There is no dedicated `/parent` dashboard.
- **Originating evidence:** Critical Stack Validation Audit §G2; Production Launch Readiness Audit §0 verdict 2, §1 inventory row "Parent Dashboard | (no dedicated mount) | … | **P1 — gap G2**", §4.
- **Affected surfaces:** Post-accept parent journey. The parent lands at `/` after accept (per `AcceptParentInvite.tsx::navigate("/")`) and never re-encounters `HammerParentVoice`.
- **Affected users:** Parents only. Athletes are unaffected — C4 is parent-only.
- **Constitutional implications:**
  - Parent supremacy (Megaphase 151–160 minor-athlete supremacy): unchanged; supremacy is data-layer, not UI-layer.
  - Safeguarding precedence: unchanged; safeguarding lockdown still short-circuits in the resolver if invoked.
  - RR-5/RR-6/RR-8: unchanged; the resolver remains the sole interpretive overlay and is honest about missingness.
  - Single Hammer authority: unchanged; no second voice exists.
  - Replay determinism: unchanged; resolver is pure.
  - Verdict: **Implementation gap (mount-site only).** Not constitutional failure.
- **Trust implications:** Severe. Parent has no Hammer-authored surface to translate organism silence or missingness post-accept.
- **Launch implications:** Major for parent-facing launch. None for athlete-facing launch.
- **Classification:** **Major (parent-facing)** · **Not A Blocker (athlete-facing)**.

---

## §3 Athlete Impact Analysis (G1 + G2 unresolved)

| Axis | Impact | Evidence |
|---|---|---|
| Onboarding | None | C3 onboarding resolver enforces lawful silence with next-action CTAs (`useNextAction`). |
| Guidance | Marginal | `TodayGuidanceSlots` produces 1–3 lines; lawful silence is the only G1 surface and is rare past session 1. |
| Navigation | None | C6 handoff destinations are closed-set and reachable. |
| Trust | Negligible | RR-5/6/8 honesty is data-layer; athlete sees honest absence, not invented content. |
| Retention | Marginal | Honest silence may slightly reduce return rate; not a launch blocker (Readiness Audit §3, Retention=70). |

**Verdict:** Athlete launch may proceed with G1 + G2 unresolved. Confirmed by Readiness Audit §0 verdict 1 and §3.

---

## §4 Parent Impact Analysis (G1 + G2 unresolved)

| Axis | Impact | Evidence |
|---|---|---|
| Onboarding | Acceptable | `AcceptParentInvite.tsx` mounts `HammerParentVoice` and is humanized. |
| Understanding | **Broken** | Post-accept, parent has no Hammer interpretive surface. Blank state is indistinguishable from product failure. |
| Trust | **Eroded** | No translation of organism silence; parent cannot tell if Hammer is working. |
| Retention | **Likely loss** | Without a recurring parent surface, no reason to return. |
| Authority interpretation | Preserved structurally | Parent supremacy and RR-6/RR-8 honesty intact at data layer; not visible to parent. |

**Verdict:** Parent launch should NOT proceed with G2 unresolved. G1 alone would be tolerable.

---

## §5 Constitutional Impact Analysis

| Axis | G1 | G2 |
|---|---|---|
| RR-5 Narrative | No impact — no narrative authored | No impact |
| RR-6 Injury/Recovery | No impact — recovery state still no-route | No impact — resolver enforces no-route in `accepted-recovery-state` |
| RR-8 Life Context | Missingness data-visible; not narrated | Missingness exposed by component when mounted; not exposed when unmounted (UX gap) |
| Parent supremacy | No impact | No impact (data-layer) |
| Safeguarding precedence | No impact | No impact — `safeguardingActive` still short-circuits |
| Replay determinism | No impact | No impact — resolver pure |
| Single Hammer authority | No impact | No impact — only one voice ever surfaces |
| Organism State silence | UX gap; silence remains lawful | UX gap; silence remains lawful |

**Classification:**
- **G1 — UX gap + copy gap.** Not a constitutional failure. Not an implementation gap (silence engine works). Resolvable with microcopy.
- **G2 — Implementation gap (mount-site only).** Not a constitutional failure. Not a capability addition — component and resolver already exist.

---

## §6 Resolution Option Analysis

### G1 — Silence Rationale Surface

| Option | Description | Cost | Risk | Time | Constitutional Impact | Launch Impact |
|---|---|---|---|---|---|---|
| A — Min impl | Add a rationale microcopy line inside the existing silence consumer when verdict=`lawful`, keyed by `SilenceZoneKind` | Low | Low — copy-only, no resolver change | ~30 min | None | Resolves G1 |
| B — Min UX | Add a small "Why is this quiet?" disclosure (`<Collapsible>`) on Today and Parent Voice empty branches | Low | Low | ~45 min | None | Resolves G1 |
| C — Min copy | Static one-liner under Hammer identity label on empty Today/Parent surfaces | Trivial | Low | ~15 min | None | Resolves G1 to ~80% |
| D — Launch as-is | Ship with no rationale | Zero | Athlete: low. Parent: medium | 0 | None | G1 unresolved |

### G2 — Parent Dashboard `HammerParentVoice` Mount

| Option | Description | Cost | Risk | Time | Constitutional Impact | Launch Impact |
|---|---|---|---|---|---|---|
| A — Min impl | Mount `HammerParentVoice` on `Relational.tsx` for accepted parents; derive `ParentStateKind` from existing relationship + timeline state | Low | Low — component + resolver already exist | ~1–2 h | None | Resolves G2 |
| B — Min UX | Add a parent-specific tab/route reusing the same mount | Medium | Low | ~2–3 h | None | Resolves G2 + cleaner IA |
| C — Min copy | Cannot resolve G2 — mount is structural, not copy | — | — | — | — | Does not resolve G2 |
| D — Launch as-is | Parent-facing launch held | Zero | High parent trust/retention loss | 0 | None | G2 unresolved |

---

## §7 Blocker Classification

| Blocker | Athlete | Parent | Rationale |
|---|---|---|---|
| G1 | **Launch Minor** | **Launch Major** | Athlete has next-action CTAs; parent has no other surface |
| G2 | **Not A Blocker** | **Launch Major** | C4 is parent-only; no athlete-facing impact |

Neither blocker is **Launch Critical** — no safety, safeguarding, RTP, replay, or constitutional violation. Neither is cosmetic — both materially affect parent trust formation.

---

## §8 Publish Decision Simulation

| Scenario | Risk | Trust Impact | Retention Impact | Recommendation |
|---|---|---|---|---|
| A — Launch today, G1+G2 unresolved | Athlete: low · Parent: high | Parent trust: poor | Parent churn: high | **Athlete-only launch.** Hold parent. |
| B — Resolve G1 only | Parent still has no post-accept surface | Parent trust: still poor | Parent churn: still high | **Insufficient for parent launch.** |
| C — Resolve G2 only | Parent has surface but blank states still unexplained | Parent trust: acceptable | Parent churn: medium | **Acceptable for parent launch.** G1 backfilled post-launch. |
| D — Resolve both | All known parent friction addressed | Parent trust: good | Parent churn: low | **Recommended full launch.** |

---

## §9 Minimum Publish Path

Shortest sequenced path to full (athlete + parent) public launch:

1. **Ship athlete-facing launch immediately.** No code change required; Readiness Audit §0 verdict 1 already satisfied.
2. **G2 fix (parent dashboard mount).**
   - Edit `src/pages/Relational.tsx` to mount `HammerParentVoice` in the post-accept parent branch.
   - Derive `ParentInput.state` from existing relationship + `useAsbTimeline` state: `accepted-no-athlete-activity` if timeline empty, `accepted-active-athlete` if signals present, `accepted-missingness-state` if missingness dominates, `accepted-recovery-state` if RR-6 recovery signal present, `accepted-onboarding-state` / `accepted-setback-state` when delegating to C3/C5 inputs.
   - Pass `safeguardingActive` from existing safeguarding state if available; otherwise omit (resolver defaults to false).
   - No schema. No emitters. No new projections. No new capability.
   - Dependency: none beyond Wave 4 primitives.
3. **G1 fix (silence rationale microcopy).**
   - Add a single rationale line (Option A/C from §6) keyed by `SilenceZoneKind` inside the consumer of the silence resolver — either inside `TodayGuidanceSlots` empty branch and `HammerParentVoice` empty branch, or in a tiny shared `SilenceRationale` presentational helper.
   - Copy-only; no resolver, no schema, no emitters.
   - Dependency: G2 mount (so the parent path can render G1 copy on post-accept silence).
4. **Open parent-facing public launch.**

No RR-7. No RR-9. No RR-10. No architecture expansion. No new capability.

---

## §10 Final Verdict

| Question | Answer |
|---|---|
| Can product publish today? | **Partially.** Athlete-facing: yes. Parent-facing: no. |
| Can athlete product publish today? | **Yes.** No blocker. |
| Can parent product publish today? | **No.** G2 must be resolved first. |
| Must G1 be resolved before parent launch? | **No.** G1 is backfill-acceptable. Strongly recommended within first post-launch window. |
| Must G2 be resolved before parent launch? | **Yes.** G2 is the single parent-facing launch blocker. |
| Minimum publishable state | Athlete launch today + G2 fix before parent launch. G1 backfilled post-launch. |

---

## §11 Stop Gate

Audit only. No implementation. No new capability. No architecture expansion. No RR-7. No RR-9. No RR-10. Two files touched: this document and `.lovable/plan.md`.

**SEALED.**
