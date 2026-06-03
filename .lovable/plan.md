# Hammer Activation Phase 2 — Critical Capability Mapping

## Deliverable
- **Create:** `docs/asb/hammer-critical-capability-map.md`
- **Edit:** `.lovable/plan.md` (append Phase 2 entry)

Single architecture document. No code, schema, projections, emitters, prompts, or UI. No RR-7/9/10 activation. Builds on Phase 1 audit + Activation Architecture, subordinate to RR-5/6/8 sealed doctrine and Eternal Laws.

## Document Structure

### §0 Objective
- Define minimum Hammer capability set for: athlete clarity, parent trust, onboarding simplicity, navigation independence.
- Gate question verbatim: *"If a first-time athlete and parent enter the platform today, can Hammer successfully guide them without requiring platform knowledge?"*
- Scope: capability inventory only — no implementation, no file/component references except as dependencies.

### §1 Critical Capability Inventory (C1–C7)
For each capability, a uniform block:
- **Objective** — one sentence.
- **Athlete value** — what clarity it unlocks.
- **Parent value** — what trust it unlocks.
- **Existing dependencies** — what sealed primitives / surfaces / RR constitutions it relies on.
- **Current coverage** — what exists today (from Phase 1 audit).
- **Missing coverage** — capability gap.
- **Readiness score (0–10)** — single number.

Capabilities:
- **C1 — Name Disambiguation** (Organism State vs. Hammer voice vs. brand label).
- **C2 — Hammer Presence on Today** (Entry/Context/Next-action/Exit slots over Organism State + readiness).
- **C3 — Hammer Presence During Onboarding** (athlete + parent invite paths).
- **C4 — Parent-Facing Hammer Voice** (trust card, invite landing, digest scope only).
- **C5 — First Setback Guidance** (Hammer's first RR-6/RR-5-cited response when readiness drops or check-in flags pain).
- **C6 — Navigation Handoff Capability** (Hammer routing user to /safety, /practice, /rtp, /bounce-back-bay without authoring action).
- **C7 — RTP / Safeguarding Silence Enforcement** (silence zones from Phase 1 §4; explicit non-speech under arbitration / RTP / minor-private threads).

### §2 Surface Dependency Matrix
Table, one row per surface — Today, Dashboard, Onboarding, Relational, Safety, Parent, Practice, Training, RTP, Bounce Back Bay.
Columns:
- Hammer present?
- Hammer absent?
- Knows enough?
- Can explain enough?
- Can guide enough?
- Status: **GREEN / YELLOW / RED**

### §3 Adoption Impact Analysis
For each C1–C7, qualitative impact rating (High / Medium / Low) on:
- trial conversion
- parent trust
- athlete retention
- onboarding completion
- navigation independence

Brief rationale per cell. Capability-level only.

### §4 Capability Dependency Order
Strict precedence: which capability must exist before another becomes useful. ASCII dependency graph:

```text
C1 (Name Disambiguation)
 └─► C2 (Today Presence) ──┐
 └─► C3 (Onboarding) ──────┤
                           ├─► C6 (Navigation Handoff) ─► C5 (First Setback)
 C7 (Silence Enforcement) ─┘                                   │
                                                               ▼
                                                          C4 (Parent Voice)
```

Explanation of each edge: why the predecessor is structurally required.

### §5 Readiness Gate
Three launch gates with exact capability requirements:
- **Launch Gate A — Internal rehearsal only:** C1 + C7.
- **Launch Gate B — Athlete-facing closed beta:** C1 + C2 + C3 + C6 + C7.
- **Launch Gate C — Public launch (athlete + parent):** C1 + C2 + C3 + C4 + C5 + C6 + C7.

State the minimum subset required before public launch becomes rational (= Gate C).

### §6 Final Recommendation
Single capability — no ties. Recommendation: **C1 — Name Disambiguation**, justified by:
- It is the only universal prerequisite (blocks C2, C3, C4, C6).
- Highest leverage for conversion + confusion reduction at lowest scope.
- Unlocks coherent voice required by every downstream capability.

### §7 Verdict
- Readiness score: **3 / 10**
- Current launch readiness: **Not Ready**
- One-paragraph explanation tying the score to Gate C unmet requirements and the C1 prerequisite.

### §8 Stop Gate Confirmation
Restates: no production code, no RR-7/9/10 activation, no schema/projection/emitter/UI/prompt changes; single output file.

## Out of scope
Code, prompts, schema, projections, emitters, UI, RR-7/9/10 activation, any new primitives.

---

# Hammer Activation Phase 2 — Critical Capability Map

**Deliverable:** `docs/asb/hammer-critical-capability-map.md` (created).
**Scope:** Architecture-only; Critical tier (C1–C7) inventoried with objective / athlete value / parent value / dependencies / coverage / readiness score; surface matrix; adoption impact; dependency graph; three launch gates (A internal, B closed beta, C public = full Critical tier).
**Verdict:** Readiness 3/10 — **Not Ready**. Recommended first build: **C1 Name Disambiguation** (universal prerequisite).
**Stop gate held:** no code, schema, projections, emitters, replay-engine, UI, prompts, primitives, or RR-7/9/10 activation.
