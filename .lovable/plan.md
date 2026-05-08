
# Universal Cause→Effect Doctrine

Every grading, feedback, and recommendation surface in the app must speak the same language: a 5-link causal chain plus a 4-step roadmap, written in dual register (athlete voice + coach note). Hitting's severity model becomes the universal contract. Forward-only — old recaps stay as they are.

## 1. The Universal Contract

Every fault, weakness, or limiter the system surfaces must include:

**Chain (5 links):**
1. **Trigger** — when/under what condition it shows up
2. **Cause** — the underlying cause (mechanical, perceptual, decisional, physiological, behavioral)
3. **Mechanism** — why it breaks the system (kinetic, neural, metabolic, attentional)
4. **Result** — what shows up on the field / in the body / in performance
5. **Fix** — the actionable lever to pull

**Roadmap (4 steps, domain-tuned ladder — see §3):**
Each step carries an athlete cue, a coach note, and a drill/protocol id.

**Severity model (inherited from hitting, universal):**
- Non-Negotiable (NN) violation: hard cap 50, soft cap 70
- Standard violation: cap 80
- Secondary violation: cap 85 (or 75 where applicable)
- Two-or-more violations: cap 65, chains stack in phase order (1→N)
- Elite execution: +5 cap raise + Elite badge + Differentiation engine eligibility

## 2. Domains Covered (system-wide mandate)

Every domain below adopts the contract. Phases drafted here are starting points — user will edit per domain in follow-ups.

### A. On-field skill domains
- **Hitting** — already locked (1-2-3-4: Hip Load / Hand Load / Stride / Hitter's Move)
- **Pitching (baseball + softball)** — drafts using existing memory:
  - P1 Leg Lift / Balance Point (cap 80)
  - P2 Stride + Hip-Shoulder Separation (cap 75)
  - P3 Lateral Shoulders / Late Trunk Rotation (NN, cap 50/70)
  - P4 Release + Finish (NN, cap 50/70, Elite +5)
- **Defense / fielding** — P1 Pre-pitch Athletic Stance, P2 First Step / Read, P3 Glove-to-Throw Transfer, P4 Throw Quality (NN). Caps mirror hitting.
- **Baserunning + base stealing** — P1 Lead/Stance, P2 Read/Trigger (NN), P3 First Three Steps, P4 Slide/Touch (NN). Stealing trainer + baserunning IQ both inherit.

### B. Physical & recovery domains
- **Strength / CNS / Heat Factory / Hammers** — P1 Activation, P2 Loading, P3 Integration, P4 Expression. NN flags on overload / under-recovery.
- **Regulation + rest engine** — P1 Sleep Debt, P2 CNS Readiness (NN), P3 Workload Trend, P4 Subjective Override.

### C. Behavioral & mental domains
- **Nutrition + hydration** — P1 Macro Floor (NN: protein), P2 Micro Coverage, P3 Hydration Quality, P4 Habit Lock-in.
- **Mental / decision / perception (BQI, baserunning IQ, pitch recognition)** — P1 Anticipation, P2 Read/Trigger (NN), P3 Decision, P4 Execution Confidence.

## 3. Domain-Tuned 4-Step Ladders

| Domain | Step 1 | Step 2 | Step 3 | Step 4 |
|---|---|---|---|---|
| Skill (hit/pitch/def/run) | Feel | Iso drill | Constraint rep | Live transfer |
| Strength / CNS | Activate | Load | Integrate | Express |
| Nutrition / hydration | Notice | Swap | Lock | Sustain |
| Recovery / regulation | Detect | Downshift | Restore | Reload |
| Mental / decision | See | Name | Choose | Repeat under pressure |

Each step in the UI shows: athlete cue, coach note (collapsible), drill/protocol id.

## 4. Output Surfaces (must emit chain + roadmap)

All four surfaces required:
1. **All AI analysis outputs** — `analyze-video`, `analyze-base-stealing-rep`, `analyze-food-photo`, `analyze-video-description`, `predict-hammer-state`, `generate-interventions`, `suggest-adaptation`, `hie-verify`, etc.
2. **Hammer chat** (`ai-chat`) — every diagnostic answer follows chain order; multi-violation answers stack 1→N.
3. **Recaps + longitudinal reports** — `generate-vault-recap`, monthly reports, session insights, MPI/HIE breakdowns.
4. **Drill descriptions + rep feedback** — every drill carries its target chain link + roadmap step + parent phase. Per-rep feedback names the link being trained.

## 5. Implementation Approach

### Shared contract layer (new)
- `supabase/functions/_shared/causalContract.ts` + mirror at `src/lib/causalContract.ts`
  - Types: `CausalChain`, `ChainLink`, `RoadmapStep`, `RoadmapLadder`, `SeverityCaps`, `Domain`
  - Constants: `SEVERITY_CAPS` (NN 50/70, std 80, secondary 75/85, multi 65, elite +5)
  - `LADDERS` map keyed by domain
  - `applySeverityCaps()`, `stackChainsByPhase()`, `assertChainShape()` (validates output before persistence/return)

### Per-domain doctrine modules (drafts, user edits)
- `_shared/pitchingPhases.ts` (+ `src/lib/pitchingPhases.ts`)
- `_shared/defensivePhases.ts` (+ mirror)
- `_shared/baserunningPhases.ts` (+ mirror)
- `_shared/strengthPhases.ts` (+ mirror)
- `_shared/regulationPhases.ts` (+ mirror)
- `_shared/nutritionPhases.ts` (+ mirror)
- `_shared/mentalPhases.ts` (+ mirror)
- Each defines numbered phases, NN flags, caps, and chain templates following the existing `hittingPhases.ts` pattern.

### Causal chain libraries (drafts per domain)
- `_shared/<domain>CausalChains.ts` (+ mirror) modeled on `hittingCausalChains.ts`
- Includes per-phase chains, soft/hard variants, elite chains where applicable, `buildChainsForViolations()` helper that respects phase order.

### Edge function updates (prompt + response shape)
Each function gets a shared prompt suffix injecting the contract + the domain's doctrine, and validates the JSON response with `assertChainShape()` before returning. Functions touched:
- `analyze-video`, `analyze-base-stealing-rep`, `analyze-food-photo`, `analyze-video-description`
- `ai-chat` (chain order + stacking enforced in system prompt)
- `generate-vault-recap` (correlations rendered as chains; new `causalChain` field per insight)
- `predict-hammer-state`, `generate-interventions`, `suggest-adaptation`, `hie-verify`
- `get-monthly-report` / `list-monthly-reports` consumers — accept new chain field

### UI (additive, reuse hitting components)
- Generalize `HittingCausalChainCard.tsx` → `CausalChainCard.tsx` (props: chain, domain, phaseLabel, severity)
- Generalize `HittingRoadmapLadder.tsx` → `RoadmapLadder.tsx` (props: roadmap, domain → picks ladder colors/labels)
- Surfaces that render them: post-session recap, MPI breakdown, HIE drill cards, vault recap, monthly report viewer, drill detail screens, Hammer chat message renderer (parses fenced `chain://` blocks), nutrition limiter cards, regulation alerts.
- Existing `HittingCausalChainCard` / `HittingRoadmapLadder` become thin wrappers around the generalized components for back-compat.

### Drill metadata
- Extend `src/data/baseball/drillDefinitions.ts` and `src/data/softball/drillDefinitions.ts` with `targetPhase`, `chainLink` ('trigger'|'cause'|'mechanism'|'result'|'fix'), `roadmapStep` ('feel'|'iso'|'constraint'|'transfer' or domain equivalent). Same shape on Tex Vision, Heat Factory, Hammers, regulation, nutrition habit drills.

### Memory updates
- New core line: "Every formula is cause→effect: 5-link chain + 4-step roadmap, hitting's severity model universal. Applies to all AI outputs, Hammer chat, recaps, drills, rep feedback."
- New memory file: `mem://architecture/universal-cause-effect-doctrine` with full contract, ladders table, severity caps, domain phase drafts, surface checklist.
- Index updated; existing hitting memory cross-linked.

## 6. Non-Goals (explicit)

- **No backfill.** Existing sessions, recaps, monthly reports stay as-is. Forward-only.
- **No DB schema migration required** — chains live in JSON fields already on `performance_sessions`, `vault_recaps`, message payloads.
- **No removal of existing scoring.** Caps and chains are additive on top of current MPI/HIE/BQI/PEI math.
- **No new AI provider work** — uses Lovable AI Gateway models already in place.

## 7. Rollout Order (single implementation pass)

1. Land shared contract + generalized UI components + memory.
2. Land per-domain phase + chain drafts (pitching, defense, baserunning, strength, regulation, nutrition, mental) — drafted for user to edit later.
3. Wire all listed edge functions to inject contract and validate output.
4. Wire all listed UI surfaces to render `CausalChainCard` + `RoadmapLadder`.
5. Extend drill metadata with chain/roadmap tags.

After implementation, follow-up loops will refine each domain's phase doctrine with the user one domain at a time.
