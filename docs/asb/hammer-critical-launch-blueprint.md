# Hammer Critical Launch Blueprint — Activation Phase 5

**Status:** Architecture-only consolidation. No code, UI, prompts, schema,
projections, emitters, or RR-7 / RR-9 / RR-10 activation.

**Subordinate to:** Eternal Laws · Megaphase 151–160 · RR-5 / RR-6 / RR-8
sealed constitutions · Hammer Activation Phases 1–4
(`hammer-guidance-orchestration-audit.md`,
`hammer-activation-architecture.md`,
`hammer-critical-capability-map.md`,
`hammer-name-disambiguation-constitution.md`,
`hammer-today-guidance-architecture.md`).

This document is consolidation, not new doctrine. It contradicts nothing
sealed. It exists to answer one question: **if implementation began
tomorrow, what exact Critical-tier capabilities must be built, in what
order, and why?**

---

## §0 Executive Summary

**Current Hammer status.** The underlying organism substrate (replay,
lineage, ASB ledger, RR-4 relationships, RR-5/6/8 sealed doctrine, demo
firewall, safeguarding orchestration) is mature. The user-facing "Hammer"
surface is not. Today the word "Hammer" refers, ambiguously, to a brand,
a state chip (`useHammerState`), and an implied guide that does not
actually speak. There is no canonical Hammer voice on Today, Onboarding,
or Parent surfaces.

**Current launch readiness.** **Not Ready.** Doctrine is largely
complete; the user-visible guidance layer is the bottleneck. Phase-4
scored Today at 2–3/10 across all five readiness dimensions; nothing in
this consolidation revises that upward.

**Why athletes struggle today.** They see a readiness chip with no
explanation, no single canonical next action, ambiguous naming, and no
guide voice on first login. They infer; they do not understand.

**Why parents struggle today.** They land on dashboards built for
athletes, with no Hammer-authored framing of what the platform is doing
for their child, no trust-forming first-visit guidance, and no parent
voice on safety or recovery surfaces.

**Why Critical activation is now required.** Every doctrinal precondition
is sealed. The only remaining barrier to launch is *presence* of Hammer
as a named, lawful, single-voiced guide on Today, Onboarding, and Parent
surfaces, plus the navigation and silence primitives that keep it lawful
under RR-5/6/8.

**What is preventing public launch today?** Capability-level answer:
**absence of a singular, named Hammer guide voice on the surfaces where
adoption, navigation, and trust are formed.** Not infrastructure. Not
doctrine. Presence.

---

## §1 Current-State Hammer Inventory

Consolidated single source of truth across Phases 1–4.

### 1.1 Name & Authority (Phase 3)

- **Exists:** `hammer-name-disambiguation-constitution.md` defining
  Hammer = singular guide (Recall / Explain / Guide), Organism State =
  silent readiness signal, Brand Layer = marketing only.
- **Works:** Doctrine is sealed; surface vocabulary matrix exists.
- **Athlete experience:** Still sees "Hammer State" / "Hammer Score" /
  ambiguous readiness chip in production. Doctrine is not yet bound to
  rendered strings.
- **Parent experience:** Has no way to know what "Hammer" refers to.
- **Missing:** Implementation of the rename and the canonical
  one-sentence answer ("What is Hammer?") on every surface.

### 1.2 Today Surface Guidance (Phase 4)

- **Exists:** `hammer-today-guidance-architecture.md` with four
  guidance slots (Entry / Context / Next-Action / Exit), A1–A7 arrival
  states, navigation handoff table, parent-interpretation test.
- **Works:** Slots, silence zones, and handoff rules are architecturally
  ratified.
- **Athlete experience:** Today renders a command center without a
  Hammer voice. No Entry greeting, no Context line, often no single
  Next-Action, no Exit guidance. Stranding is common.
- **Parent experience:** Today is not parent-comprehensible without a
  guide.
- **Missing:** Rendered guidance slots, silence-zone primitive,
  lineage-one-tap surface, single canonical Next-Action selector.

### 1.3 Onboarding Presence

- **Exists:** Onboarding flows route users through profile / sport /
  first event. Hammer is not the host.
- **Works:** Mechanical onboarding completes.
- **Athlete experience:** No greeting voice, no framing of what
  readiness means, no introduction to the four guidance slots.
- **Parent experience:** Not addressed in onboarding at all.
- **Missing:** Hammer-authored Onboarding presence (greet, explain,
  set expectations, hand off to Today).

### 1.4 Parent Voice

- **Exists:** Parent invite (`AcceptParentInvite`), minor-supremacy
  doctrine (Megaphase 151–160), RR-6 safeguarding precedence.
- **Works:** Parent role and authority are constitutionally clean.
- **Parent experience:** Parents see athlete dashboards. No parent-mode
  Hammer voice. No first-visit trust-forming guidance.
- **Missing:** Hammer parent-voice surface; safety/recovery explanations
  pitched to a non-athlete reader; trust-formation script.

### 1.5 First-Setback Guidance

- **Exists:** RR-5 (narrative continuity), RR-6 (injury continuity),
  RR-8 (life context) sealed. Bounce Back Bay / RTP / Safety surfaces
  exist as destinations.
- **Works:** Doctrine for *what may be said* about setbacks is fully
  bounded.
- **Athlete experience:** A setback today produces a silent readiness
  drop. No Hammer voice acknowledges it. Athletes interpret the silence
  as system breakage.
- **Missing:** Hammer's lawful first-setback acknowledgement script and
  hand-off into RR-5/6/8 destinations.

### 1.6 Navigation Handoffs

- **Exists:** Phase-4 handoff table (Relational, Practice, Training,
  Safety, RTP, Bounce Back Bay, Parent Invite).
- **Works:** Architecture is ratified.
- **Athlete experience:** Navigation is structural (tabs / links),
  unmediated by Hammer.
- **Missing:** Hammer-authored "why I'm sending you here" lines on each
  handoff.

### 1.7 Silence Enforcement

- **Exists:** Silence-zone catalog in Phase-1 §4 (safeguarding, RTP,
  minor-private, commercial); Phase-4 silence conditions per slot.
- **Works:** Doctrine is sealed; safeguarding orchestration is wired.
- **Athlete / Parent experience:** Today silence is *accidental* (no
  voice exists) rather than *enforced* (a voice exists and lawfully
  stays quiet).
- **Missing:** A runtime primitive that distinguishes "silent by law"
  from "silent by absence" and surfaces the distinction.

---

## §2 Launch-Critical Capability Stack

Seven capabilities. Critical tier. No additions, no substitutions.

### C1 — Name Disambiguation

- **Objective:** One Hammer, one Organism State, one canonical
  one-sentence answer to "What is Hammer?" across every surface.
- **Athlete problem solved:** Removes the readiness-vs-guide-vs-brand
  collision.
- **Parent problem solved:** Gives the parent a single comprehensible
  referent.
- **Dependencies:** None. Pure prerequisite.
- **Risk if omitted:** Every downstream capability inherits the
  ambiguity; C2–C7 cannot land lawfully.
- **Expected launch impact:** High across all surfaces.
- **Readiness:** Doctrine 10/10 · Implementation 1/10.

### C2 — Today Presence

- **Objective:** Hammer speaks on Today across all four guidance slots
  (Entry, Context, Next-Action, Exit) per Phase-4 architecture.
- **Athlete problem solved:** Removes silent-Today stranding; provides
  one canonical Next-Action.
- **Parent problem solved:** Makes Today legible to a non-athlete
  reader.
- **Dependencies:** C1, C6, C7.
- **Risk if omitted:** Today remains a silent command center; conversion
  and retention stall.
- **Expected launch impact:** Very High (primary daily surface).
- **Readiness:** Doctrine 9/10 · Implementation 2/10.

### C3 — Onboarding Presence

- **Objective:** Hammer hosts onboarding — greets, frames readiness,
  introduces the four slots, hands off to Today.
- **Athlete problem solved:** First-impression voicing; sets the
  expectation that Hammer is the guide, not the score.
- **Parent problem solved:** Establishes Hammer as the trustworthy
  interpreter from minute one.
- **Dependencies:** C1.
- **Risk if omitted:** Athletes enter Today with no model of who Hammer
  is; C2 lands cold.
- **Expected launch impact:** High (gates trial conversion).
- **Readiness:** Doctrine 8/10 · Implementation 1/10.

### C4 — Parent Voice

- **Objective:** Hammer speaks to parents in a parent-mode surface that
  explains the platform, safety posture, recovery posture, and progress
  without exposing athlete-private detail (minor-supremacy preserved).
- **Athlete problem solved:** Indirectly — reduces parent friction that
  forces athletes off the platform.
- **Parent problem solved:** Trust formation; intelligible safety and
  recovery narrative.
- **Dependencies:** C1, C7 (silence enforcement for minor-private and
  safeguarding zones).
- **Risk if omitted:** Parents do not become advocates; trial-to-paid
  collapses for minor athletes.
- **Expected launch impact:** High on parent surfaces; medium on athlete
  retention.
- **Readiness:** Doctrine 7/10 (RR-5/6/8 sealed, parent-voice script
  not architected) · Implementation 0/10.

### C5 — First Setback Guidance

- **Objective:** Hammer lawfully acknowledges the first missed day /
  readiness drop / pain report / life-context disclosure and hands off
  into the RR-5/6/8 destination.
- **Athlete problem solved:** Removes "the system broke / abandoned me"
  inference on the first setback.
- **Parent problem solved:** Establishes that the platform has a voice
  when things go wrong, not just when they go right.
- **Dependencies:** C1, C2, C6, C7.
- **Risk if omitted:** Highest churn moment in the lifecycle remains
  unvoiced; long-tail retention collapses.
- **Expected launch impact:** High on retention; medium on conversion.
- **Readiness:** Doctrine 9/10 (RR-5/6/8 sealed) · Implementation 1/10.

### C6 — Navigation Handoffs

- **Objective:** Every Hammer-initiated navigation carries the lawful
  "why I'm sending you here" line per the Phase-4 handoff table.
- **Athlete problem solved:** Removes navigation-as-mystery; athlete
  understands intent.
- **Parent problem solved:** Makes platform mechanics intelligible.
- **Dependencies:** C1.
- **Risk if omitted:** Hammer routes blindly; trust degrades.
- **Expected launch impact:** Medium-High; multiplier on C2 and C5.
- **Readiness:** Doctrine 10/10 · Implementation 1/10.

### C7 — Silence Enforcement

- **Objective:** Runtime primitive that distinguishes lawful silence
  (safeguarding / RTP / minor-private / commercial) from accidental
  silence, and surfaces the distinction.
- **Athlete problem solved:** Removes "is Hammer broken?" inference
  when Hammer lawfully cannot speak.
- **Parent problem solved:** Makes silence trustworthy (lawful) rather
  than suspicious (absent).
- **Dependencies:** C1.
- **Risk if omitted:** Every silence zone reads as a bug; C2/C4/C5
  become unsafe to land.
- **Expected launch impact:** High; structural prerequisite.
- **Readiness:** Doctrine 9/10 · Implementation 1/10.

---

## §3 Unified Athlete Journey

Stage-by-stage athlete guidance map.

| Stage | Sees | Understands | Hammer Explains | Hammer Recommends | Current Confusion | Capability Resolves |
|---|---|---|---|---|---|---|
| Discovery | Marketing site / brand layer | Brand promise | Nothing (brand only) | Nothing | "Is Hammer the AI or the app?" | C1 |
| Signup | Account / role / sport pickers | Mechanical setup | Nothing | Nothing | "Why am I doing this?" | C3 |
| Onboarding | Profile / first event flow | What data to give | What Hammer is, why readiness matters, what's next | Complete onboarding then go to Today | "I gave info — now what?" | C3, C1 |
| First training day | Today + readiness chip | Score exists | Today greeting, context line, one Next-Action, exit reassurance | The single canonical next action | "What do I actually do?" | C2, C6 |
| First missed day | Lower readiness, no voice | Something dropped | Lawful acknowledgement; framing per RR-8 if life-context, RR-5 if pattern | A recovery-respecting next step | "Did I break it? Did it break?" | C5, C7 |
| First setback (injury / pain) | Readiness drop / RTP surface unfamiliar | Something is wrong | RR-6-bounded acknowledgement; hand off to Safety / RTP / Bounce Back Bay | The lawful destination, never a diagnosis | "Am I hurt? What do I do?" | C5, C6, C7 |
| First recovery event | Returning readiness | "I'm coming back" | Continuity framing per RR-6 / RR-5 | Re-entry pacing | "Am I cleared? Who decides?" | C5, C7 |
| First improvement milestone | Trend up | Progress | Replay-derived summary, RR-5-bounded (no destiny framing) | Reinforcement of training pattern | "Is this real or motivational?" | C2, C1 |

---

## §4 Unified Parent Journey

Stage-by-stage parent trust map.

| Stage | Sees | Understands | Hammer Explains | Trust Created | Trust Missing |
|---|---|---|---|---|---|
| Landing page | Brand / value prop | What the product claims | Nothing (brand only) | Brand-level only | Operational trust |
| Purchase decision | Pricing, tiers | Cost | Nothing | None | "What will my child actually see?" |
| Invite | Email / accept link | Mechanical step | Nothing | None | "Why am I being invited?" |
| Acceptance | Parent landing | Account exists | Parent-mode greeting, what Hammer is, what parents see vs. don't see | Foundational | Specifics of safeguarding |
| First dashboard visit | Parent-mode surfaces | Activity exists | What readiness means for their child without breaching minor-privacy | Daily-use trust | Recovery / safety nuance |
| Safety interaction | Safety surface trigger | Something safety-relevant | RR-6 / safeguarding-bounded framing; who decides, who is notified | Crisis-moment trust | Long-term posture |
| Recovery interaction | Reduced training / RTP | Athlete is recovering | RR-6-bounded explanation; human-authority precedence (no diagnosis / prescription) | Recovery trust | Return-to-play timing |
| Progress review | Trend surfaces | Athlete is developing | Replay-derived, RR-5-bounded summary; no destiny framing | Long-term trust | Comparative ranking (correctly absent) |

Every cell where "Hammer Explains" is non-trivial requires C4 and C1.
Safety / Recovery cells require C7. Acceptance + First dashboard require
C3 in parent mode.

---

## §5 Capability Dependency Graph

```text
                              C1 Name Disambiguation
                              (no dependencies)
                                     |
        +----------------------------+----------------------------+
        |                            |                            |
   C7 Silence              C6 Navigation                   C3 Onboarding
   Enforcement              Handoffs                        Presence
        |                            |                            |
        +----------+--------+--------+                            |
                   |        |                                     |
              C2 Today Presence  <-----------------------+        |
                   |                                     |        |
                   +---------------+---------------------+--------+
                                   |
                            C5 First Setback Guidance
                                   |
                            C4 Parent Voice
                            (also depends on C1, C7 directly)
```

- **Structural:** C1 is the structural root; renames bind every other
  capability's vocabulary.
- **Behavioral:** C7 must precede any voicing capability (C2/C4/C5) so
  silence is lawful, not accidental.
- **Navigation:** C6 must precede C2 because Today is a router as much
  as a voice; handoff lines belong to navigation, not to slots.
- **Trust:** C3 must precede C4 — parents cannot trust a voice the
  athlete has not been introduced to.
- **Parent:** C4 is gated by C1 + C7; without minor-supremacy-safe
  silence enforcement, parent voice cannot lawfully exist.

---

## §6 Failure Analysis

### 6.1 Top 10 athlete confusion failures

| # | Failure | Current State | Root Cause | Capability | Risk | Conversion | Retention | Trust |
|---|---|---|---|---|---|---|---|---|
| A1 | "What does my readiness mean?" | Silent chip | No Context slot | C2 | High | High | High | Med |
| A2 | "What should I do today?" | No canonical next action | No Next-Action slot | C2 | High | High | High | Med |
| A3 | "Is Hammer the score or the guide?" | Both, ambiguously | Name collision | C1 | High | Med | High | High |
| A4 | "Did I break the app?" on missed day | Silent drop | No setback voice | C5, C7 | High | Low | High | High |
| A5 | "Why am I being sent here?" | Unmediated nav | No handoff line | C6 | Med | Low | Med | Med |
| A6 | "Where do I start after onboarding?" | Cold drop into Today | No onboarding voice | C3 | High | High | Med | Med |
| A7 | "Is the system ignoring me?" in silence zones | Cannot distinguish | No silence primitive | C7 | High | Low | High | High |
| A8 | "Is this just hype?" on milestone | No replay-bounded framing | No exit / context slot | C2 | Med | Low | Med | High |
| A9 | "Am I hurt?" after pain report | Silent / form-only | No RR-6 voice | C5 | High | Low | High | High |
| A10 | "What is Hammer for?" | No canonical answer | Name + onboarding gap | C1, C3 | High | High | Med | High |

### 6.2 Top 10 parent trust failures

| # | Failure | Current State | Root Cause | Capability | Risk | Conversion | Retention | Trust |
|---|---|---|---|---|---|---|---|---|
| P1 | "What is this product doing for my child?" | No parent voice | No C4 surface | C4 | High | High | High | High |
| P2 | "What does Hammer mean?" | Brand only | Name collision | C1 | High | High | Med | High |
| P3 | "Why was I invited?" | Mechanical invite | No onboarding | C3 (parent) | Med | High | Low | Med |
| P4 | "What do I see vs. not see?" | Undefined boundary | No parent-mode framing | C4, C7 | High | Med | High | High |
| P5 | "What happens on a safety event?" | Unvoiced | No C4 safety line | C4, C7 | High | Low | High | High |
| P6 | "Is my child being diagnosed?" | Could be inferred | RR-6 not surfaced to parent | C4 | High | Low | High | High |
| P7 | "Who decides return to play?" | Unclear | No human-authority framing | C4, C5 | High | Low | High | High |
| P8 | "Is this manipulating my child?" | RR-5 invisible to parent | No parent framing of narrative bounds | C4 | High | Med | High | High |
| P9 | "Why does the score change?" | Silent fluctuation | No Context slot in parent view | C4, C2 | Med | Low | Med | Med |
| P10 | "Why is silence here trustworthy?" | Reads as absence | No silence primitive | C7, C4 | Med | Low | Med | High |

---

## §7 Launch Readiness Assessment (0–10)

| Dimension | Score | Justification |
|---|---|---|
| Athlete Simplicity | 2 | One canonical answer to "what is Hammer / what do I do" does not exist in product. |
| Parent Simplicity | 1 | No parent-mode voice; parents read athlete surfaces. |
| Navigation Independence | 3 | Tabs work; handoff intent is unvoiced. |
| Guidance Readiness | 2 | Doctrine is ready; rendered guidance is not. |
| Trust Formation | 2 | Brand trust exists; operational and safeguarding trust unformed. |
| Retention Support | 2 | First-setback voicing absent; highest-churn moment unprotected. |
| **Overall Launch Readiness** | **2** | Not Ready. Doctrine mature; presence absent. |

---

## §8 Implementation Readiness Assessment

**Are we architecturally ready to build?** Yes — for the Critical stack
as specified.

- **Unknowns:** Parent-mode surface composition (C4) is doctrinally
  bounded but not architecturally drafted at the same depth as Today
  (Phase 4). One additional architecture pass for C4 may be warranted
  before implementation, but is not blocking.
- **Resolved questions:** What Hammer is (Phase 3). What Today must say
  (Phase 4). What may not be said (RR-5/6/8). How navigation hands off
  (Phase 4). What silence means (Phase 1 §4 + Phase 4).
- **Remaining doctrine gaps:** Minor — parent-voice script bounds and
  silence-primitive surface representation. Neither is blocking.
- **Remaining activation gaps:** Onboarding presence (C3) and
  first-setback guidance (C5) have constitutional bounds but no
  surface-level architecture document. These can be drafted alongside
  implementation, not before.

**Expected answer confirmed:** Most doctrine is complete. Implementation
sequencing is now the dominant risk, not constitutional gaps.

---

## §9 Recommended Build Order

Capability sequencing only. No code, no schema, no surface specs.

### Immediate (pre-launch, in order)

1. **C1 Name Disambiguation** — pure prerequisite; every other
   capability inherits its vocabulary.
2. **C7 Silence Enforcement** — must precede any voicing capability so
   silence is lawful, not accidental.
3. **C6 Navigation Handoffs** — must precede C2 because Today's
   Next-Action slot routes.
4. **C2 Today Presence** — primary daily surface; highest impact per
   unit of work once C1/C6/C7 are in.
5. **C3 Onboarding Presence** — without it C2 lands cold. Could
   parallelize with C2 once C1 is done.

### Near-term (launch or first patch)

6. **C5 First Setback Guidance** — depends on C2 + C6 + C7. Protects
   the highest-churn moment in the athlete lifecycle.
7. **C4 Parent Voice** — depends on C1 + C7; benefits from C3's
   onboarding pattern. Critical for minor-athlete trial-to-paid.

### Post-launch (Phase 6+ scope)

- Deepening C4 into safety / recovery / progress sub-surfaces.
- RR-7 / RR-9 / RR-10 activation per the post-mastery roadmap (not in
  scope here).
- Additional Hammer surfaces on Coach / Recruiter (out of Critical).

**Shortest path to launch readiness:** C1 → C7 → C6 → C2 → C3 → C5 → C4.

---

## §10 Final Verdict

- **Could Hammer become a major adoption driver if the Critical stack
  is implemented?** Yes. The substrate is mature; the missing piece is
  presence. Adding a lawful, named, single-voiced guide on Today,
  Onboarding, and Parent surfaces converts existing organism
  intelligence into adoption pressure.
- **Could parents understand the platform without prior knowledge?**
  Yes, once C4 + C1 + C7 land. Not before.
- **Could athletes navigate independently?** Yes, once C2 + C6 + C7
  land. Not before.

**Single readiness verdict:** **Not Ready today. Architecturally ready
to build. Implementation of C1 → C7 → C6 → C2 → C3 → C5 → C4 is the
shortest constitutional path to launch readiness.**

---

## §11 Stop Gate Confirmation

- No production code.
- No UI implementation.
- No prompts.
- No schema changes.
- No projections.
- No emitters.
- No RR-7 activation.
- No RR-9 activation.
- No RR-10 activation.

Architecture document only. Single consolidated source of truth for
Critical-tier launch implementation planning.
