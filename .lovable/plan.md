## Problem

The "How?" sheet on defense drills (DP pivot primer, Backhand primer, Deep-hole primer, PFP, scoop, framing, blocking, relays, slap-bunt reads, etc.) falls back to the placeholder text "A full step-by-step guide for this movement is on the way…" because `movementGuide.ts` has **zero entries for any defense drill** — only warmup / EASS / lift / bat-speed movements are covered. On the card itself, cues are one short line, and every athlete sees the same rep count regardless of training age or rung, so young players are lost and elite players are unchallenged.

## Fix — Elite Defense Drill Intelligence

### 1. Zero-knowledge guides for every defense drill (`defenseGuides.ts`, new)
- Author `MovementGuide` entries for every drill name in `defenseLibrary.ts` (~55 unique drills across C / P / 1B / 2B / SS / 3B / OF, both sports). Each guide follows the existing schema: `what · setup · goodRep[] · badRep[] · feel · whyToday · nextLink · stopIf`.
- Keyed by normalized drill name so `guideFor()` finds them without touching `MovementGuideSheet.tsx`.
- Register the catalog inside `movementGuide.ts` (single `Object.assign(GUIDES, DEFENSE_GUIDES)` call at module load — no lookup-path change).

### 2. Difficulty ladder on every drill (`defenseLibrary.ts`)
- Extend `DrillStep` (defense-only field) with `variants: { beginner, developing, advanced, elite }`, each carrying its own dosage + a coach-legible progression note (e.g. beginner = tennis balls on knees, elite = live BP short-hops with pop-time timer).
- Add a `selectDefenseTier()` helper that maps the athlete's `rung` (Foundation → Sustain from the roadmap ladder we already ship) + `liftingAgeYears` + `lifecycleBand` to a tier, and rewrites each drill's `dosage`/`setup` to match.
- The card still shows one drill, but the dosage line + setup swap based on tier so a 10-year-old and a college shortstop each get real work.

### 3. Card copy — coach-legible detail
- Every drill in the catalog gets a `setup` string (many are missing today) and a longer `cue` (2 phrases: intent + failure mode). No behavior change — same shape, richer content.
- Add per-position `stopRules` expansion (arm tightness, hop-count ceiling, knee pain on blocking) so `WkDefenseCard.tsx` renders them under the drill list.

### 4. Tier badge on the card
- `WkDefenseCard.tsx` renders a small "Tier: Developing" chip beside the position badge, plus a "See how a pro does this" affordance that opens the guide sheet already wired to `MovementGuideSheet`.

### 5. Determinism + drift guards
- Extend `scripts/check-skill-frequency-ceiling.ts` (or add a sibling) to assert **every drill name in `defenseLibrary.ts` has a `guideFor()` hit** — CI fails if a new drill lands without a guide. Locks the "no vague defense drill, ever" invariant.
- Add unit tests: `resolveDefensePrescription()` at each tier returns the expected dosage strings; injury gating still fires; every drill exposes a guide.

### 6. Scope discipline
- No schema migration, no auth touches, no changes to microcycle / roadmap logic. Pure additive content + one type extension + one UI badge.

## Technical notes
- **Files edited:** `src/lib/hammer/prescription/defenseLibrary.ts`, `src/lib/hammer/prescription/movementGuide.ts`, `src/components/hammer/WkDefenseCard.tsx`, `scripts/check-skill-frequency-ceiling.ts` (or new sibling), plus new `src/lib/hammer/prescription/defenseGuides.ts` and test file.
- **Guide count:** ~55 defense guides. Written in the same voice as the existing warmup/EASS guides (concrete, safety-first, 8-year-old-legible).
- **Determinism:** guides and tier resolution are pure functions; drift-guard script wires into `scripts/preflight.sh` next to the skill-frequency lint.

## Out of scope
- Video demos, external URLs, animated diagrams. Text guides only for this pass — the sheet is already built for text and this closes the vague-card gap without new asset infra.
