# Restore P3 as a Voluntary Stride (Power Step)

Reverse the "P3 is involuntary / do-not-cue" doctrine everywhere it appears. P3 becomes a
consciously coached, consciously cued move that happens after P1 (hip load) and P2 (hand load):
the hitter strides toward the pitcher's release point while the pitcher works toward release,
aiming to get the front foot down (power step) early enough to be loaded and ready to strike.

Applies identically to baseball and softball (slap/running-start remains its own permitted variant).

## What changes for the athlete

- P3 is named **Stride / Power Step** and is a taught, cueable action, not a byproduct.
- Felt order and camera order become the same: **P1 → P2 → P3 → P4**.
- Cues return: stride to the release point, front foot down on time, land sideways and ready.
- Video analysis will call out stride timing and quality directly, and the prescribed fix for a
  late/short/long stride is stride work — no longer "re-cue P1/P2/P4 instead."
- The roadmap ladder no longer shows the "*involuntary — do not cue" legend.

## Doctrine and enforcement

- `.lovable/p3-do-not-cue-rule.md` is replaced by a new `.lovable/p3-power-step-rule.md` that
  defines the voluntary power step: timing anchor (pitcher's release point), target foot-down
  moment, direction, length ceiling, landing checkpoints, and the failure list.
- `scripts/lint-no-p3-cue.ts` currently fails the build on stride cue phrases. It is repurposed
  into a stride-doctrine lint: the ban list on stride/step language is removed, and it instead
  flags leftover "do not cue the stride" / "involuntary" athlete-facing copy so old doctrine
  cannot leak back in. Preflight keeps calling it.
- `.lovable/hitting-philosophy-v2-arakawa-integration.md` gets an amendment section recording the
  reversal (prior text preserved, superseded and dated) so history stays intact.

## Technical changes

1. **Phase definitions** (`src/lib/hittingPhases.ts` + mirror
   `supabase/functions/_shared/hittingPhases.ts`, kept byte-aligned):
   - P3: name "Stride / Power Step", `involuntary`/`doNotCue` removed, `feltOrder: 3`;
     P4 `feltOrder: 4`; `HITTING_FELT_ORDER` becomes `['P1','P2','P3','P4']`.
   - P3 summary rewritten to the power-step definition. Score cap stays 75.
   - Keep the `involuntary`/`doNotCue` fields on the interface as optional (unused) so no other
     consumer breaks; drop them from all phase records.
2. **AI analysis prompt** (`supabase/functions/_shared/hittingPhases.ts`, Phase 3 block of the
   canonical doctrine string): rewritten to instruct the model to grade the stride *and* to give
   direct stride cues — release-point timing, foot-down-before-release-to-contact window, sideways
   landing, no drift, length ceiling. Removes the "do not instruct" paragraph.
3. **Causal chains** (`src/lib/hittingCausalChains.ts` + edge mirror): P3 chain's athlete fix and
   coach note become stride instruction; the 4-step Feel → Isolate → Constrain → Transfer roadmap
   for P3 is rewritten around stride-timing work (rhythm/step-on-time drills, foot-down-on-release
   count, machine transfer) instead of no-stride/constraint-only work.
4. **Report card** (`src/lib/reportCard/disciplines/bh.ts`): P3 "what it means" and "how to
   improve" rewritten to voluntary stride coaching; the late-swing item stops saying "never coach
   the stride directly" and instead prescribes earlier stride initiation timed to release.
5. **Owner tagging labels** (`src/lib/formulaPhases.ts`): P3 label becomes "P3 Stride (power
   step)" with a timing hint; storage id `p3_launch` unchanged so tagged videos keep working.
6. **Roadmap UI** (`src/components/hitting/HittingRoadmapLadder.tsx`): single order badge
   (P1 → P2 → P3 → P4), asterisk legend and involuntary tooltip removed.
7. **Sweep**: grep `involuntary`, `do-not-cue`, "body will plant" across `src/`,
   `supabase/functions/`, and drill seed copy (`src/data/baseball|softball/drillDefinitions.ts`)
   and update any remaining athlete-facing strings.

No database migration is required — phase ids, storage keys, and score caps are unchanged.

## Verification

- Typecheck + preflight (including the rewritten stride lint) must pass.
- Confirm the analysis prompt, report card, roadmap ladder, and owner tagging all read
  P1 → P2 → P3 → P4 with stride cues present and zero "involuntary" language left in athlete copy.
