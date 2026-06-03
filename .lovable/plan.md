# Hammer Activation Phase 1 — Cross-Surface Guidance Architecture (Plan)

## Deliverable
Single new file: `docs/asb/hammer-activation-architecture.md`. No code, no schema, no projections, no emitters, no RR-7/9/10 activation. Builds directly on the Phase 1 audit (`docs/asb/hammer-guidance-orchestration-audit.md`) and the sealed RR-5 / RR-6 / RR-8 constitutions.

## Document Structure

### §0 Scope & Subordination
- Architecture-only; no production changes.
- Subordinate to Eternal Laws, RR-5/6/8 sealed doctrine, RR-7/9/10 sealed-but-deferred, Presentation Mode Lock release, and the relational namespace firewall (demo↔production).
- Defines capabilities, not implementations.

### §1 Hammer Role Definition (resolves naming collision)
- **Hammer State** → rename in doctrine to *Organism State* (biomarker chip on `/today`). Stays a replay-derived readiness signal, never speaks.
- **Conversational Hammer** → rename in doctrine to *Hammer* (the singular user-facing voice). Owns memory continuity across RR-5/6/8.
- **Hammer Guide** → not a separate entity; defined as the *navigation + explanation modality* of the same Hammer voice. One voice, three modalities: Recall, Explain, Guide.
- Marketing "Hammer Motion Capture" label scoped to brand layer only; not a runtime referent.
- Unification verdict: **one Hammer, three modalities; one biomarker (Organism State) it can cite but does not author.**

### §2 Hammer Surface Map
Table per surface — columns: *knows / explains / recommends / never does / modality (Recall|Explain|Guide|Silent)*.

Surfaces covered: Today, Dashboard, Onboarding, Relational, Safety Center, Parent Invite, Relationship Settings, Practice, Training Block, RTP, Bounce Back Bay, Athlete Journey Map, Parent Trust Card, Parent Digest.

For each, what Hammer must never do is enumerated against RR-5/6/8 + safeguarding precedence.

### §3 Guidance Architecture (athlete)
For every surface in §2, four guidance slots defined at the capability level:
- **Entry guidance** — why am I here
- **Context explanation** — what this surface shows, in plain language, cited
- **Next-action guidance** — one concrete suggestion, navigation-aware
- **Exit guidance** — where to go next + what Hammer will remember

Architecture only — no prompt text, no UI components.

### §4 Parent Guidance Architecture
Five parent journeys defined as capability slots:
- Onboarding (invite landing → first visibility)
- Trust (what Hammer can/can't see; RR-8 disclosure controls)
- Safety (RR-6 safeguarding precedence; parent supremacy for minors)
- Progress (replay-cited summaries, never destiny framing per RR-7)
- Recovery (RTP authorization restriction; pain self-report supremacy)

Explicit *silence zones*: arbitration events, contradictions-in-progress, minor's private narrative threads the athlete has not shared, recruiter contact surfaces (RR-10 deferred anyway).

### §5 Hammer Authority Boundaries (hard limits)
Permit list: explain, summarize, guide, recall cited events, hand off to human roles.
Prohibit list: diagnose, predict, promise outcomes, override safeguarding (RR-6), override parents (RR-8/minor supremacy), authorize RTP (RR-6), create narrative identity (RR-5), invent feelings, fabricate citations, speak in silence zones, cross demo↔production firewall.
Each prohibition mapped to the sealed invariant that enforces it.

### §6 Day-One Athlete Simulation
Walk a single new athlete: Day 0 → onboarding → first workout → first setback → first recovery event → first milestone.
At each step: what Hammer says (modality), what it cites, what it withholds, what handoff it offers, what gap remains.
Output: ordered gap list feeding §7.

### §7 Activation Roadmap (capability-level)
Three tiers:
- **Critical** — name disambiguation, Hammer presence on `/today` + onboarding, parent-facing Hammer voice on invite + trust card, first-setback explainer, RTP/safeguarding silence enforcement, navigation handoff capability.
- **Important** — in-context tooltips, weekly recap voice, injury check-in companion, parent digest narrator, journey-map narration.
- **Future** — cross-device continuity, multi-language, voice/audio modality, coach-facing translation layer (defers to RR-10 sealed work).

No file paths, no component names, no schema — capabilities only.

### §8 Final Verdict
Answer the gate question with: readiness score (0–10), biggest remaining adoption risk, biggest remaining parent risk, biggest remaining athlete risk, and a one-line verdict (Ready / Partially Ready / Not Ready *if implemented as specified*).

Expected verdict: **Partially Ready if Critical tier implemented; Ready only after Important tier.**

### §9 Stop Gate Confirmation
Restates: no production code, no RR-7/9/10 activation, no schema/projection/emitter/replay-engine changes, single output file.

## Files
- Create: `docs/asb/hammer-activation-architecture.md`
- Edit: `.lovable/plan.md` (append architecture-phase entry)

## Out of scope
Any code, prompts, UI mockups, schema, projections, emitters, or activation of RR-7/9/10.
