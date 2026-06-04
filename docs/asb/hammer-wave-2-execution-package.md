# Hammer Wave 2 — Execution Package

Governance-only. No production code, no schema, no projections, no emitters, no RR-7/9/10.
Subordinate to: Eternal Laws · Megaphase 151–160 · RR-5 ratified · RR-6 ratified · RR-8 sealed ·
Hammer Activation Phases 1–8 · Hammer Execution Constitution · Hammer Wave 1 Ratified.

---

## §0 Scope Verification

**In-scope (Wave 2 only):**
- **C2** — Today Presence
- **C6** — Navigation Handoff Capability

**Explicit exclusion list:**
- C3 (Why-Sheet upgrade), C4 (Authority surfacing), C5 (Constitutional telemetry)
- RR-7 (career arc), RR-9 (exposure/visibility), RR-10 (recruiter/commercial)
- All new schemas, migrations, projections, emitters
- All writes to `organism_truth`, `athlete_intent`, `authority_override`, `hard_stop`, `rehabilitation_state`
- All parent / coach / recruiter / onboarding surface additions beyond `/today`
- New AI invocations, new external API calls, new personalities, new identities
- Any change to `src/branding.ts`, `prepareRows`, `demoFirewall.ts`, `DemoModeContext.tsx`, `relational/**`, `supabase/migrations/**`, `supabase/config.toml`

**Deferred capabilities (not Wave 2):**
- Wave 3: C3 + C4
- Wave 4: C5
- Post-Mastery: RR-7, RR-9, RR-10 (per `docs/asb/post-mastery-expansion-roadmap.md`)

---

## §1 Capability Review

### C2 — Today Presence
- **Objective**: A first-time athlete landing on `/today` immediately understands *what is happening*, *why it matters*, *what to do next*, and *where to go next* — without prior platform knowledge.
- **Dependencies**: Wave 1 `getHammerIdentity()`, Wave 1 `classifySilenceZone()`, existing `useHammerState`, `useNextAction`, `useAthleteCommandRows`, `buildDailyPrescription`, existing `PulseStrip`, `PrescriptionCard`, `CommandCenterSection`, `RuntimeOrientation`.
- **Wave 1 prerequisites**: Organism State label resolver (`src/lib/hammer/identity.ts`) sealed + green; silence classifier (`src/lib/runtime/silence/classifier.ts`) sealed + green.
- **Success definition**: All four guidance slots (Entry / Context / Next-Action / Exit) render on first-load `/today`, derive output exclusively from existing ledger projections, route through `classifySilenceZone` for every silence decision, and surface zero fabricated state.
- **Failure definition**: Any slot fabricates state, diagnoses, predicts, authorizes, overrides safeguarding/parent authority, authors organism truth, or emits content when classifier returns `lawful`.

### C6 — Navigation Handoff Capability
- **Objective**: Hammer may route an athlete to a lawful destination with a short, replay-traceable handoff descriptor. Routing carries explanation only — never authorization, diagnosis, prediction, or narrative authorship.
- **Dependencies**: existing `useNextAction`, React Router, route registry, Wave 1 identity + silence substrate.
- **Wave 1 prerequisites**: identical to C2.
- **Success definition**: Every handoff descriptor carries `{ route, reasonKey, lineageHandle }`; safeguarding-active short-circuits to lawful silence on safety-bearing destinations; the lawful destination set is exhaustively typed and unit-tested.
- **Failure definition**: Handoff emitted under safeguarding-active / athlete-revoked-narrative / missing-data-dominant zones; handoff to a destination outside the lawful set; handoff asserting authority beyond explain / summarize / guide / route.

---

## §2 Surface Inventory

### Today-surface touchpoints
| File | Current state | Expected Wave 2 behavior | Constitutional constraints |
|---|---|---|---|
| `src/pages/Today.tsx` | Renders `PulseStrip`, `CommunicationAI`, `CommandCenterSection`, `PrescriptionCard`, link tiles, `RecentList` | Wires four guidance slots via pure resolver; no business-logic change | No new emitters; no organism-truth writes; reads only |
| `src/components/today/TodayCommandBar.tsx` | Renders `HammerStateBadge`, `ReadinessChip`, Next-up CTA, QuickLog | Surfaces Entry + Next-Action slots via resolver outputs | All labels via `getHammerIdentity()`; no parallel literals |
| `src/components/onboarding/RuntimeOrientation.tsx` | Lawful-silent first-run copy | Unchanged | N/A |
| `src/components/runtime/PulseStrip.tsx` / `PrescriptionCard.tsx` / `RuntimeCard.tsx` | Presentation only | Unchanged | N/A |

### Navigation destinations (lawful Wave 2 set)
| Route | Current state | Expected Wave 2 behavior | Constitutional constraints |
|---|---|---|---|
| `/relational` | Routable, demo↔prod firewall via `prepareRows` | Read-only handoff with reasonKey | Visibility scope unaltered; no narrative authorship (RR-5) |
| `/practice` | Routable | Handoff allowed | No diagnosis, no prediction |
| `/training-block` (or canonical training surface) | Routable | Handoff allowed | No authorization of load |
| `/safety-center` | Routable; always reachable via standing nav | Hammer handoff *optional*; standing nav always primary | Safety access never gated by Hammer |
| `/rtp` | Routable | Handoff allowed only with explicit lawful trigger | Never authorizes RTP (RR-6); never diagnoses |
| `/bounce-back-bay` | Routable | Handoff allowed | No diagnostic language; athlete-reported pain supremacy (RR-6) |
| `/accept-parent-invite` (and parent-invite entry) | Routable | Handoff allowed for athletes only | Parent supremacy preserved; Hammer authors zero parent state |

---

## §3 File Impact Inventory

### Expected to be touched in Wave 2 build (next phase)
| File | Purpose | Capability | Dependency justification | Expected risk |
|---|---|---|---|---|
| `src/lib/runtime/guidance/types.ts` (new) | Slot type contracts | C2 | Pure types only | Low |
| `src/lib/runtime/guidance/slots.ts` (new) | Pure `resolveGuidanceSlots(input)` | C2 | Composes Wave 1 substrate | Low — pure module, no I/O |
| `src/lib/runtime/guidance/__tests__/slots.test.ts` (new) | Slot unit + replay determinism | C2 | Required by §8 | Low |
| `src/lib/runtime/handoff/types.ts` (new) | Handoff descriptor types + lawful destination union | C6 | Pure types | Low |
| `src/lib/runtime/handoff/destinations.ts` (new) | Pure `resolveHandoff(input)` + lawful registry | C6 | Composes Wave 1 substrate | Low |
| `src/lib/runtime/handoff/__tests__/destinations.test.ts` (new) | Exhaustiveness + forbidden-phrase + safeguarding precedence | C6 | Required by §8 | Low |
| `src/components/today/TodayGuidanceSlots.tsx` (new, optional) | Thin presentation wrapper | C2 | Keeps `Today.tsx` minimal | Low |
| `src/pages/Today.tsx` | Wire four slots | C2 | Single integration site | Medium — render-path change |
| `src/components/today/TodayCommandBar.tsx` | Surface Entry + Next-Action via resolver | C2 + C6 | Existing CTA already navigates | Low |

### Intentionally untouched
`src/branding.ts`, `src/hooks/useHammerState.ts`, `src/hooks/useEngineHealth.ts`, `src/hooks/useNextAction.ts` (consumed read-only), `src/lib/runtime/projections/types.ts` (`prepareRows`), `supabase/functions/_shared/demoFirewall.ts`, `src/contexts/DemoModeContext.tsx`, all `src/lib/runtime/relational/**`, all `supabase/migrations/**`, `supabase/config.toml`, all parent / coach / recruiter / onboarding surfaces beyond `/today`, all RR-7/9/10 code paths, all Wave 1 sealed files.

---

## §4 Four Guidance Slots — Implementation Plan

For each slot: **Inputs · Outputs · Authority limits · Silence conditions · Verification.** Capability behavior only; no prompts, no copywriting.

### 4.1 Entry Guidance
- **Inputs**: Organism State (`useHammerState`), first-event presence (`useAthleteOnboardingState` / existing onboarding signal), `getHammerIdentity()`.
- **Outputs**: `{ kind: 'entry', verdict: SilenceVerdict, labelRef?: 'organismStateLabel' }` — a presence marker carrying no claims.
- **Authority limits**: *explain* only. May not diagnose, predict, authorize, narrate.
- **Silence conditions**: `safeguarding-active`, `athlete-revoked-narrative`, `missing-data-dominant` → `lawful`.
- **Verification**: unit test every zone × Entry slot; assert label resolved via `getHammerIdentity()`; assert zero event emission.

### 4.2 Context Guidance
- **Inputs**: latest `prescription.daily.rendered` event row, Organism State, runtime topic counts from `useAthleteCommandRows`.
- **Outputs**: `{ kind: 'context', verdict, summaryRefs: string[] }` — references to existing projections, never authored prose.
- **Authority limits**: *summarize* only.
- **Silence conditions**: `unpopulated-surface-no-signal` → `lawful`; `unpopulated-surface-with-signal` → `accidental` (build-blocker).
- **Verification**: zone-matrix unit test; assert `summaryRefs` are projection ids only, not free-form strings.

### 4.3 Next-Action Guidance
- **Inputs**: `useNextAction()` output (read-only), Organism State.
- **Outputs**: `{ kind: 'next', verdict, route, ctaLabelRef, moduleHint }` mirroring existing hook shape.
- **Authority limits**: *guide* + *route*.
- **Silence conditions**: `post-action-cooldown`, `awaiting-input` → `lawful`.
- **Verification**: zone-matrix unit test; assert `route` ∈ lawful destination set (§5); replay-determinism test across shuffled inputs.

### 4.4 Exit Guidance
- **Inputs**: handoff descriptor from C6 `resolveHandoff`.
- **Outputs**: `{ kind: 'exit', verdict, handoff?: HandoffDescriptor }`.
- **Authority limits**: *route* only.
- **Silence conditions**: `route-not-yet-rendered` → `lawful`; inherits all C6 silence conditions.
- **Verification**: integration test asserting Exit ↔ C6 wiring; safeguarding precedence preserved end-to-end.

---

## §5 Navigation Handoff — Implementation Plan

Lawful destination set is closed and exhaustively typed. For each:

| Destination | When may handoff occur | Why may handoff occur | Required explanation | Prohibited explanation | Silence conditions |
|---|---|---|---|---|---|
| `/relational` | Relational signal lineage present | Surface athlete-owned relational state | route + reasonKey + lineageHandle | narrative claims (RR-5), trust-score authorship | safeguarding-active, athlete-revoked-narrative |
| `/practice` | Practice window per `useNextAction` | Time-of-day or readiness gate | route + reasonKey + lineageHandle | load authorization, prescription mutation | safeguarding-active |
| `/training-block` | Training schedule lineage present | Scheduled block | route + reasonKey + lineageHandle | load authorization, RPE authorship | safeguarding-active |
| `/safety-center` | Athlete-initiated only; Hammer handoff optional | Standing nav remains primary | route only | any framing implying Hammer gates safety | safeguarding-active → lawful silence on Hammer handoff (standing nav unaffected) |
| `/rtp` | Explicit lawful trigger only | RR-6 sub-route | route + reasonKey + lineageHandle | diagnosis, RTP authorization, readiness assertion | safeguarding-active, missing-data-dominant |
| `/bounce-back-bay` | Recovery state lineage present | Recovery surface | route + reasonKey + lineageHandle | diagnosis, recovery prescription | safeguarding-active |
| `/accept-parent-invite` | Athlete-facing only | Parent-invite acceptance flow | route only | any authorization of parent state (RR parent supremacy) | safeguarding-active |

**Verification per destination**: unit test asserting (a) route ∈ lawful set, (b) descriptor carries lineage handle, (c) forbidden-phrase grep over registry returns zero, (d) `safeguardingActive=true` produces `{ silence: 'lawful' }`.

---

## §6 Constitutional Verification Plan

| Invariant | Potential violation vector | Required verification |
|---|---|---|
| **RR-5** (narrative) | Slot fabricates narrative or destiny framing | Resolver source contains no narrative authorship; `athlete-revoked-narrative` → lawful silence unit test |
| **RR-6** (injury/recovery) | RTP / Bounce Back handoff implies diagnosis or RTP authorization | Forbidden-term grep (`diagnose`, `cleared`, `authorize`, `prescribe`) over destination registry; safeguarding precedence test |
| **RR-8** (life context) | Guidance surfaces undisclosed life context | Resolver inputs restricted to ledger projections already disclosed to athlete; no `life_context_event` reads in Wave 2 |
| **Replay determinism** | Non-pure resolver (Date.now, Math.random, network) | Purity grep on `slots.ts` + `destinations.ts`; byte-identical output across shuffled inputs + two invocations |
| **Parent supremacy** | Handoff authorizes parent-invite acceptance | `/accept-parent-invite` descriptor carries route-only payload; no authorization fields; integration test asserts no parent-state write |
| **Safeguarding precedence** | Slot or handoff downgrades `safeguardingActive=true` | Reused Wave 1 classifier test + new integration test on Today wiring |
| **Single Hammer authority** | Parallel identity literals reintroduced | Grep audit for raw "Hammer State" in Today subtree returns zero; all labels via `getHammerIdentity()` |
| **Organism State silence** | Guidance surface emits events | Resolver emits zero events; only existing emitters remain; grep for `emitAsbEvent` / `emitRuntimeEvent` in new files returns zero |

---

## §7 Acceptance Criteria (measurable)

### C2
- **2.1** All four slots render on first-time `/today` load with zero console errors.
- **2.2** 100% of slot outputs originate from `src/lib/runtime/guidance/slots.ts` (no inline state in `Today.tsx` or `TodayCommandBar.tsx`).
- **2.3** Silence classifier covers 8/8 Phase 6 §F zones for every slot (unit-tested matrix).
- **2.4** Zero `Date.now()`, `Math.random()`, network, or storage calls in `slots.ts` (grep audit).
- **2.5** "Organism State" label surfaces via resolver in ≥1 slot; zero raw `"Hammer State"` string literals in Today subtree (grep).

### C6
- **6.1** Lawful destination union has exactly the 7 routes in §2; exhaustive-switch test enforces.
- **6.2** Every non-silence handoff descriptor carries `{ route, reasonKey, lineageHandle }`.
- **6.3** `safeguardingActive=true` → `{ silence: 'lawful' }` for `/rtp`, `/bounce-back-bay`, `/safety-center` (unit test).
- **6.4** Zero forbidden phrasing tokens (`diagnose|prescribe|authorize|cleared|predict`) in `destinations.ts` (grep).
- **6.5** `resolveHandoff` byte-identical across shuffled-input ordering and two invocations (replay-determinism test).

---

## §8 Test Plan

- **Unit**
  - `slots.test.ts` — zone matrix × 4 slots; identity-reuse assertion; purity assertion.
  - `destinations.test.ts` — exhaustive lawful-destination switch; forbidden-phrase grep; safeguarding precedence; descriptor shape.
- **Integration**
  - Today render test: all four slot kinds mount; no parallel identity literal; no event emission on render.
- **Replay**
  - `slots.ts` + `destinations.ts` produce byte-identical output across shuffled inputs and two invocations.
- **Navigation**
  - Route-existence assertions for all 7 lawful destinations against the project router registry.
- **Safeguarding**
  - Every slot + every handoff returns lawful silence when `safeguardingActive: true`.
- **Visibility**
  - Demo↔prod firewall unaffected: `prepareRows` unchanged; Relational handoff respects existing scope.
- **Regression**
  - Wave 1 vitest suite (10/10) remains green; no edits to Wave 1 sealed files.
- **Authority**
  - Static assertion: new modules reference none of `organism_truth`, `athlete_intent`, `authority_override`, `hard_stop`, `rehabilitation_state`.

---

## §9 Failure Analysis

| What can break | Detection | Correction | Escalation threshold |
|---|---|---|---|
| Slot fabricates state when signal missing | `unpopulated-surface-with-signal` → `accidental` unit test | Route to lawful silence in resolver | Build-blocker |
| Handoff to non-lawful destination | TS exhaustiveness check + unit test | Reject in resolver; widen lawful set only via new package phase | Typecheck failure |
| Safeguarding downgrade | Safeguarding-precedence test (slot + handoff) | Classifier short-circuit (Wave 1) | **Constitutional violation — halt Wave 2** |
| Non-determinism (clock / random / network) | Replay-determinism test + purity grep | Remove side effect | Build-blocker |
| Parallel identity literal reintroduced | Grep audit in CI step | Route through `getHammerIdentity()` | Ratification denied |
| Event emission from guidance surface | Grep for `emit*` in new files | Remove emission; resolver is read-only | Ratification denied |
| Parent supremacy violation on `/accept-parent-invite` | Integration test asserting zero parent-state write | Strip authorization fields from descriptor | **Constitutional violation — halt Wave 2** |

---

## §10 Ratification Requirements

- **Wave 2 Complete** — All §3 files created/edited per inventory; all §7 acceptance criteria met; all §8 tests authored.
- **Wave 2 Verified** — Full vitest suite green (Wave 1 + Wave 2); preflight clean; all grep audits clean; replay determinism proven byte-identical; safeguarding precedence proven end-to-end.
- **Wave 2 Ratified** — Constitutional audit signed against every §6 vector; `.lovable/plan.md` sealed Wave 2 entry appended; exit gate (§11) satisfied; zero open escalations from §9.

All three statuses are *separately* defined and *separately* attested.

---

## §11 Exit Gate (before Wave 3)

Wave 3 (C3 + C4) may begin **only when all of the following hold**:

1. Wave 2 Ratified status recorded in `.lovable/plan.md` with attestation timestamp.
2. Zero open escalations from §9.
3. No drift into C3 / C4 / C5 surfaces (grep audit confirms).
4. `getHammerIdentity()` remains the sole identity authority (no parallel resolvers introduced).
5. `classifySilenceZone()` remains the sole silence authority (no parallel classifiers introduced).
6. All four guidance slots + all seven handoff destinations have green tests.
7. No new schemas, migrations, projections, or emitters introduced.
8. RR-5, RR-6, RR-8 invariants re-attested.

---

## §12 Stop Gate Confirmation

No Wave 3. No Wave 4. No RR-7. No RR-9. No RR-10. No capability additions. No scope expansion. **Wave 2 only.**
