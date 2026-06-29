
# Game IQ 101 — Full Accuracy Audit (Option B: Report First, Fixes on Approval)

You picked **B**. Nothing gets written to the database or code until you approve each fix.

## Phase 1 — Read-only Audit (this run)

Spawn 6 parallel read-only research sub-agents. Each one pulls the relevant rows from `iq_situations`, `iq_situation_actors`, `iq_scenarios`, and `iq_actor_context_shifts`, cross-references the source files (`src/lib/iq/contextShifts.ts`, `src/lib/iq/fieldGeometry.ts`, `src/pages/GameIqSituation.tsx`, `src/components/iq/IqDiamond.tsx`), and checks each situation against the official MLB rulebook (baseball) and NCAA / USA Softball rulebook (softball).

```text
Bucket A — Bunt / Squeeze family            (~22 situations)
Bucket B — Pickoff / Balk / PFP / Mound     (~16)
Bucket C — Cutoff / Relay / Outfield reads  (~8)
Bucket D — 1st-and-3rd / Steal / Rundown    (~12)
Bucket E — Offense / Baserunning / Hitting  (~17)
Bucket F — Softball-specific + Catcher / Pitch-call / Misc (~36)
```

Each sub-agent grades every situation on 7 axes:
1. Rulebook correctness (outs, force/tag, balk/illegal pitch, infield-fly, appeals, drop-3rd, courtesy runner, look-back)
2. Sport gating (no SB-only content leaking into baseball; no baseball-only content in softball)
3. Starting positions (depth, DP depth, no-doubles, bunt creep, wheel, rotations, cutoff alignments)
4. Movement paths (`primary_path` choreography matches real coverage)
5. Coaching text quality (elite cues, not generic)
6. Context shifts (dx/dy direction correct for Speed / Swing Side / Tendency / Pitch / Weather)
7. Scenarios (3 distinct reps per situation with a defensible "correct" answer)

## Phase 2 — Deliverable: Audit Report

A single consolidated report at `docs/iq/iq101-audit-report.md` with one row per situation:

| slug | sport | verdict | issues | proposed fix |
|---|---|---|---|---|

Verdicts: ✅ correct · ⚠ needs edit · ❌ wrong. Each ⚠/❌ row includes the exact proposed correction (new coordinates, new path JSON, rewritten coaching text, dx/dy change, rule citation).

## Phase 3 — Your Approval Loop

After you read the report you can approve in any of these shapes:
- "Apply all ✅-approved rows" (you mark which)
- "Apply Bucket A & C only"
- "Skip these 4 slugs, apply the rest"
- "Fix this one row differently: …"

## Phase 4 — Applied Fixes (only after approval)

For approved rows I'll ship:
- A single data update via the insert tool (coords, paths, coaching text, context shifts)
- Code patches to `contextShifts.ts` / `GameIqSituation.tsx` if sport-gating or dx/dy logic needs to change
- An `iq_owner_review_log` entry per fixed situation citing the rule source
- Re-stamp `triple_check_count = 3` only after the fix lands; rows that needed correction get reset to `0` first so the count means something

## Technical notes
- No schema changes expected.
- `HOME_POS` reference for path validation: Home (50,96), 1B (78,72), 2B (50,48), 3B (22,72), Mound (50,70).
- Audit is fully read-only — safe to run immediately on approval of this plan.
- Effort: 1 turn to run all 6 audits in parallel + write the report; subsequent turns sized to whatever subset you approve.
