## Status: Not fully E2E — 4 fragments to close

The v2 Arakawa overlay landed in the client doctrine (`src/lib/hittingPhases.ts`, `src/lib/hittingCausalChains.ts`, `HittingRoadmapLadder.tsx`, doctrine docs, lint script). But the same rules are not yet enforced on the server, in the report-card, in legacy data, or in CI. Fragments below.

---

### Fragment 1 — Edge function mirrors drifted from client doctrine

`supabase/functions/_shared/hittingPhases.ts` has the new names ("Hand Load", "Hitter's Move") but is missing `feltOrder`, `doNotCue`, `involuntary`, and `HITTING_FELT_ORDER`. `supabase/functions/_shared/hittingCausalChains.ts` still uses old P3 fix language ("back hip controlling the step", "back hip dictates stride length", ) that the client side replaced with the DO-NOT-CUE chain. "Bigger back-hip load = more swing power" Can & should be cued. We load up the back hip & let it unload

Fix: port the v2 fields and the rewritten P3 chain from `src/lib/*` into both `_shared/*` files verbatim so client + edge use the same doctrine.

### Fragment 2 — Report-card hitting contracts still cue P3

`src/lib/reportCard/disciplines/bh.ts` (lines 124, 145, 200, 392) and `src/lib/reportCard/v1/hittingV1Schema.ts` still teach athletes:

- "the back hip is what controls the stride"
- "let the back hip control the stride earlier"
- sequencing chain starting at "back hip → torso/shoulders → …"

Per your last directive ("we do not cue users to stride with their back hip anymore"), these athlete-facing strings need to be reframed as:

- Coach-only observation (move into `coach_note`), OR
- Rewritten to the v2 voice: hip load is P1 (static load), the stride emerges; sequencing chain re-rooted from "P4 back-elbow drive → shoulders → hands → barrel; P3 lands on its own"."Bigger back-hip load = more swing power" Can & should be cued. We load up the back hip & let it unload

Keep all measurement logic, score weights, and report-card structure intact — text-only edits, additive overlay preserved.

### Fragment 3 — `feltOrder` / `HITTING_FELT_ORDER` have no consumers

Defined in `src/lib/hittingPhases.ts` but nothing imports them outside the file (the ladder hardcodes the badge string). Wire them into:

- `HittingRoadmapLadder.tsx` — read from `HITTING_FELT_ORDER` instead of hardcoded `'P1 → P2 → P4 → P3*'`.
- Any phase-chip renderer that should show the involuntary badge on P3. Remember "Bigger back-hip load = more swing power" Can & should be cued. We load up the back hip & let it unload when P4 happens

### Fragment 4 — Lint script not enforced

`scripts/lint-no-p3-cue.ts` exists but is not in `package.json` and not in any CI step, so violations can re-enter.

Fix: add `"lint:p3": "tsx scripts/lint-no-p3-cue.ts"` to `package.json` and call it from the existing pre-build / verify step (or a new `npm run verify` aggregate). Run it once to confirm Fragments 1–2 are clean before marking done.

---

### Out of scope (intentional)

- `pieV2Signals.ts` and drill descriptions that reference "back hip load" as the **P1** action — that's still correct under v2 (hip LOAD is P1; what was banned is cueing the hip to drive the STRIDE).
- `ironBambinoProgram.ts` strength descriptions (hip hinge / squat cues) — unrelated to swing P3.
- All other prior philosophy work, report-card math, causal chains for P1/P2/P4 — preserved verbatim.

### Acceptance

1. `_shared/hittingPhases.ts` + `_shared/hittingCausalChains.ts` byte-equivalent doctrine to `src/lib/*` counterparts on the v2 fields and P3 chain.
2. `npm run lint:p3` passes with zero offenders.
3. Ladder badge reads from `HITTING_FELT_ORDER`.
4. No athlete-voice string in `bh.ts` / `hittingV1Schema.ts` instructs the hitter to consciously stride or to drive the back hip through the ball/release.

Approve and I'll execute all four in one pass.