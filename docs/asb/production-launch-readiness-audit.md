# Hammers Modality — Production Launch Readiness Audit

**Status:** SEALED · Audit-only · No implementation · No schema · No migrations · No emitters · No projections · No new capabilities · No RR-7 · No RR-9 · No RR-10.

**Subordination:** Eternal Laws · Megaphase 151–160 · RR-5 Narrative Continuity · RR-6 Injury Recovery · RR-8 Life Context · Hammer Activation 1–8 · Hammer Execution Constitution · Hammer Waves 1–4 Ratified · Hammer Critical Stack Validation Audit.

**Scope:** Forensic launch-governance review of the platform as it stands today against the experience of a brand-new athlete and a brand-new parent joining without external assistance.

---

## §0 Audit Objective

Three explicit verdicts:

1. **Can an athlete join today and successfully navigate the platform without external assistance?**
   **Verdict:** YES — conditional. Onboarding (`AthleteOnboarding.tsx`), Today (`Today.tsx` + `TodayGuidanceSlots`), Practice, Training, RTP, and Safety surfaces are reachable, lawful-silence-aware (Wave 1 C7), and produce a coherent next-action via `useNextAction` + C6 handoff. Lawful confusion remains in unpopulated-with-no-signal first-session windows where the C3 onboarding resolver correctly emits silence but offers no rationale surface (G1 in the Hammer Critical Stack Audit).

2. **Can a parent join today and successfully understand the platform without external assistance?**
   **Verdict:** PARTIAL. `AcceptParentInvite.tsx` is humanized, protection-first, and now mounts `HammerParentVoice` for the `invited-not-accepted` state. After acceptance there is no parent dashboard mount of `HammerParentVoice` for the post-accept states (`accepted-active`, `accepted-recovery-state`, `accepted-missingness-window`, `accepted-safeguarding-active`, `accepted-revoked`, `accepted-multi-athlete`) — G2 in the Hammer Critical Stack Audit. Parent supremacy, RR-6/RR-8 honesty, and silence integrity are preserved; comprehension on day 2+ is not.

3. **Can launch proceed?**
   **Verdict:** Athlete-facing public launch may proceed. Parent-facing public launch is **conditional** on shipping G1 (silence rationale surface) and G2 (parent dashboard `HammerParentVoice` mount). No constitutional blockers. No authority leaks. No RR-5/6/8 violations. No demo↔prod leaks.

---

## §1 Launch Surface Inventory

| Surface | Purpose | Implementation | Dependencies | User Visibility | Launch Criticality |
|---|---|---|---|---|---|
| Today | Daily entry; presence + next action | `src/pages/Today.tsx`, `src/components/today/TodayGuidanceSlots.tsx` | C1 identity, C2 guidance slots, C6 handoff, C7 silence, `useNextAction`, `useHammerState` | First surface every session | **P0** |
| Onboarding | Athlete account → first signal | `src/pages/AthleteOnboarding.tsx`, `src/lib/runtime/onboarding/resolver.ts` | C3 resolver, C7 silence, C1 identity | First-login critical path | **P0** |
| Practice | Daily action surface | `src/pages/*Trainer*`, `Practice` routes | Lawful destination set in `handoff/destinations.ts` | Daily | **P0** |
| Training | Block-level program | `src/pages/TrainingBlock.tsx` | Lawful destination, prescription projections | Weekly | **P0** |
| Relational | RR-4 parent linking surface | `src/pages/Relational.tsx`, `src/pages/AcceptParentInvite.tsx`, `parentLinking.ts` | RR-4 relationship topics, RR-8 minor supremacy | Onboarding + invite | **P0** |
| Safety | Safeguarding entry | `src/pages/SafetyCenter.tsx` | Safeguarding orchestration | Always-on | **P0** |
| Recovery / Setback | Setback/recovery interpretive overlay | `src/lib/runtime/setback/resolver.ts` | C5 setback resolver, RR-6 | Conditional | **P0** |
| Return To Play | Human-authorized RTP | `src/pages/RTP.tsx` | RR-6 explicit human authorization | Conditional | **P0** |
| Parent Invite | Token accept | `src/pages/AcceptParentInvite.tsx` | RR-4, `HammerParentVoice` | One-time | **P0** |
| Parent Dashboard | Post-accept parent surface | (no dedicated mount) | C4 `HammerParentVoice` (unmounted post-accept) | Ongoing | **P1 — gap G2** |
| Progress | Athlete progress | `src/pages/ProgressDashboard.tsx` | Projections, lineage handles | Weekly | **P1** |
| Setback | Setback presence | `setback/resolver.ts` consumed downstream | C5, C6 | Conditional | **P0** |
| Guidance | Today guidance slot renderer | `TodayGuidanceSlots.tsx` | C2 + C7 | Daily | **P0** |
| Navigation | Lawful destination set + handoff | `handoff/destinations.ts`, `handoff/types.ts` | C6 | Always-on | **P0** |

---

## §2 Athlete First-30-Minute Audit

| Step | Sees | Believes | System Intends | Mismatch Risk | Severity | Launch Impact |
|---|---|---|---|---|---|---|
| Discovery | Marketing site / `index.html` | "An athlete-development app" | Lawful framing only | Low | Low | None |
| Signup | Auth screen | "Standard email/password" | `useAuth` + Supabase auth | Low | Low | None |
| Onboarding (`first-login`) | Minimal scaffold | "It's waiting for me" | C3 emits lawful silence + `awaiting-input` | Athlete may interpret silence as "broken" — no rationale surface (G1) | **Medium** | Tolerable; not blocking |
| First action | Practice CTA via `useNextAction` | "Do this next" | Resolver next-action with reason key `practice.window_active` | Low — reason keys are not user-facing (G4) | Low | None |
| First prescription | Practice surface populated | "The system noticed me" | C3 transitions to `first-prescription` zone (`unpopulated-surface-with-signal`) | Low | Low | None |
| First guidance | `TodayGuidanceSlots` renders 1–3 lines | "It is telling me what's next" | C2 routes via lawful handoff | Low | Low | None |
| First navigation | One CTA, one exit | "I can keep moving" | C6 destination is closed set | Low | Low | None |
| First confusion point | Empty surface on a no-signal day | "Nothing happened — is it working?" | Lawful silence by C7 | **G1 missing rationale** | Medium | Conditional |

**Conclusion:** No critical mismatches in the 30-minute window. G1 is the only meaningful friction; non-blocking for athlete launch.

---

## §3 Athlete First-30-Day Audit

| Day | Normal Path | Missed Days | Missing Data | Recovery Interrupt | Partial Onboarding | No-Activity |
|---|---|---|---|---|---|---|
| Day 1 | Onboarding → first action → guidance | n/a | C3 `first-login` silence | RR-6 honest; pain outranks inference | C3 `incomplete-onboarding` silence | C3 `no-activity` silence |
| Day 3 | Practice cadence | C2 silence + handoff intact | RR-8 missingness visible (not invented) | RTP requires explicit auth | Same as Day 1 | Same |
| Day 7 | First-week zone | Lawful silence; no fake re-engagement | Missingness preserved | C5 setback resolver routes lawfully | Onboarding gate still open | Lawful silence |
| Day 14 | Training block guidance | Lawful silence | Missingness preserved | Setback re-entry route missing (G8) | Onboarding still inviting | Lawful silence |
| Day 30 | Ongoing usage | Lawful silence | RR-8 honest | RTP gating intact | Onboarding inviting | Lawful silence |

| Axis | Score | Notes |
|---|---|---|
| Retention | 70 | No engagement manipulation; honest silence may reduce return rate but does not violate doctrine |
| Trust | 92 | RR-5/6/8 honesty visible |
| Clarity | 78 | G1 + G4 deductions |
| Guidance | 85 | C2 + C6 reliable |
| Confusion | Low–Medium | Concentrated in unpopulated-no-signal silence |

---

## §4 Parent First-30-Minute Audit

| Step | Sees | Understands | Trust Impact | Confusion Risk | Severity |
|---|---|---|---|---|---|
| Invite | Email/link with token | "My child wants me linked" | Positive | Low | Low |
| Acceptance | `AcceptParentInvite.tsx` with `HammerParentVoice` for `invited-not-accepted` | Protection-first lead, easy-remove reassurance, details collapsed | Strong | Low | Low |
| Dashboard access | No dedicated parent dashboard mount | Drops into athlete-shaped surfaces with no parent voice | **Negative** | **High** | **High (G2)** |
| First athlete review | Athlete surfaces visible per RR-4 visibility | Parent may misread athlete-shaped UI as their own | Mixed | Medium | Medium |
| Missingness review | RR-8 visibility is honest in source | No parent-shaped rendering of missingness | Mixed | Medium | Medium |
| Recovery review | RR-6 lawful; RTP gated to human | Authority hierarchy preserved | Strong | Low | Low |
| Progress review | `ProgressDashboard.tsx` | Athlete-shaped lineage; no parent translation layer | Mixed | Medium | Medium |

**Conclusion:** Acceptance is well-handled. Post-accept comprehension is the single largest parent-side risk and the launch-conditional blocker.

---

## §5 Parent First-30-Day Audit

| Scenario | Trust | Retention | Understanding | Safety | Authority Clarity |
|---|---|---|---|---|---|
| Normal athlete | High | Medium | Medium (no parent dashboard mount) | High | High (parent supremacy preserved) |
| Struggling athlete | Medium | Medium | Low without `HammerParentVoice` post-accept | High (safeguarding precedence) | High |
| Missing athlete | Medium | Low | Low (missingness honest but not parent-translated) | High | High |
| Recovering athlete | High | Medium | Medium (RR-6 honest; RTP gated) | High | High |

---

## §6 Navigation & UX Audit

| Concern | Result | Evidence | Severity | Required Action |
|---|---|---|---|---|
| Reachability of lawful destinations | PASS | `handoff/destinations.ts` closed set; `isLawfulDestination` guard in `TodayGuidanceSlots` | — | — |
| Loop completion (entry → context → next → exit) | PASS | `resolveGuidanceSlots` returns 4-slot descriptor | — | — |
| Dead ends | LOW RISK | Lawful silence may appear as dead end in no-signal windows | Medium | G1 |
| Broken journeys | NONE FOUND | All resolvers return `Object.freeze`d descriptors | — | — |
| Circular routing | NONE FOUND | Next-action and exit handoff bound to distinct lawful destinations | — | — |
| Unclear CTAs | LOW | `ctaLabelRef` resolves via Wave 1 identity; no copy authored at resolver | Low | G4 reason-key copy table |
| Missing explanations | KNOWN | G1 silence rationale | Medium | G1 |
| Missing exits | NONE FOUND | C6 exit handoff in all populated zones | — | — |
| Setback re-entry route | KNOWN GAP | G8 in critical-stack audit | Medium | G8 (post-launch) |
| Route registry parity | KNOWN GAP | G7 in critical-stack audit | Low | G7 (test only, post-launch) |

---

## §7 Guidance Quality Audit

| Surface | Clarity | Specificity | Trustworthiness | Missingness Honesty | Silence Quality | Authority Compliance | Confusion |
|---|---|---|---|---|---|---|---|
| Today Guidance (C2) | 88 | 80 | 95 | 95 | 98 | PASS | Low |
| Onboarding Guidance (C3) | 85 | 78 | 95 | 95 | 95 | PASS | Low–Medium (G1) |
| Setback Guidance (C5) | 87 | 80 | 95 | 95 | 95 | PASS (RR-6) | Low |
| Parent Voice (C4) | 78 | 70 | 95 | 95 | 98 | PASS (parent supremacy) | Medium (G2) |
| Navigation Handoffs (C6) | 90 | 85 | 95 | n/a | n/a | PASS | Low |

No surface invents copy, diagnoses, predicts, or authors organism truth. All slots collapse to `null`/lawful-silence on absence of signal.

---

## §8 Trust & Safety Audit

| Axis | Strength | Weakness | Failure Mode | Launch Impact |
|---|---|---|---|---|
| Athlete trust | RR-5 honesty; no destiny framing; no fake certainty | Silence may read as neglect (G1) | Athlete misreads silence as broken system | Non-blocking |
| Parent trust | Acceptance flow humanized; protection-first | No post-accept parent voice (G2) | Parent loses confidence after Day 1 | Conditional blocker |
| Recovery trust | RR-6 athlete-reported pain outranks inferred readiness; RTP requires human auth | No athlete pain-input channel (G5) | Pain signal cannot enter system natively | Non-blocking (RR-6 still honored by silence) |
| Platform trust | Single Hammer authority (C1); demo↔prod firewall | Demo firewall lacks DEV-only test gating (G10) | Theoretical leak under misconfiguration | Non-blocking |
| Safety trust | Safeguarding orchestration precedence preserved; safeguarding short-circuits all resolvers | None material | — | None |

---

## §9 Launch Blocker Search

Adversarial scan against the entire stack:

**Critical blockers:** NONE.

**Major blockers (parent-facing launch only):**
- **M1 — G2 Parent dashboard `HammerParentVoice` mount missing.** Without it, parents land in athlete-shaped surfaces with no parent translation after acceptance.

**Minor blockers (non-blocking):**
- **m1 — G1 Silence rationale surface.** Parents and athletes have no read on "why is this empty?"
- **m2 — G4 Reason-key copy table.** Reason keys like `practice.window_active` are not surfaced as readable text anywhere.
- **m3 — G5 Athlete pain-input channel.** RR-6 honors pain when reported, but there is no first-class input path.
- **m4 — G8 Setback re-entry route.** No lawful destination registered for return-from-setback.
- **m5 — G3 Identity-label lint.** No automated guard against authoring labels outside `getHammerIdentity()`.
- **m6 — G6 Multi-athlete parent contract docs.** Behavior is correct; documentation thin.
- **m7 — G7 Route registry parity test.** No automated test that lawful destinations stay in sync with router.
- **m8 — G9 Lineage handle opacity.** `ledger:evt:…` strings are opaque without operator tools.
- **m9 — G10 Demo firewall DEV-only test gating.** Tests run in all envs.

**Hidden blockers:** None discovered beyond the catalogue above.

**Architectural blockers:** NONE. The Hammer Critical Stack Audit certifies 96/100 constitutional compliance; no authority inversions, no replay drift, no parallel surfaces.

**UX blockers:** G1 (medium) + G2 (parent-facing high).

**Trust blockers:** G2 only, for parents.

**Adoption blockers:** Honest silence is doctrinally required and may reduce raw engagement metrics. This is not a blocker — it is a constitutional feature.

---

## §10 Launch Readiness Scoring

| Axis | Score | Rationale |
|---|---|---|
| Athlete Simplicity | 85 | One CTA per surface, single Hammer voice, lawful silence; G1 deducts |
| Parent Simplicity | 70 | Acceptance flow strong; post-accept dashboard missing (G2) |
| Guidance Quality | 87 | All resolvers pure, frozen, lineage-bound; G4 deducts |
| Navigation Quality | 90 | Closed lawful-destination set; no dead ends in populated zones |
| Trust Formation | 88 | RR-5/6/8 honesty; G2 caps parent trust |
| Recovery Safety | 92 | RR-6 strict; RTP human-gated; G5 deducts on input ergonomics |
| Retention Potential | 72 | Doctrine forbids engagement manipulation; retention will be earned via trust, not loops |
| Launch Readiness (athlete) | 87 | Ship today |
| Launch Readiness (parent) | 74 | Ship after G1 + G2 |
| Overall Platform Readiness | **82 / 100** | Constitutional compliance 96; UX completeness 82 |

---

## §11 Final Launch Verdict

**Can launch proceed immediately?** YES for athlete-facing public launch.

**Can launch proceed conditionally?** YES for parent-facing public launch, conditional on G1 + G2.

**Must launch be blocked?** NO. No constitutional, safety, authority, replay, or safeguarding blockers exist.

**Blocking items (parent-facing only):**
- G2 — Parent dashboard `HammerParentVoice` mount for post-accept states.

**Non-blocking items (athlete + parent):**
- G1 silence rationale surface · G3 identity-label lint · G4 reason-key copy table · G5 athlete pain-input channel · G6 multi-athlete parent contract docs · G7 route registry parity test · G8 setback re-entry route · G9 lineage handle opacity · G10 demo firewall DEV-only test gating.

**Recommended actions (in order):**
1. Ship athlete-facing public launch.
2. Implement G2 (additive parent dashboard mount of `HammerParentVoice`).
3. Implement G1 (silence rationale surface using existing reason keys).
4. Backfill G3–G10 on the post-launch roadmap.

**Launch recommendation:** **PROCEED with athlete-facing public launch. HOLD parent-facing public surface until G1 + G2 ship.** No RR-7/9/10 work required. No architectural expansion required. No new capabilities required.

---

## §12 Stop Gate

Audit only. No implementation. No schema. No migrations. No emitters. No projections. No RR-7. No RR-9. No RR-10. No new capabilities. No architecture expansion. Two files touched: this document + `.lovable/plan.md`.
