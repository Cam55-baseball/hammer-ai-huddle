
# Hammer Wave 2 — Execution Package (Plan)

Governance-only deliverable. No production code, no schema, no projections, no emitters, no RR-7/9/10. Wave 2 scope is **C6 (Navigation Handoff Capability)** and **C2 (Today Presence)** only, subordinate to the Hammer Execution Constitution, Phase 7 Master Plan, and ratified Wave 1.

## Files to create / edit

1. **Create** `docs/asb/hammer-wave-2-execution-package.md` — full §0–§12 package below.
2. **Append** `.lovable/plan.md` — sealed Wave 2 package entry with scope, file inventory, exit gate, stop gate.

No other files are touched in this phase. Implementation files listed in §3 are *inventoried*, not modified, until Wave 2 build authorization.

---

## Document outline (`docs/asb/hammer-wave-2-execution-package.md`)

### §0 Scope Verification
- In-scope: C2 Today Presence, C6 Navigation Handoff.
- Excluded: C3, C4, C5, RR-7, RR-9, RR-10, all new schemas/migrations/projections/emitters, all parent/coach/recruiter/onboarding surface additions, all writes to `organism_truth` / `athlete_intent` / `authority_override` / `hard_stop` / `rehabilitation_state`.
- Deferred capabilities explicitly enumerated (Wave 3: C3 Why-Sheet upgrade + C4 Authority Surfacing; Wave 4: C5 Constitutional Telemetry; Post-Mastery: RR-7/9/10).

### §1 Capability Review
**C2 — Today Presence**
- Objective: First-time athlete on `/today` immediately grasps what / why / what-next / where-next without prior platform knowledge.
- Dependencies: Wave 1 `getHammerIdentity()` resolver, `classifySilenceZone()`, existing `useHammerState`, `useNextAction`, `useAthleteCommandRows`, `buildDailyPrescription`.
- Wave 1 prerequisites: Organism State label resolver in place; silence classifier in place.
- Success: Four guidance slots (Entry / Context / Next-Action / Exit) render lawful, replay-deterministic, missingness-honest content sourced exclusively from existing ledger projections.
- Failure: Any slot fabricates state, diagnoses, predicts, authors truth, overrides safeguarding, or emits content when silence classifier returns `lawful`.

**C6 — Navigation Handoff**
- Objective: Hammer may *route* an athlete to a lawful destination with a short, replay-traceable handoff explanation. Routing never authorizes, never diagnoses, never overrides safeguarding/parent authority.
- Dependencies: existing `useNextAction`, React Router, route registry, Wave 1 identity resolver, silence classifier.
- Wave 1 prerequisites: identity + silence substrate.
- Success: Every handoff cites (a) source signal lineage handle, (b) destination route, (c) Organism State at time of handoff, (d) lawful-silence fallback when explanation is constitutionally unavailable.
- Failure: Handoff emitted under safeguarding-active, athlete-revoked-narrative, or missing-data-dominant zones; handoff to a destination outside the lawful set; handoff that asserts authority beyond explain/summarize/guide/route.

### §2 Surface Inventory
Touchpoints on `/today`:
- `src/pages/Today.tsx` (PulseStrip, CommunicationAI, CommandCenterSection, PrescriptionCard, link tiles, RecentList).
- `src/components/today/TodayCommandBar.tsx` (HammerStateBadge, ReadinessChip, Next-up CTA, QuickLog).
- `src/components/onboarding/RuntimeOrientation.tsx` (already lawful-silent first-run copy).
- `src/components/runtime/PulseStrip.tsx`, `PrescriptionCard.tsx`, `RuntimeCard.tsx` (presentation only).

Navigation destinations (lawful Wave 2 set, derived from `useNextAction` + existing routes):
- `/relational` — Relational surface (read-only handoff allowed; demo↔prod firewall preserved).
- `/practice` — Practice Hub.
- `/training-block` or equivalent training surface.
- `/safety-center` — Safety (handoff allowed; never gated by Hammer; always reachable).
- `/rtp` — Return-to-Play (handoff allowed only with explicit lawful trigger; never authorizes RTP per RR-6).
- `/bounce-back-bay` — Recovery.
- `/accept-parent-invite` and parent-invite entry (handoff allowed for athletes; parent supremacy preserved; no Hammer authorship of parent state).

For each: current state (already routable via React Router), expected Wave 2 behavior (Hammer may surface a routing affordance + short explanation), constitutional constraints (no diagnosis at handoff for RTP / Safety / Bounce Back; no authorization for parent invite acceptance; Relational handoffs honor demo↔prod firewall).

### §3 File Impact Inventory
Expected to be touched in Wave 2 build (not now):
- `src/pages/Today.tsx` — wire four guidance slots; no business logic changes.
- `src/components/today/TodayCommandBar.tsx` — surface Entry + Next-Action guidance via existing hooks.
- New `src/lib/runtime/guidance/slots.ts` — pure resolver producing `{ entry, context, nextAction, exit }` from existing inputs; uses `classifySilenceZone` and `getHammerIdentity`.
- New `src/lib/runtime/guidance/types.ts` — slot types + `GuidanceVerdict`.
- New `src/lib/runtime/handoff/destinations.ts` — pure lawful-destination registry + `resolveHandoff(state, signal)` returning `{ route, reasonKey, lineageHandle } | { silence: 'lawful' }`.
- New `src/lib/runtime/handoff/types.ts`.
- New unit tests for both modules (purity, exhaustive switch over destinations, safeguarding-precedence short-circuit, replay determinism across shuffled inputs).
- Possibly a small `src/components/today/TodayGuidanceSlots.tsx` presentation component.

Intentionally untouched: `src/branding.ts`, `src/hooks/useHammerState.ts`, `src/hooks/useEngineHealth.ts`, `src/hooks/useNextAction.ts` (read-only consumer; if change required, deferred to Wave 3), `src/lib/runtime/projections/types.ts`, `supabase/functions/_shared/demoFirewall.ts`, `src/contexts/DemoModeContext.tsx`, all `src/lib/runtime/relational/**`, all `supabase/migrations/**`, `supabase/config.toml`, all parent/coach/recruiter/onboarding surfaces beyond Today, all RR-7/9/10 code paths.

### §4 Four Guidance Slots Implementation Plan
For each slot — Inputs, Outputs, Authority limits, Silence conditions, Verification:

- **Entry Guidance** — Inputs: Organism State, first-event presence, identity resolver. Output: lawful presence marker. Authority: explain only. Silence: safeguarding-active, athlete-revoked-narrative, missing-data-dominant → lawful silence. Verify: unit test every zone.
- **Context Guidance** — Inputs: latest `prescription.daily.rendered`, Organism State, recent runtime topic counts. Output: structured "what is happening" summary. Authority: summarize only. Silence: unpopulated-surface-no-signal → lawful; unpopulated-surface-with-signal → accidental (build-blocker).
- **Next-Action Guidance** — Inputs: `useNextAction` output, Organism State. Output: `{ label, route, ctaLabel, moduleHint }` mirrored from existing hook. Authority: guide + route. Silence: post-action-cooldown, awaiting-input → lawful.
- **Exit Guidance** — Inputs: handoff destination resolved by C6. Output: short routing affordance. Authority: route only. Silence: route-not-yet-rendered → lawful.

No prompts, no copywriting — slot behavior is wiring + classification only. All copy comes from existing locale layer or is deferred to a separate non-Wave-2 copy pass.

### §5 Navigation Handoff Implementation Plan
For each lawful destination (Relational, Practice, Training, Safety, RTP, Bounce Back Bay, Parent Invite):
- **When**: only when source signal is replay-derivable and silence classifier returns non-`lawful` for the routing zone.
- **Why**: short reasonKey bound to lineage handle of the source event(s).
- **Required**: route id, reasonKey, lineage handle.
- **Prohibited**: diagnostic language (RTP/Bounce Back), authorization language (Parent Invite, RTP), narrative claims (Relational), prediction language (all).
- **Silence**: safeguarding-active forces lawful silence on RTP / Safety / Bounce Back handoffs (Safety remains directly reachable by the athlete via standing navigation, not via Hammer-authored handoff).
- **Verification**: per-destination unit test asserting allowed routes, forbidden phrasing absent, lineage handle present, safeguarding-active produces lawful silence.

### §6 Constitutional Verification Plan
For each invariant — Potential violation vector + Required verification:
- **RR-5 (Narrative)**: vector = guidance slot fabricating narrative; verify = absence of narrative authorship in slot resolver, athlete-revoked-narrative → lawful silence test.
- **RR-6 (Injury/Recovery)**: vector = RTP/Bounce Back handoff implying diagnosis or readiness authorization; verify = forbidden-term audit + safeguarding-precedence test.
- **RR-8 (Life Context)**: vector = guidance surfacing undisclosed life context; verify = inputs restricted to ledger projections already disclosed to athlete.
- **Replay determinism**: vector = non-pure resolver; verify = no `Date.now`/`Math.random`/network in `slots.ts`/`destinations.ts`; byte-identical output across shuffled inputs.
- **Parent supremacy**: vector = handoff authorizing parent-invite acceptance; verify = handoff to `/accept-parent-invite` carries no authorization payload; parent state untouched.
- **Safeguarding precedence**: vector = any slot/handoff downgrading safeguarding-active; verify = classifier test reused; integration test on Today wiring.
- **Single Hammer authority**: vector = parallel identity literals reintroduced; verify = grep audit; all labels via `getHammerIdentity()`.
- **Organism State silence**: vector = guidance surface emitting events; verify = resolver emits zero events; only existing emitters remain.

### §7 Acceptance Criteria (measurable)
**C2:**
- 2.1 All four slots render on first-time `/today` load with zero console errors.
- 2.2 100% of slot outputs derive from `slots.ts` (no inline state).
- 2.3 Silence classifier covers 8/8 zones for every slot (unit-tested).
- 2.4 Zero `Date.now`/`Math.random`/network calls in slot resolver (grep).
- 2.5 Identity label "Organism State" surfaces via resolver in ≥1 slot; zero raw "Hammer State" strings in Today subtree (grep).

**C6:**
- 6.1 Lawful destination set is exactly the 7 routes in §2; unit test asserts exhaustiveness.
- 6.2 Every emitted handoff carries `{ route, reasonKey, lineageHandle }`.
- 6.3 Safeguarding-active → lawful silence for RTP/Bounce Back/Safety handoffs (test).
- 6.4 Zero forbidden phrasing tokens (diagnosis/authorization/prediction) in destination registry (grep).
- 6.5 Handoff resolver byte-identical across shuffled inputs (replay determinism test).

### §8 Test Plan
- **Unit**: `slots.test.ts` (zone matrix × 4 slots), `destinations.test.ts` (per-route lawfulness + forbidden-phrase audit), identity reuse tests.
- **Integration**: Today render test asserting all four slots mount, no parallel identity literal, no event emission.
- **Replay**: byte-identical resolver output across shuffled inputs and two invocations.
- **Navigation**: route-existence assertions for the 7 lawful destinations.
- **Safeguarding**: precedence test — every slot + handoff returns lawful silence when `safeguardingActive: true`.
- **Visibility**: demo↔prod firewall unaffected (Relational handoff respects `prepareRows`).
- **Regression**: Wave 1 vitest suite (10/10) remains green; no edits to Wave 1 files.
- **Authority**: assertion that resolver never references `organism_truth` / `athlete_intent` / `authority_override` / `hard_stop` / `rehabilitation_state`.

### §9 Failure Analysis
- *Slot fabricates state when signal missing* — detect: unit test for unpopulated-surface-with-signal → accidental verdict; correct: route to lawful silence; escalate: build-blocker.
- *Handoff to non-lawful destination* — detect: exhaustive-switch lint + unit test; correct: reject in resolver; escalate: typecheck failure.
- *Safeguarding downgrade* — detect: safeguarding-precedence test; correct: classifier short-circuit; escalate: constitutional violation, halt Wave 2.
- *Non-determinism* — detect: replay determinism test + purity grep; correct: remove side effect; escalate: build-blocker.
- *Parallel identity literal* — detect: grep audit in CI step; correct: route through resolver; escalate: ratification denied.

### §10 Ratification Requirements
- **Complete**: all §3 files created/edited per inventory; all §7 criteria met; all §8 tests authored.
- **Verified**: full vitest suite green (Wave 1 + Wave 2); preflight clean; grep audits clean; replay determinism proven.
- **Ratified**: Constitutional audit signed against §6 vectors; `.lovable/plan.md` sealed Wave 2 entry appended; exit gate (§11) satisfied.

### §11 Exit Gate (before Wave 3)
- Wave 2 Ratified status recorded in `.lovable/plan.md`.
- Zero open escalations from §9.
- No drift into C3/C4 surfaces.
- `getHammerIdentity()` remains the sole identity authority.
- `classifySilenceZone()` remains the sole silence authority.
- All four slots + all seven handoff destinations have green tests.

### §12 Stop Gate Confirmation
No Wave 3. No Wave 4. No RR-7. No RR-9. No RR-10. Wave 2 only.

---

## `.lovable/plan.md` append
Sealed "Hammer Wave 2 — EXECUTION PACKAGE (governance-only)" entry summarizing scope, file inventory pointer to the doc, exit gate, and stop gate confirmation. No build-complete claims (build happens in the next phase).
