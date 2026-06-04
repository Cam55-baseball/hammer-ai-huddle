# Hammer Implementation Master Plan
**Phase 7 — Final Pre-Build Planning Artifact**

Status: Planning only. No code, UI, prompts, schema, projections, emitters, or RR-7 / RR-9 / RR-10 activation.

Subordination: Eternal Laws · Megaphase 151–160 · RR-5 / RR-6 / RR-8 sealed · Hammer Activation Phases 1–6 (Verification Verdict: COMPLETE). No new doctrine. No new capabilities. No capability expansion. Implementation sequencing only.

---

## §0 Executive Summary

If implementation begins tomorrow, Hammer reaches launch readiness in **four (4) implementation waves** executed in strict order:

| Wave | Capabilities | Theme | Visibility |
|------|--------------|-------|------------|
| **Wave 1** | C1 Name Disambiguation + C7 Silence Enforcement | Substrate roots | Invisible (substrate) |
| **Wave 2** | C6 Navigation Handoff + C2 Today Presence | First athlete surface | Athlete-visible |
| **Wave 3** | C3 Onboarding Presence + C5 First Setback Guidance | Narrative surfaces | Athlete-visible |
| **Wave 4** | C4 Parent Voice | Trust surface | Parent-visible |

The launch path is the shortest valid traversal of the Phase 6 strict dependency chain `C1 → C7 → C6 → C2 → C3 → C5 → C4`, collapsed into four waves by merging adjacent capabilities that share substrate or surface but cannot cross a constitutional boundary. Launch readiness rises from the Phase 5 baseline of **2/10** to a projected **8/10** at the end of Wave 4 — matching the Phase 6 forecast.

---

## §1 Critical Stack Consolidation

The Critical Stack as verified in Phase 6, restated verbatim:

- **C1 — Name Disambiguation.** Single canonical Hammer identity resolution across every athlete-visible surface, parent-visible surface, ledger emission, and notification channel. (Per `hammer-name-disambiguation-constitution.md`.)
- **C2 — Today Presence.** Hammer's Today-surface presence model: Entry / Context / Next-Action / Exit slots. (Per `hammer-today-guidance-architecture.md`.)
- **C3 — Onboarding Presence.** Hammer as constitutional host across athlete onboarding stages.
- **C4 — Parent Voice.** Parent-mode trust-forming surface, RR-6 / RR-8 framing legality bound.
- **C5 — First Setback Guidance.** RR-5 / RR-6 / RR-8 lawful framing of an athlete's first observed setback (missed day, regression, illness, soreness escalation).
- **C6 — Navigation Handoff.** Mediated routing between Hammer-spoken surfaces and underlying module surfaces (Today → Recovery, Today → Practice, Onboarding → Today).
- **C7 — Silence Enforcement.** Runtime primitive distinguishing **lawful silence** (constitutionally required absence) from **accidental silence** (missing presence Hammer should have filled).

**Attestation:** Zero capability additions vs. Phase 6. Zero capability removals. Zero capability redefinitions. This document does not introduce C8.

---

## §2 Wave Construction

Phase 6's strict order is `C1 → C7 → C6 → C2 → C3 → C5 → C4` (7 nodes, 6 boundaries). The goal of §2 is to merge adjacent nodes wherever merging does **not** cross a constitutional substrate-vs-surface boundary, a visibility boundary, or an authority boundary.

### Wave 1 — Substrate Roots (C1 + C7)

- **Capabilities:** C1 Name Disambiguation, C7 Silence Enforcement.
- **Why grouped:** Both are pure substrate primitives. Neither emits an athlete- or parent-visible surface on its own. C1 establishes *who is speaking*; C7 establishes *when speech is lawful*. Together they form the legality envelope every later surface depends on. Building them as a single wave is safe because they share zero downstream surfaces and cannot interfere.
- **Dependencies satisfied:** None upstream. Satisfies the upstream of every subsequent wave.
- **Risk profile:** Low athlete-visible risk (no surface). Highest *cumulative* risk because every later wave inherits these primitives — a defect here propagates everywhere.
- **Expected launch-readiness delta:** 2/10 → 3/10. No visible change for athletes, but every following wave becomes constitutionally permissible.

### Wave 2 — First Athlete Surface (C6 + C2)

- **Capabilities:** C6 Navigation Handoff, C2 Today Presence.
- **Why grouped:** C2 is the first wave where Hammer *speaks* on an athlete surface. C6 is the routing primitive that lets Today-speech terminate in a real destination. Shipping C2 without C6 strands every Hammer next-action in a dead link; shipping C6 without C2 produces a router with no caller. They share the Today surface area and must launch together to avoid an incoherent intermediate state.
- **Dependencies satisfied:** Requires Wave 1 (C7 must define silence-zones before Today is allowed to render Hammer; C1 must resolve identity before Today can attribute speech).
- **Risk profile:** Highest *visible* risk — this is the first wave an athlete experiences as a behavioral change.
- **Expected launch-readiness delta:** 3/10 → 5/10. Today becomes a Hammer-mediated surface; primary daily confusion vector resolved.

### Wave 3 — Narrative Surfaces (C3 + C5)

- **Capabilities:** C3 Onboarding Presence, C5 First Setback Guidance.
- **Why grouped:** Both are narrative-host surfaces (Hammer as guide through a multi-step lived sequence). Both require C2's presence-slot model as substrate. Both must respect RR-5 / RR-6 / RR-8 framing legality. Onboarding and First-Setback share the same authoring discipline (lawful narrative overlay, never destiny framing, never identity locking) and the same UX shell pattern, so they can be authored in one wave without overlap.
- **Dependencies satisfied:** Requires Wave 2 (Today presence model + navigation handoffs). Indirectly requires Wave 1.
- **Risk profile:** Medium. Narrative correctness risk is high (RR-5/6/8 compliance), but the surfaces are isolated from daily flow.
- **Expected launch-readiness delta:** 5/10 → 7/10. Onboarding becomes coherent end-to-end; first lived setback no longer produces confusion.

### Wave 4 — Trust Surface (C4)

- **Capabilities:** C4 Parent Voice.
- **Why grouped:** C4 stands alone. Parent surfaces require RR-6 / RR-8 framing legality already proven on athlete-facing surfaces (C5), and require the silence-enforcement primitive (C7) to be battle-tested before Hammer addresses minors' parents. Merging C4 into Wave 3 would force parent-facing speech before athlete-facing setback framing has been observed in production.
- **Dependencies satisfied:** Requires Wave 3 (framing legality proven). Indirectly requires Waves 1–2.
- **Risk profile:** Highest *trust* risk — parent surfaces are the first interaction with the minor-supremacy authority hierarchy.
- **Expected launch-readiness delta:** 7/10 → 8/10. Parent trust loop closes; launch threshold reached.

**Exact wave count: 4.**

---

## §3 Wave Dependency Verification

### Can Wave N collapse into Wave N−1?

| Boundary | Merge attempt | Why it fails |
|----------|---------------|--------------|
| W2 ⇒ W1 (add C6/C2 to substrate wave) | Forces Hammer to speak on Today before C7's silence-zone classification is observable. Constitutional breach: speech enters undefined silence-zones, violating RR-5 lawful narrative discipline and Phase 6 §F (silence-vs-surface boundary risk). |
| W3 ⇒ W2 (add C3/C5 to Today wave) | Onboarding and First-Setback are *narrative* surfaces that require C2's slot model to already be live. Building all three simultaneously means RR-5/6/8 framing legality is authored before its substrate is observed in production — narrative drift becomes undetectable. |
| W4 ⇒ W3 (add C4 to narrative wave) | Parent surfaces address minors. C4 must inherit framing legality *proven* on athlete surfaces; merging means parent-mode launches before athlete-mode setback framing has been live long enough to surface any RR-6 / RR-8 violation. Violates minor-supremacy doctrine (Megaphase 151–160). |

### Single attempted reduction to 3 waves

Attempt: merge W3 into W2 (one big "athlete surface" wave). Rejected — see W3⇒W2 row above. C3 and C5 cannot author RR-5/6/8 framing until C2 has produced replay-visible presence events confirming silence-enforcement holds under live load. Any earlier ship breaks the Phase 6 sequencing invariant.

**Result: 4 waves is the minimum safe implementation unit.**

---

## §4 Implementation Readiness Review

Per-wave readiness, planning-only. No file paths or code shapes.

### Wave 1 — Substrate Roots

- **Inputs required:** Existing ASB ledger, existing Hammer identity references scattered across athlete + parent + notification surfaces, existing absence/quiet-period heuristics across Today / Coach / Recovery surfaces.
- **Existing architecture leveraged:** Canonical event emit/lineage primitives (Megaphase 76–90), command projections, runtime kernel C1 (Megaphase 63–67).
- **Expected touch surfaces:** Identity-resolution layer (single canonical resolver, all callers updated); silence-classification primitive (new runtime concept, no UI). Substrate-only.
- **Verification:** All Hammer identity references resolve through one canonical path; every Today/Coach/Recovery/Onboarding surface emits a classifiable silence-zone state (lawful vs accidental) in its observability stream.
- **Rollout risk:** Identity-resolution drift if any caller is missed; mitigated by exhaustive call-site enumeration before merge.

### Wave 2 — First Athlete Surface

- **Inputs required:** Wave 1 substrate; existing readiness, hammer-state, next-action, coach-hammer-next-step hooks.
- **Existing architecture leveraged:** Today page shell, CommandCenterSection, existing next-action derivation.
- **Expected touch surfaces:** Today page presence slots (Entry / Context / Next-Action / Exit); navigation handoff layer between Today and module destinations (Recovery, Practice, Vault, Tex Vision, Nutrition).
- **Verification:** Every Today render either populates all four slots lawfully or emits a lawful-silence classification per Wave 1. Every Hammer next-action terminates in a live, reachable destination.
- **Rollout risk:** First athlete-visible behavioral change — staged rollout recommended.

### Wave 3 — Narrative Surfaces

- **Inputs required:** Waves 1–2; existing onboarding flow; existing setback signal surfaces (missed-day detection, illness/soreness escalations, regression projections).
- **Existing architecture leveraged:** Onboarding athlete flow, escalation feed, command projections, RR-5/6/8 constitutional copy primitives already authored in `src/lib/copy/*`.
- **Expected touch surfaces:** Onboarding stage shells (Hammer as host); first-setback narrative overlay on Today / Recovery / Setback surfaces.
- **Verification:** Onboarding completes with Hammer present at every stage; first observed setback produces a lawful framing event (no destiny language, no identity locking, athlete may revoke per RR-5).
- **Rollout risk:** Narrative-correctness drift — requires RR-5/6/8 audit before each surface ships.

### Wave 4 — Trust Surface

- **Inputs required:** Waves 1–3; existing parent invite + parent dashboard surfaces; minor-supremacy enforcement points.
- **Existing architecture leveraged:** Parent invite acceptance flow, parent visibility-scope firewall (Megaphase 151–160).
- **Expected touch surfaces:** Parent-mode Hammer voice across landing, dashboard, safety, recovery, progress surfaces.
- **Verification:** Every parent-visible Hammer surface respects RR-6 / RR-8 framing legality and minor-supremacy precedence; safeguarding orchestration sub-route reachable from every parent surface.
- **Rollout risk:** Trust-formation risk on first parent interaction — staged rollout to a small cohort recommended.

---

## §5 Acceptance Criteria

All criteria are measurable and capability-based.

### Wave 1
- 1.1 Every athlete-visible and parent-visible surface that references Hammer resolves through a single canonical identity resolver.
- 1.2 Every surface in the Today / Coach / Onboarding / Recovery / Parent route set emits a deterministic silence-zone classification (lawful | accidental) per render.
- 1.3 Zero parallel identity resolution paths exist (audited via grep of all Hammer references).

### Wave 2
- 2.1 Today renders Entry / Context / Next-Action / Exit slots OR emits lawful-silence for any unpopulated slot.
- 2.2 Every Hammer next-action terminates in a navigable route present in the application router.
- 2.3 Zero athlete sessions produce an accidental-silence classification on the Today surface without a corresponding escalation event.

### Wave 3
- 3.1 Onboarding completion rate measurable per stage; Hammer present at every stage transition.
- 3.2 First observed setback (missed-day | illness | soreness escalation | regression) produces a lawful framing event with RR-5/6/8 compliance attestation.
- 3.3 Athlete may revoke any narrative thread per RR-5; revocation is replay-visible.

### Wave 4
- 4.1 Every parent-visible Hammer surface emits a parent-scope visibility classification.
- 4.2 Minor-supremacy precedence is enforced on every parent surface addressing a minor athlete (parent voice never overrides athlete-reported pain per RR-6).
- 4.3 Safeguarding orchestration sub-route reachable in one interaction from every parent surface.

---

## §6 Launch Path Simulation

### After Wave 1 (substrate live, no visible change)
- Athlete journey: unchanged. Confusion vectors unchanged.
- Parent journey: unchanged.
- Readiness: **3/10** — substrate enables legal future surfaces.

### After Wave 2 (Today + Navigation live)
- Athlete journey: Discovery / Signup unchanged. **First training day**: Today now presents Hammer-mediated next-action with lawful exit. **First missed day**: Today renders lawful-silence + escalation, no longer ghost-quiet. **Navigation**: every CTA reaches a live destination.
- Parent journey: unchanged.
- Readiness: **5/10** — daily-flow confusion resolved.

### After Wave 3 (Onboarding + First Setback live)
- Athlete journey: **Signup → Onboarding**: Hammer hosts every stage; athletes complete onboarding without abandonment from disorientation. **First setback**: lawful framing, no destiny language, athlete remains in continuity.
- Parent journey: unchanged.
- Readiness: **7/10** — full athlete-side coherence achieved.

### After Wave 4 (Parent Voice live)
- Athlete journey: unchanged from W3.
- Parent journey: **Landing → Purchase → Invite → Acceptance → Dashboard → Safety → Recovery → Progress**: Hammer present with trust-forming voice respecting minor supremacy; parents understand the platform without prior knowledge.
- Readiness: **8/10** — launch-ready.

---

## §7 Failure Analysis

| Wave | What can go wrong | Dependency that can break | Verification that protects |
|------|-------------------|---------------------------|----------------------------|
| 1 | Identity resolver misses a caller → parallel Hammer identities ship. | C1 invariant. | §5 1.3 grep audit; ledger lineage check. |
| 1 | Silence classification incorrect → all later waves inherit broken legality envelope. | C7 invariant. | §5 1.2 per-render classification observability. |
| 2 | Today speaks during a lawful-silence zone. | Wave 1 C7 → Wave 2 C2 boundary. | §5 2.1 lawful-silence emission on every unpopulated slot. |
| 2 | Next-action terminates in a dead route. | C6 routing primitive. | §5 2.2 router-membership check at emit time. |
| 3 | Onboarding stage missing Hammer presence → user falls off. | Wave 2 C2 substrate. | §5 3.1 per-stage presence audit. |
| 3 | Setback framing violates RR-5/6/8 (destiny language, identity locking). | C5 framing legality. | §5 3.2 RR-5/6/8 compliance attestation per emission. |
| 4 | Parent voice overrides athlete-reported pain. | RR-6 minor supremacy. | §5 4.2 minor-supremacy enforcement check. |
| 4 | Parent surface omits safeguarding handoff. | Megaphase 151–160 safeguarding orchestration sub-route. | §5 4.3 reachability check. |
| all | Sequencing violation (wave shipped out of order). | Phase 6 strict order. | Pre-deploy gate: prior-wave acceptance criteria must be green. |

---

## §8 Build Efficiency Analysis

- **Redundant planning eliminated:** All capability-by-capability planning phases (originally seven, one per C1–C7) collapse into this single master plan plus four wave acceptance specs.
- **Overlapping touch surfaces (intentionally co-waved):**
  - C6 + C2 share the Today surface area → one shell update, not two.
  - C3 + C5 share narrative-host authoring discipline + RR-5/6/8 copy primitives → one authoring pass.
- **Future phases rendered unnecessary:** Phase 7 is the terminal planning phase. No Phase 8 planning artifact is required. Subsequent phases are build phases (Wave 1 build, Wave 2 build, …), not planning phases.
- **Doctrine reuse:** No new constitutional documents authored. Every wave references existing doctrine (Eternal Laws, RR-5/6/8, Megaphase 76–160, Hammer Phases 1–6).
- **Net effort reduction vs. naive 7-capability sequential plan:** ~40% fewer build cycles via wave coalescing (4 vs. 7).

---

## §9 Final Launch Sequence

```
Wave 1 — C1 Name Disambiguation + C7 Silence Enforcement       [substrate]
  ↓
Wave 2 — C6 Navigation Handoff + C2 Today Presence             [athlete surface]
  ↓
Wave 3 — C3 Onboarding Presence + C5 First Setback Guidance    [athlete narrative]
  ↓
Wave 4 — C4 Parent Voice                                       [parent trust]
  ↓
LAUNCH READY (readiness 8/10)
```

This is the shortest valid sequence. Any reordering violates the Phase 6 strict dependency chain. Any merger violates a constitutional substrate-vs-surface or athlete-vs-parent boundary (§3).

---

## §10 Post-Launch Backlog

Clearly partitioned. Launch-critical = C1–C7 only.

### Post-launch (deferred, gated by `docs/asb/post-mastery-expansion-roadmap.md` activation prerequisites)

- **RR-7 Career Arc & Longitudinal Identity** — Career-arc surface, longitudinal identity replay overlays. Implementation deferred per Presentation Mode Lock release notes (mem://constraints/presentation-mode-lock).
- **RR-9 Exposure & Visibility Ethics** — Visibility pathways, ranking surfaces (minors protection-first).
- **RR-10 Recruiter Contact & Commercial Ethics** — Recruiter contact orchestration, commercial visibility surfaces.
- **Hammer enhancements (post-launch):** richer multi-turn dialogue, voice modality, coach-mediated Hammer surfaces, advanced setback narrative threading, cross-arc longitudinal voice continuity.

None of the above block launch. None may be promoted into the Critical Stack without re-running Phase 6 verification.

---

## §11 Final Verdict

| Question | Answer |
|----------|--------|
| If Waves 1–4 are executed correctly, will Hammer become launch-ready? | **Yes.** |
| Will athlete confusion be resolved? | **Yes** — Today (W2) + Onboarding (W3) + First Setback (W3) close the three dominant confusion vectors identified in Phase 5. |
| Will parent trust materially improve? | **Yes** — Wave 4 closes the parent-voice gap that drives the parent-side readiness floor. |
| Will implementation planning be complete? | **Yes** — Phase 7 is the terminal planning artifact. Subsequent phases are build execution. |

**Final readiness score (post-W4 projection): 8/10 — launch-ready.**

---

## §12 Stop Gate Confirmation

- No code.
- No UI.
- No prompts.
- No schemas.
- No projections.
- No emitters.
- No RR-7.
- No RR-9.
- No RR-10.

Planning document only. The next phase enters build execution beginning with **Wave 1 — Substrate Roots (C1 + C7)**.
