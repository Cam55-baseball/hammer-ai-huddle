# Megaphase 151–160 — Relational Organism Architecture

Constitutional planning only. No code is written in this plan. Every primitive below is designed as a future canonical ASB event family — replay-visible, lineage-complete, additive-only, survivability-subordinate — under strict subordination to Eternal Laws and all immutable invariant families across Phases 1–150 (PR/EI/IR/EK/SG/FC/EE/RO/AR/DG/RE/AE/SF/ES/CV/ER/SL/FI-C/RW and prior).

The presentation-stabilization surfaces (Relational Hammer, Parent Trust, Developmental Stage, Recruiting, Injury Lifecycle, Conversation Memory, etc.) are NOT standalone mocks. Each is the **UI projection of one or more primitives defined below**, with demo data scoped via `visibility_scope: "demo"` and written through the existing `emitAsbEvent` / `asb_events` ledger so the migration path from demo → production is zero-refactor.

---

## Constitutional posture (applies to all 10 primitives)

- **Substrate**: all primitives emit through `asb_events` + `asb_event_lineage` via canonical `emitAsbEvent` / `buildAsbRow`. No parallel tables for relational state.
- **Topic namespace**: `relational.<primitive>.<verb>` (e.g. `relational.conversation.turn`, `relational.injury.onset`). Reserved now, populated incrementally.
- **Authority hierarchy** (unchanged): Eternal Laws → Invariants → Kernel → Orchestration → Adapters → Interfaces. Relational primitives are **interpretive overlays** — they never author `organism_truth`, `athlete_intent`, `authority_override`, `hard_stop`, or `rehabilitation_state` except through the channels already constitutionalized in Phases 31, 52, 54, 111–150.
- **Replay**: every primitive is reconstructable at pinned `engine_version + reasoning_version` from canonical ledger inputs. No derived-view substitution. Snapshots via `asb_state_snapshots` keyed on `as_of_event_id`.
- **Lineage**: every relational emission declares `causality_refs` and `lineage_refs`; cross-primitive influence (e.g. injury → conversation tone) is expressed as `asb_event_lineage` edges with explicit `derivation_type`.
- **Confidence / missingness**: every primitive carries `confidence` ∈ [0,1] and `missingness` envelope; collapse-to-certainty forbidden.
- **Survivability**: each primitive declares a `survivability_bearing` channel and can never override survivability arbitration (Phase 52 EE / Phase 111 RW).
- **Additive-only**: schema evolves by adding payload fields and topic verbs, never mutating prior events.
- **Demo scoping**: payloads carry `visibility_scope: "demo" | "self" | "coach" | "parent" | "org" | "external"`. Projections (`src/lib/runtime/projections`) already filter `"self"` from non-self scopes; we extend with `"demo"` filtering rules so demo events are replay-legal but invisible to production scopes.

---

## The ten primitives

For each: **authority · replay · lineage · arbitration · modulation · visibility · propagation · trust · escalation · confidence · human-vs-system authority · additive-only guarantee.**

### 1. `conversation_event`
Coach Hammer (and future relational agents) turn-by-turn dialogue.

- **Authority**: athlete + AI co-authored; AI never authors organism truth; system messages clearly attributed via `actor_role`.
- **Replay**: full turn ledger; reasoning_version-pinned; prompt + model + tokens hashed into payload for replay-certified reconstruction.
- **Lineage**: each turn links to (prior turn, triggering check-in / injury / readiness event).
- **Arbitration**: contradictory user/AI claims route to Phase 31; conversation never overrides hard_stop / rehabilitation_state.
- **Modulation**: tone, cadence, restraint already modulated via `src/lib/comm/cadence.ts` + `restraint.ts` — extended to be conversation-aware.
- **Visibility**: `self` default; coach/parent see only `shared` turns the athlete elects.
- **Propagation**: feeds `psychological_state`, `narrative_event`, and Coach Hammer next-step snapshot.
- **Trust**: trust_delta declared per turn (small bounded values); accrual modeled in primitive 11-shadow (relationship).
- **Escalation**: self-harm / acute distress signals trigger Phase 53 orchestration containment + survivability lockdown route.
- **Confidence**: AI confidence per turn; user confidence inferred from explicit signals only (no inference of certainty from absence).
- **Human vs system**: human turns authoritative for `athlete_intent`; AI turns interpretive only.
- **Additive-only**: future modalities (voice, video) extend payload; never mutate prior turn schema.

### 2. `relationship`
Edges between athlete ↔ coach / parent / mentor / scout / teammate / AI persona.

- **Authority**: relationship existence asserted by either party; **mutual confirmation** required for elevated permissions (coach_edit, parent_visibility).
- **Replay**: relationship is a fold over `relational.relationship.*` events (created / confirmed / scoped / revoked / paused).
- **Lineage**: every permission grant references the confirmation event.
- **Arbitration**: conflicting permission claims route to Phase 31; revocation always wins over grant; minor athletes — parent relationship has constitutional precedence per RW-1 (organism truth supersedes commercial/coach incentives).
- **Modulation**: gates visibility on conversation_event, narrative_event, exposure_event.
- **Visibility**: relationship metadata visible to both endpoints only; org sees aggregate count, not identity.
- **Propagation**: drives Parent Trust surface, Coach Console linkage, Recruiting opt-in.
- **Trust**: per-edge `trust_score` derived from interaction lineage; never directly writable.
- **Escalation**: relationship abuse signals (over-messaging, coercion patterns) escalate to org / safeguarding route.
- **Confidence**: presence binary; quality scored from interaction density + reciprocity.
- **Human vs system**: humans author; system only derives quality scores.
- **Additive-only**: new relationship types (mentor, agent, NIL_rep) extend an enum; no mutation of existing edges.

### 3. `psychological_state`
Bounded, lineage-visible affective + motivational + confidence state.

- **Authority**: athlete self-report authoritative for subjective fields; system-derived signals (check-in note sentiment, conversation cadence) are **interpretive only** with confidence ceilings.
- **Replay**: state is a projection (`src/lib/runtime/projections`) over `relational.psych.*` events; no hidden storage.
- **Lineage**: every state transition links to triggering signals (check-in, conversation_turn, injury, exposure).
- **Arbitration**: self-report > AI-inferred > sensor-derived. Contradictions surfaced, never silently averaged.
- **Modulation**: feeds Coach Hammer tone, restraint cadence, foundation video selection, training intensity ceilings.
- **Visibility**: `self` by default; coach sees bounded summary only if athlete elects; parent sees safeguarding signals only.
- **Propagation**: into Hammer State 5-axis (as a 6th channel candidate, post-constitutional review only).
- **Trust**: low-trust psych signals cannot tighten training ceilings without survivability justification.
- **Escalation**: acute distress / burnout / identity collapse signals route to safeguarding orchestration (new Phase 53 sub-route).
- **Confidence**: explicit always; AI inference ≤ 0.7 ceiling; sensor inference ≤ 0.5 ceiling.
- **Human vs system**: human supremacy on subjective state, no exceptions.
- **Additive-only**: new affect dimensions extend payload, never replace.

### 4. `developmental_stage`
Constitutionalized child→youth→teen→young-adult→adult ladder with puberty/growth-spurt sub-states.

- **Authority**: derived from age + biometric + parent/coach attestation; multi-source with explicit precedence.
- **Replay**: stage = fold of `relational.developmental.*` (age_observed, growth_attestation, puberty_marker, deload_window).
- **Lineage**: each stage transition links to evidence events; growth_spurt windows link to deload prescriptions.
- **Arbitration**: medical attestation > parent attestation > coach attestation > age-inferred; conflicts → Phase 31.
- **Modulation**: hard ceilings on training load, contact intensity, NIL exposure, recruiting communication eligibility. Foundation video audience filters already keyed here.
- **Visibility**: `self + parent + medical` always; coach sees the stage label and bounded ceilings only.
- **Propagation**: gates recruiting, NIL/commercial, sensor calibration windows, injury RTP curves.
- **Trust**: developmental_stage cannot be downgraded by commercial/showcase pressure (RW-1).
- **Escalation**: missed growth-spurt deload triggers survivability containment.
- **Confidence**: age = high; puberty markers = medium with missingness preserved.
- **Human vs system**: medical/parent authoritative for sensitive transitions; system never silently advances stage.
- **Additive-only**: late-bloomer / atypical-trajectory subtypes extend the enum.

### 5. `narrative_event`
Athlete self-narrative milestones (identity, breakthrough, setback, decision, value-statement).

- **Authority**: athlete-authored; AI may suggest, never assert.
- **Replay**: append-only narrative ledger; edits emit `narrative_revision` events linked to original.
- **Lineage**: narrative events link to triggering performance/check-in/conversation/injury events.
- **Arbitration**: athlete narrative is supreme over coach/AI interpretation; coach narrative becomes a separate edge, not an overwrite.
- **Modulation**: feeds Coach Hammer persona memory, career_arc projection.
- **Visibility**: `self` default; explicit per-event share.
- **Propagation**: trust accrual signal; identity continuity check.
- **Trust**: narrative consistency increases AI's bounded interpretive license (still capped).
- **Escalation**: identity-crisis / value-conflict patterns route to psychological_state escalation chain.
- **Confidence**: 1.0 for self-authored; <1.0 for AI-inferred narrative summaries which are clearly labeled.
- **Human vs system**: human supremacy absolute.
- **Additive-only**: new narrative types append.

### 6. `injury_event`
Full lifecycle: onset → assessment → diagnosis → RTP plan → milestones → clearance → recurrence-watch.

- **Authority**: medical > athlete-reported > coach-observed > sensor-inferred. Medical role required for clearance.
- **Replay**: injury arc is a fold; every state transition (onset/diagnosis/milestone/setback/clearance) is a separate event.
- **Lineage**: links to mechanism event (game/practice/sensor), all RTP prescriptions, every related psych state, every load decision.
- **Arbitration**: medical clearance required to lift `hard_stop` / `rehabilitation_state`. Coach cannot override.
- **Modulation**: hard ceilings on training; required deloads; communication tone shifts; recruiting/exposure pauses.
- **Visibility**: `self + parent + medical` always; coach sees status + ceilings; recruiters see only "unavailable" without diagnosis.
- **Propagation**: into psychological_state, career_arc projection, developmental_stage (if growth-related), exposure_event eligibility.
- **Trust**: hidden/under-reported injury patterns degrade athlete-side data trust score, never punitively but visibly.
- **Escalation**: red-flag mechanisms (head, joint, recurrence) trigger immediate safeguarding + medical-required gating.
- **Confidence**: medical = high; self-report = medium; sensor-inferred = bounded.
- **Human vs system**: medical supremacy absolute; system never authors clearance.
- **Additive-only**: new injury taxonomies append.

### 7. `career_arc`
Long-horizon projection: development → competitive → exposure → opportunity → transition → post-career.

- **Authority**: **projection only**, never authority. Constitutionally barred from authoring organism truth or recruiting decisions.
- **Replay**: fully reconstructable from constituent events; pinned to engine_version + reasoning_version.
- **Lineage**: projection edges declare every input event class consumed.
- **Arbitration**: career_arc is interpretive; conflicting projections coexist with confidence bounds; athlete-stated goals supreme.
- **Modulation**: informs Coach Hammer long-horizon framing; never modifies daily prescriptions directly.
- **Visibility**: `self` default; coach/recruiter see athlete-elected slices only.
- **Propagation**: feeds exposure_event prioritization, recruiter_contact_event eligibility windows.
- **Trust**: projection confidence visibly bounded; recruiting bias / hype detection mandatory.
- **Escalation**: projection collapse (injury, life event) emits canonical `career_arc.divergence` events, never silent recompute.
- **Confidence**: degrades monotonically with horizon distance; missingness preserved.
- **Human vs system**: human goals authoritative; system projections subordinate.
- **Additive-only**: new arc archetypes (late-bloomer, two-sport, NIL-first) extend taxonomy.

### 8. `life_context_event`
Off-platform life signals that legally bound performance interpretation: school stress, family events, travel, sleep environment, life transitions, finances, mental health support changes.

- **Authority**: athlete-reported with optional parent corroboration; system never infers from gaps.
- **Replay**: append-only; redaction emits a `redaction` event preserving the lineage hole visibly.
- **Lineage**: contextualizes performance/check-in events that follow within bounded windows.
- **Arbitration**: athlete + parent for minors; athlete alone for adults; medical for clinical context.
- **Modulation**: extends training-load arbitration with context-aware ceilings; suppresses guilt-inducing nudges.
- **Visibility**: highest privacy class; `self` default; coach sees only the **fact of context** unless athlete shares specifics.
- **Propagation**: into psychological_state (bounded), career_arc, Coach Hammer restraint.
- **Trust**: context disclosure strengthens trust score; never weaponized.
- **Escalation**: safeguarding categories (abuse, crisis, financial coercion) route to safeguarding orchestration immediately.
- **Confidence**: self-report 1.0; system inference forbidden.
- **Human vs system**: human-only authorship.
- **Additive-only**: new context categories append.

### 9. `exposure_event`
Athlete-side visibility moments: showcase, travel-team game, highlight publication, profile view, scout impression, broadcast appearance.

- **Authority**: event existence asserted by athlete/coach/parent; external impressions ingested via Phase 130-style federation adapters with provenance.
- **Replay**: every exposure is a canonical event with source provenance; aggregate "visibility score" is a projection.
- **Lineage**: links to triggering game/highlight/post; downstream links to any recruiter_contact_event spawned.
- **Arbitration**: federation/external sources never author organism truth; conflicting impression counts surfaced.
- **Modulation**: throttles re-exposure cadence; deload-aware; developmental_stage gates eligibility.
- **Visibility**: `self + parent + coach`; aggregate (no identity) to org.
- **Propagation**: feeds career_arc, recruiter_contact_event eligibility.
- **Trust**: exposure inflation / hype patterns flagged, not silently smoothed.
- **Escalation**: under-age exposure to inappropriate channels triggers safeguarding.
- **Confidence**: athlete-reported = high; external = adapter-dependent with declared confidence.
- **Human vs system**: human-attributed primary; system only aggregates.
- **Additive-only**: new exposure types append.

### 10. `recruiter_contact_event`
Inbound and outbound recruiting/scouting/NIL contact lifecycle.

- **Authority**: recruiter identity verified via Phase 130 federation adapters (or manual attestation in demo); athlete consent required for elevated interactions; **parent consent required for minors** (developmental_stage gate).
- **Replay**: every contact is a canonical event (inquiry → response → meeting → offer → decision → withdraw).
- **Lineage**: links to exposure_event(s) that produced the contact; links to career_arc projections; links to commercial_event when NIL/financial.
- **Arbitration**: parent + athlete (minor) or athlete (adult) > coach > recruiter. Recruiter pressure cannot author athlete intent.
- **Modulation**: contact cadence ceilings (anti-spam, anti-coercion); communication windows aligned with developmental_stage.
- **Visibility**: `self + parent + chosen-coach`; recruiter sees only what athlete elects to share back.
- **Propagation**: into career_arc, commercial_event (if NIL), narrative_event (if decision).
- **Trust**: recruiter trust score derived from compliance with developmental gates and cadence ceilings.
- **Escalation**: gate violations / coercion patterns trigger safeguarding + federation-level audit event.
- **Confidence**: verified = high; unverified = bounded, clearly labeled.
- **Human vs system**: human supremacy absolute on decisions; system only enforces gates and emits audit lineage.
- **Additive-only**: new contact types (NIL_rep, agent, brand) extend taxonomy.

---

## Cross-primitive doctrine

- **Safeguarding orchestration sub-route**: a new fixed non-skippable chain `signal → classify → contain → notify_safeguarding_role → survivability_lockdown → arbitrate (Phase 31)` is reserved for psych / injury / life_context / exposure / recruiter primitives. Defined now, implemented later.
- **Minor-athlete supremacy**: when `developmental_stage` indicates minor, parent relationship has constitutional precedence over coach/recruiter/commercial actors across all 10 primitives.
- **Demo scoping**: `visibility_scope: "demo"` is reserved as a first-class scope. Projections, observability surfaces, and replay all treat demo events as legal but isolated. No demo event may ever propagate into production projections; no production projection may read demo events. This is a constitutional firewall, not a UI filter.
- **Trust accrual**: a single `trust_score` projection across relationships is derived from conversation_event reciprocity + narrative_event consistency + life_context_event disclosure + injury_event honesty. Never directly writable. Bounded ∈ [0,1] with missingness-aware decay.

---

## Phase plan (151–160)

- **151** Relational ASB topic namespace reservation + `visibility_scope: "demo"` constitutional firewall.
- **152** `conversation_event` + `relationship` primitives constitutionalized + minimal emission scaffold.
- **153** `psychological_state` projection + Coach Hammer relational memory wiring (still bounded).
- **154** `developmental_stage` primitive + ceilings binding to existing training/foundation systems.
- **155** `injury_event` full lifecycle + medical role + RTP linkage.
- **156** `narrative_event` + athlete self-authoring surface.
- **157** `life_context_event` + safeguarding sub-route.
- **158** `exposure_event` + federation provenance contract.
- **159** `recruiter_contact_event` + minor-athlete consent gates.
- **160** `career_arc` projection layer + integration closure + RR-1…RR-10 immutable invariants (Relational organism family).

---

## Binding the approved presentation surfaces

To prevent disconnected demo debt, the previously approved presentation-stabilization surfaces are re-anchored as **UI projections of these primitives**, seeded with `visibility_scope: "demo"`:

| Presentation surface | Primary primitive(s) | Demo seeding path |
|---|---|---|
| Relational Coach Hammer | conversation_event, relationship, narrative_event | demo conversation_event rows |
| Parent Trust card | relationship, trust projection, life_context_event | demo relationship + bounded trust projection |
| Developmental-stage ladder | developmental_stage | demo developmental_stage transitions |
| Injury Lifecycle timeline | injury_event | demo injury arc (onset → RTP → clearance) |
| Athlete-side Recruiting | exposure_event, recruiter_contact_event | demo exposure + contact sequence |
| Career-arc projection | career_arc | demo projection derived from seeded events |
| Conversation Memory | conversation_event projection | same source as Hammer |
| Late-bloomer pathway | developmental_stage + career_arc | demo atypical-trajectory seed |
| Psychological care surface | psychological_state | demo psych state transitions linked to demo check-ins |
| Life-context surface | life_context_event | demo school/travel context events |

Every demo emission goes through canonical `emitAsbEvent` / `buildAsbRow`. Zero parallel storage. Production cutover = flip `visibility_scope` from `"demo"` to live scopes — no schema change, no UI refactor.

---

## Technical anchor points

- Ledger: `asb_events`, `asb_event_lineage`, `asb_state_snapshots`, `asb_engine_versions` (existing).
- Emit surface: `src/lib/asb/emit.ts`, `supabase/functions/_shared/asbEmit.ts` (existing — no change required for primitive reservation phase).
- Projections: `src/lib/runtime/projections/*` (extend with relational projections in Phases 152+).
- Visibility filter: `prepareRows` in `src/lib/runtime/projections/types.ts` — extend to enforce `"demo"` firewall constitutionally.
- Engine version: `ENGINE_VERSION = "asb-1.0.0"` — relational primitives ride existing pinning; bump only at Phase 160 closure.

---

## Out of scope (explicit)

- No code changes in this plan.
- No shallow AI persona wrappers.
- No disconnected emotional/UI mocks.
- No bypass of `asb_events` / lineage / replay.
- No new tables outside the ASB ledger family.

On approval, Phase 151 (namespace reservation + demo firewall) is the first additive constitutional commit, followed by the presentation-stabilization surfaces wired as primitive projections.
