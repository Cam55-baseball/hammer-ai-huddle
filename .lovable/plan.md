# P0-3 Completion & Context Workstream Ratification

Close the P0 athlete-context initiative. No new doctrine, no schema, no new variables — only deeper consumption of the existing spine and verification.

## A. Daily-plan differentiation (`src/lib/hammer/prescription/dailyPlan.ts`)

**Diagnosis.** Current `builder()` only branches strength duration on `lifecycleBand`/`lowAvail` and speed on `recoverDay`. `season_phase`, `goal_summary`, `goal_horizon`, `development_priorities`, `workload`, `speedFocus`, and `equipment_effective` are read but unused in most modalities → 7 personas collapse to 4 plans.

**Patch (branching-only, no new variables).** Integrate the existing `projectEnvelope` + `selectSpeedFocus` directly inside `buildHammerDailyPlan`:

1. Speed block: drive `title/steps/durationMin/status` from `selectSpeedFocus(proj)` — distinct outputs for `deload`, `tempo_recovery`, `unilateral_symmetry`, `offseason_volume`, `inseason_freshness`, `max_velocity`, `acceleration_base`.
2. Strength block: branch sets/title on `seasonPhase` (off=volume 4×6, pre=strength 4×4, in=potentiation 3×3, post=recovery 2×8), `equipment` (`bodyweight`/`bands`/`hotel` → bodyweight template), `injuryRegions` (suppress patterns from `INJURY_BLOCKED_PATTERNS`), `workloadHigh` (auto-deload), and a `development_priorities` accessory swap (`power`→jump/throw accessory, `mobility`→mobility finisher).
3. Hitting / Throwing / Defense / Baserunning: branch volume on `seasonPhase` (off=high-volume tech, in=low-volume freshness), suppress when `injuryRegions` blocks the pattern, and add a goal-driven line in `why` (`goal_summary` + `goal_horizon`).
4. Recovery block: priority-elevated when `workloadHigh`, `seasonPhase==='in'`, or any injury region.
5. Fueling block: branch on `seasonPhase` (in=carb-forward game-day note, off=body-comp note) and on `goal_horizon`.

Each branch contributes to the plan fingerprint → 7 personas should produce 7 distinct fingerprints.

**Verification.** Re-run `scripts/audits/p0-3-decision-differentiation.ts`, regenerate `scripts/audits/evidence/p0-3-differentiation.json`, expect `uniqueDailyPlans: 7`.

## B. Speed consumer wiring (`src/hooks/useSpeedProgress.ts`)

Wire `selectSpeedFocus` end-to-end without changing the on-disk schema:

1. Accept optional `athleteContext` arg (default = `useAthleteContextEnvelope()` import) and call `projectEnvelope` → `proj`.
2. Expose new derived members from the hook: `speedFocus`, `maxEffortAllowed`, `recommendedReps`, `contextSuppressions` (built from `proj.injuryRegions`, `proj.workloadHigh`, `proj.asymmetryPct`, `proj.speedFreshness`, `proj.seasonPhase`).
3. Override `sessionFocus`/`sessionDrills` selection so that:
   - `injury` in [hamstring/ankle/knee/groin] forces tempo template.
   - `asymmetryPct > 10` forces unilateral drills.
   - `workloadHigh` or `readiness < 0.4` → break-day suggestion regardless of `detectBreakDay`.
   - `seasonPhase==='off'` → volume bias; `'in'` → freshness bias.
4. Pass through fields for acceleration/top-speed/asymmetry/workload/freshness/season influence so any consumer renders them.

Speed consumer call sites (`SpeedSessionFlow`, `speedScoring` if applicable) keep working — additive only.

## C. Ratification (`docs/asb/p0-3-decision-activation-ratification.md`)

Sections:
- **Consumer activation matrix** — Workout / Speed / Roadmap / Recommendation rows × Equipment / Injury / Lifecycle / Season / Priorities / Workload / Goals columns with ACTIVE / PARTIAL / UNUSED.
- **Differentiation evidence** — counts from the regenerated audit JSON (`uniqueDailyPlans`, `uniqueSpeedFoci`, `uniqueDrillLegalSets`, `uniqueRoadmapTops`) + 7-persona table.
- **Utilization score** — availability %, consumption %, differentiation %, adaptation %, overall.
- **Intelligence estimate** — re-estimate (target ≥60%).
- **Remaining blockers** — Elite-tier intelligence, multi-week periodization, biomechanical fusion (explicitly out of P0 scope).
- **GO/NO-GO** for closing P0 context workstream.

## D. Reality Feedback Ledger (`docs/asb/reality-feedback-ledger.md`)

- **RFL-029** → CLOSED (workout consumers consume spine; drill/video filters + rerank live; evidence rows).
- **RFL-030** → CLOSED (speed consumer wired; selectSpeedFocus drives session selection).
- **RFL-031** → CLOSED (roadmap ordering + recommendation rerank live; evidence rows).

Each entry cites the audit JSON path and ratification doc.

## E. Workstream verdict (in ratification doc, Section E)

Explicit yes/no answers:
1. Spine operational?
2. Spine consumed?
3. Outputs differentiated?
4. Organism adapts to context?
5. Workstream constitutionally closeable?
6. Remaining P0 blockers (expected: none — but list if found).

## F. Public release verdict (in ratification doc, Section F)

`GO`, `GO WITH KNOWN LIMITATIONS`, or `NO-GO`, listing only true publication blockers.

## Deliverables

- `src/lib/hammer/prescription/dailyPlan.ts` — deeper branching.
- `src/hooks/useSpeedProgress.ts` — selectSpeedFocus wiring.
- `scripts/audits/evidence/p0-3-differentiation.json` — regenerated.
- `docs/asb/p0-3-decision-activation-ratification.md` — new.
- `docs/asb/reality-feedback-ledger.md` — RFL-029/030/031 updated.
- `.lovable/plan.md` — P0 closure entry.

## Out of scope

New tables, RPCs, migrations, edge functions, UI, context variables, Elite-tier additions, multi-week periodization, biomechanical fusion.
