
# Hammer Hitting Formula — Final Lock-In

Additive only. Nothing existing is removed. This plan integrates every clarification from this conversation into one airtight, end-to-end formula that drives video analysis, Hammer chat, practice/game logging, recaps, drills, and the elite differentiation engine.

---

## 1. Canonical Doctrine (locked, baseball + softball identical except slap)

### Phase 1 — HIP LOAD *(NON-NEGOTIABLE)*
- Slow, controlled, balanced **back-hip** load **before** the hand load
- **HARD timing trigger:** legs must be loaded by the time the pitcher's hands break apart. Tempo of pitcher (windup, stretch, slide-step, quick-pitch) does NOT relax this — if hands break and hips aren't loaded, P1 is violated
- Rule: bigger early hip load = more swing power, regardless of stride style (no-stride, toe tap, leg kick, hover, coil, hinge are equivalent valid expressions)
- **Cap if violated: 80**

### Phase 2 — HAND LOAD *(style-permitted; flag only when consequences appear)*
- Bat / scap / knob load behind the head locks the balance Phase 1 created
- Dialogue tone in feedback ("what do you feel?")
- **Cap if violated: 85**

### Phase 3 — STRIDE / LANDING *(style-permitted; flag only when consequences appear)*
- Short controlled back-hip step that lands **sideways**, chest + shoulders square to plate, both feet down, core max-tensioned. Hips do NOT turn shoulders.
- Dialogue tone in feedback
- **Cap if violated: 75**

### Phase 4 — HITTER'S MOVE *(NON-NEGOTIABLE — MOST IMPORTANT)*
- Knob = fulcrum. Back elbow drives forward FIRST. Hands stay back, shoulders stay closed, barrel catapults LAST.
- "Lines hands up with the ball" — try to make contact with the hands; extension is a natural after-contact result of leftover core tension.
- **Pinnacle teaching point:** the elbow leading forward IS what turns the body and whips the bat to the ball. Cause and effect are inseparable.

#### P4 violation severity (NEW — locked)
- **Hard P4** (cast, rollover, early barrel flip, shoulders open before elbow extends, hands clearly leading) → **cap 50**
- **Soft P4** (clean elbow lead but visible extension AT contact, or hands very slightly leading) → **cap 70**, treated as a teaching point with Coach's Note dialogue

#### P4 elite reward (NEW — locked)
- When the rep is verified as: elbow leads forward → hands stay back → contact made with hands → extension occurs **post-contact** → barrel catapults last
  - **+5 cap raise on P4** (max 100)
  - **"Elite Move" badge** on the rep, visible in vault recap
  - Counted toward the **Elite Differentiation Engine** rarity boost
  - BQI for that rep is preserved (no double-count vs the cap raise)

### Multi-phase violation cap
- Two or more phases violated → **max 65**
- The lowest applicable cap always wins

### Multi-phase priority (NEW — locked)
- **P4 can stand alone** if 1–3 are clean: lead with P4
- If ANY of P1/P2/P3 is compromised: **always start in order from P1** (kinetic chain order)
- Roadmap surface for the athlete: **all violated chains stacked in 1→2→3→4 order**, each with its own 5-link chain + 4-step roadmap. P4 always carries an "extreme importance" badge regardless of order.

### Slap exception (softball slap-progression at-bats only)
- P2 + P3 are RELAXED (lack of hand load and front-foot drift allowed)
- P1 + P4 unchanged
- P2/P3 5-link chains and roadmaps are **suppressed entirely** on slap reps (not even shown as informational)

### Elite Slap Rep (NEW — locked)
A slap rep is graded elite when it satisfies P1 + P4 **plus all three** slap-specific gates:
1. **Running-start timing** — front foot lands in rhythm with pitcher's release
2. **Top-down barrel** — barrel comes down on the ball, no uppercut, ground-ball intent verified
3. **Already-moving contact** — body is moving toward 1B at contact (no stall)

Hitting all three = **Elite Slap badge** + same Elite Move treatment as the standard P4 reward.

---

## 2. The 5-Link Causal Chain (every flagged phase)

```
TRIGGER → CAUSE → MECHANISM → ON-FIELD RESULT → FIX
```

Two voices always paired:
- `athlete` — plain English, kid-friendly, one sentence per link
- `coach_note` — biomechanical/technical, one sentence

Soft P4 chain uses dialogue framing in the FIX line ("you're 90% there — the elbow IS leading; now keep the hands back through contact so extension shows up AFTER the ball, not at it.")

---

## 3. The 4-Step Roadmap (every flagged phase)

```
1. FEEL       — body cue, no bat
2. ISO        — drill, no ball or tee, isolating the fix
3. CONSTRAINT — tee/front-toss with constraint forcing the fix
4. TRANSFER   — front toss → machine → live BP, fix held under speed
```

Each step: `{ label, intent, drillId, athleteCue, coachNote }`

---

## 4. Where the formula fires

| Surface | What it shows |
|---|---|
| `analyze-video` | `phase_scores`, `phase_violations`, `p4_severity` ('hard'\|'soft'\|'elite'), `slap_elite_gates`, all violated `causal_chains[]` (ordered 1→4), `roadmaps[]` (ordered 1→4), `elite_move: bool`, `applied_caps`, final `score` |
| `ai-chat` (Hammer) | Diagnoses in TRIGGER→CAUSE→MECHANISM→RESULT→FIX, then 4-step roadmap, athlete voice first + Coach's Note. Stacks chains in 1→4 order when multiple violations. |
| Practice rep feedback | Lightweight: athlete-voice fix line + step-1 feel cue for the lowest violated phase only |
| Session recap, vault recap, game post-AB richSummary | Full stacked chains + roadmaps for all violations; Elite Move / Elite Slap badges on qualifying reps |
| Drill cards | `phasesTrained`, `fixesCause`, `eliminatesEffect`, `roadmapStep` |
| Elite Differentiation Engine | Elite Move and Elite Slap reps feed rarity/synergy boosts |

---

## 5. Files to change (additive)

### Phase logic (caps, severity, elite reward)
- **`supabase/functions/_shared/hittingPhases.ts`** + **`src/lib/hittingPhases.ts`** (mirror)
  - Add `P4_SOFT_CAP = 70`, `P4_ELITE_BONUS = 5`
  - Add `gradeP4Severity(symptoms, eliteSignals): 'hard' | 'soft' | 'elite'`
  - Update `applyPhaseCaps` to accept `{ p4Severity, slapEliteGates }`:
    - Hard P4 → 50; Soft P4 → 70; Elite P4 → raise effective P4 cap to 100 (capped at score+5 ceiling)
    - Multi-violation 65 cap still applies
  - Add `prioritizePhasesForRoadmap(violated): HittingPhaseId[]` — returns 1→4 if any of P1/P2/P3 violated; returns `['P4']` only if P4 is the sole violation
  - Add `evaluateSlapEliteGates(repCtx): { runningStartTiming, topDownBarrel, alreadyMovingContact, isElite }`
  - Add P1 hands-break timing helper `evaluateP1HandsBreakTiming(repCtx)`

### Causal chains (extend with soft-P4 + elite + slap-elite copy)
- **`supabase/functions/_shared/hittingCausalChains.ts`** + **`src/lib/hittingCausalChains.ts`**
  - Add `P4_SOFT_CHAIN` and `P4_ELITE_RECOGNITION` blocks (in athlete + coach voice)
  - Add `SLAP_ELITE_RECOGNITION` block (athlete + coach)
  - `buildChainsForViolations(violations, ctx)` returns array ordered by `prioritizePhasesForRoadmap`
  - Slap context: drop P2/P3 chains entirely

### Edge functions
- **`supabase/functions/analyze-video/index.ts`**
  - Inject locked rule set into system prompt (hands-break timing, soft/hard P4 with examples, elite reward criteria, slap elite gates)
  - Output schema additions: `p4_severity`, `elite_move`, `slap_elite_gates`, ordered `causal_chains[]`/`roadmaps[]`
  - Run `applyPhaseCaps` + `evaluateSlapEliteGates` server-side from model output before returning final `score`
- **`supabase/functions/ai-chat/index.ts`** (Hammer)
  - Append locked rules: hands-break HARD trigger, soft vs hard P4, +5 elite reward, multi-violation stacking order, slap-elite gates
  - Always answer in chain → roadmap order; stack 1→4 when multiple
- **`supabase/functions/calculate-session/index.ts`**, **`generate-vault-recap/`**, **`session-insights`**
  - Attach ordered chains + roadmaps; surface Elite Move / Elite Slap badges; respect soft vs hard P4 caps when computing session BQI multipliers (no behavior change to other modules)

### Drill metadata
- **`src/data/baseball/drillDefinitions.ts`** + **`src/data/softball/drillDefinitions.ts`**
  - Ensure each drill has `phasesTrained`, `fixesCause`, `eliminatesEffect`, `roadmapStep` (already started — fill any gaps)
  - Add a soft-P4 drill set: `keep_hands_back_through_contact`, `contact_with_hands_only_tee`, `post_contact_extension_iso` (mapped FEEL → ISO → CONSTRAINT → TRANSFER)
  - Add slap-elite drills: `running_start_timing_drill`, `top_down_slap_tee`, `moving_contact_slap_flip`

### UI (presentation only)
- **`src/components/hitting/HittingCausalChainCard.tsx`** — add severity badge (`Hard P4` / `Soft P4` / `Elite Move`)
- **`src/components/hitting/HittingRoadmapLadder.tsx`** — render stacked roadmaps in 1→4 order with phase headers
- New **`src/components/hitting/EliteMoveBadge.tsx`** — Elite Move + Elite Slap recognition pill, used in vault/recap
- Athlete voice default; Coach's Note collapsed under "Coach's note ↓"

### Memory updates
- **`mem://features/hitting-analysis/elite-hitting-mechanics-formula`**
  - Add: P1 hands-break HARD timing rule
  - Add: P4 soft (cap 70) vs hard (cap 50) split
  - Add: P4 elite reward (+5 cap raise + Elite Move badge + differentiation engine)
  - Add: Multi-violation roadmap surface = all chains stacked in 1→4 order
  - Add: Slap exception suppresses P2/P3 entirely; Elite Slap = P1 + P4 + 3 gates (running-start timing, top-down barrel, already-moving contact)
- **`mem://index.md`** — extend the hitting Core line with: "P1 hands-break is HARD trigger; P4 soft cap 70, hard cap 50, elite +5; multi-violation stacks in 1→4 order; slap-elite needs P1+P4+running-start+top-down+moving-contact."

---

## 6. Acceptance checks

- Video of a clean swing with elbow lead + post-contact extension returns `p4_severity: 'elite'`, `elite_move: true`, P4 effective cap 100
- Video where elbow leads but extension shows AT contact returns `p4_severity: 'soft'`, P4 cap 70, dialogue-tone fix line
- Video with cast / rollover returns `p4_severity: 'hard'`, P4 cap 50
- Video where pitcher slide-steps and hitter's hips aren't loaded by hands-break returns P1 violation (no tempo relaxation)
- Video with P1 + P3 + P4 violations returns roadmaps stacked **P1 → P3 → P4**, multi-violation cap 65 applied, P4 carries "extreme importance" badge
- Slap rep with P1 + P4 + all three gates → `slap_elite_gates.isElite: true`, Elite Slap badge, no P2/P3 chains anywhere
- Hammer chat answer to "why am I rolling over?" leads with P4 hard chain + roadmap; if user mentions hip-load issues, response restacks P1 → P4
- Drill cards display phase + roadmap-step badges; soft-P4 drills appear only when soft-P4 is flagged

---

## 7. Non-changes
- No DB migration
- No retroactive score recomputation
- No removal of existing kinetic-chain rules, caps, slap exception, symptom map, drill catalog, or current causal-chain seeds
- No new gates on athlete UI beyond presentation
