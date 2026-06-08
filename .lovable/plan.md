# Analysis Engine, Report Card System & Correction Engine Ratification

This sprint is **audit-first, additive, and constitutionally bounded**. Nothing about the existing analysis pipeline, subscription gating, or upload flow changes. The Report Card is added as a new tab on the analysis result page — the current technical analysis becomes the "Technical View" behind that toggle.

Every decision in this plan reflects an explicit answer you gave. Where I am still uncertain, I will stop and ask before writing code.

---

## 1. The audit (Deliverable: `docs/asb/analysis-formula-ratification.md`)

Before any code touches the codebase, I will publish a single audit document that **proves**, file-by-file, the current state of every analysis system. Format per system:

| System | Inputs | Measurements | Tags | Scoring | Recommendations | Drills | Videos | Roadmap |
|---|---|---|---|---|---|---|---|---|

Coverage:

- **Baseball Pitching** — confirmed present: `src/data/baseball/pieV2Signals.ts` + `src/lib/pieV2/scoring.ts` (Energy Angle 25°/≥18°, Visual Stability, Hip/Shoulder Separation, Tempo ≤1.05s/≤1.20s, Stride Length Efficiency, Posture, Front Side, Head Direction, Shoulder Plane, Rear Foot Drag — 11 standards mapped). Drill catalog `pieV2DrillCatalog.ts`, video catalog `pieV2VideoCatalog.ts`, aggregate `aggregate.ts`, longitudinal `longitudinal.ts`. Audit will show **per-standard** which file consumes it.
- **Baseball/Softball Hitting** — confirmed present: `src/lib/hittingPhases.ts` + `hittingCausalChains.ts` (P1 Hip Load NN / P2 Hand Load / P3 Stride+Landing / P4 Hitter's Move NN), with full athlete + coach causal chain (trigger / cause / mechanism / result / fix) and 4-step roadmaps per phase. Audit will show the conflict with `src/lib/formulaPhases.ts` (`p2_heel_plant`, `p3_launch`) used by Video Library tagging.
- **Throwing** — confirmed gap: only phase tags exist (`THROWING_PHASES` in `formulaPhases.ts`), **no measurement standards, no formula, no per-phase scoring**.
- **Softball Pitching** — confirmed gap: no equivalent of PIE V2 exists. Deferred (you will provide standards).
- **UHRC** — confirmed misalignment: `src/lib/uhrc/` produces a cross-discipline pillar projection (mechanics/command/stuff/movement_quality/decision_quality/durability) over PIE V2 + HIE + foundation. Not the per-analysis report card you want. **Will be removed.**

Output: one ratification document the user signs off on before any phase below executes.

---

## 2. Locked decisions (from your answers)

1. **Hitting canonical phases:** P1 Hip Load · P2 Hand Load · P3 Stride+Landing (heel plant lives here) · P4 Hitter's Move. `formulaPhases.ts` will be migrated to match `hittingPhases.ts`. Tagged-video remap: `p2_heel_plant → p3_stride`, `p3_launch → p4_hitters_move`.
2. **Scope this sprint:** Baseball Pitching · Baseball Hitting · Softball Hitting · Baseball Throwing · Softball Throwing report cards. Softball Pitching deferred until you provide its standards.
3. **Throwing formula:** New registry built from the 7 standards you just gave (Eyes on Target at peak leg lift, Hips fire / shoulders closed, Stride length ≥100% height + consistency, Head stable vertical movement ≤2%, Hips in line with target, Front-side glove control within body frame, Head ≤15° off belly-button at release, Shoulders horizontal ≤10° at release). Applies to baseball + softball throwing identically until you say otherwise.
4. **Correction engine:** Hybrid. Registry holds canonical facts (what happened / why it matters / how it affects performance / how to fix / drill ids / video ids / roadmap step). AI writes **only** the motivational paragraph, generated once per analysis, cached on the analysis row, never regenerated (replay-safe).
5. **Routing:** Additive. Subscription + selected analysis type stays as-is. Report Card surfaces as a new **tab** on the analysis result page.
6. **Athlete vs Technical:** Athlete View is new (parent-friendly). Technical View = the existing PIE V2 / hitting causal page rendered as-is.
7. **UHRC:** Deleted. Surfaces that import it get removed or replaced with a link to the most recent per-analysis report card.
8. **Display formats:** Engine proposes a per-category table in the audit doc; you ratify each row before UI is built.

---

## 3. Execution phases

Phases A–F run **in order, gated on your sign-off** of the preceding deliverable. No phase begins until you say "proceed."

### Phase A — Audit + ratification document (no code)
- Write `docs/asb/analysis-formula-ratification.md` with the full per-system mapping table above.
- Include the proposed Display Format Table (per category: degrees / seconds / pass-fail / % / 1–10) with checkbox column for your ratification.
- Append a "Conflicts & Gaps" section listing the hitting phase conflict, throwing formula gap, softball pitching gap, UHRC misalignment.
- **You sign off** before Phase B.

### Phase B — Constitutional cleanup (additive deletions only)
- Remove UHRC: `src/lib/uhrc/`, `src/components/report-card/Uhrc*.tsx`, UHRC routes, UHRC consumers on Command Center.
- Replace consumer sites with a small "Open latest report card" affordance pointing at the per-analysis report card route (which lands in Phase E).
- Update `mem://` and RFL ledger.

### Phase C — Hitting phase migration
- Make `hittingPhases.ts` the single source of truth.
- Rewrite `formulaPhases.ts` HITTING_PHASES to: `p1_hip_load`, `p2_hand_load`, `p3_stride`, `p4_hitters_move`.
- Data migration for `library_videos.formula_phases`: `p2_heel_plant → p3_stride`, `p3_launch → p4_hitters_move`. Old ids preserved in an `asb_event_lineage` migration record so replay equivalence holds.
- Edge function mirror `supabase/functions/_shared/hittingPhases.ts` updated in lockstep.

### Phase D — Throwing formula registry (new)
- New `src/data/baseball/throwingV1Signals.ts` (shared with softball throwing) encoding the 7 standards you gave, with `target`, `acceptable`, `measurement`, `purpose`, `common_deficiencies`, `root_causes`, `teaching_progression`, `composite_weight` per signal — same shape as pitching's `PIE_V2_SIGNALS` so we get scoring/replay/lineage for free.
- New `src/lib/throwingV1/` modeled exactly on `pieV2/` (types, scoring, aggregate, persist, finalize). Engine pinned at `THROWING_V1_ENGINE_VERSION`.
- Drill + video catalog references reuse existing pools; gaps surface via `MissingnessChip`.

### Phase E — Correction Engine extension (registry + AI motivational)
- Extend each signal definition (pitching, hitting phases, throwing) with a `correction` block: `{ what_happened, why_it_matters, how_it_affects_performance, how_to_fix, drill_ids[], video_ids[], roadmap_step }`. All hand-written, version-pinned, replay-safe.
- New table `analysis_correction_cache` (analysis_id, signal_id, motivational_text, model_id, prompt_hash, created_at) with RLS + GRANTs per project rules. Cache key includes `engine_version` so a re-score invalidates.
- New edge function `generate-correction-motivation` (Lovable AI gateway, free Gemini tier). System prompt is grounded **exclusively in the registry block** for that signal — model writes the motivational paragraph only, no fact authoring. Output cached and never regenerated.
- Replay invariant: registry facts always present even if AI is unavailable; motivational paragraph renders missingness chip when uncached.

### Phase F — Report Card UI (per analysis, Athlete + Technical toggle)
- New route segment `report-card` mounted as a **tab** on the existing analysis result page (no change to upload, subscription, or routing).
- New component `src/components/report-card/AnalysisReportCard.tsx` with:
  - **Athlete View** (default): elite/simple/parent-friendly. Per-category card uses the display format ratified in Phase A (raw value + 1–10 + pass/fail badge as applicable). Tap a category → drawer with What/Why/How/Fix/Drills/Videos/Roadmap + motivational paragraph.
  - **Technical View**: renders existing PIE V2 aggregate page (pitching) or existing hitting causal chain page (hitting) untouched.
- Per-discipline report card components: `BaseballPitchingReportCard`, `BaseballHittingReportCard`, `SoftballHittingReportCard`, `BaseballThrowingReportCard`, `SoftballThrowingReportCard` — thin variants over a shared `<ReportCardShell>` that picks signals from the right registry.
- Every category card carries `<LineageDrilldownButton>` + `<ConfidencePill>` + `<MissingnessChip>` (existing components). Every drill/video CTA deep-links to the existing drill/video surface.

---

## 4. What I will NOT do without further direction

- **Softball Pitching report card** — waiting on standards.
- **Position-conditional pitcher vs catcher vs infielder report cards** for throwing — current plan ships one Throwing report card; specialization can be a follow-up.
- **AI authoring of any fact** (what/why/how/fix/drills/videos/roadmap). AI writes the motivational paragraph only.
- **Any change** to subscription gating, upload flow, analysis type selection, or scoring math.
- **Any new ASB topic** beyond what each registry naturally already implies.

---

## 5. Open questions I still expect to ask before/during execution

1. **Display Format Table review.** I will draft it in the Phase A doc and stop for your row-by-row ratification.
2. **Throwing — pitcher-only standards vs all-positions.** Your standards mention "extension to the plate" which is pitcher-specific. Should the Throwing Report Card branch by position (pitcher vs catcher vs infielder vs outfielder), or is one universal throwing card correct for v1?
3. **Hitting Slap vs Standard variants.** Existing `hittingPhases.ts` has slap-style variants (`SlapEliteSignals`, `evaluateSlapEliteGates`). Should the Hitting Report Card auto-switch when slap context is detected, or always show standard?
4. **Motivational tone.** Single coaching voice across all sports, or per-sport voice (e.g. softball hitting different from baseball hitting)?
5. **Tagged-video remap fallback.** If a video is tagged `p3_launch` and you want it on Hitter's Move, that is the safe map — but is there ANY existing video tagged `p2_heel_plant` that you intend to live on Stride (as your "stride creates foot plant" note implies)? I'll list every affected video before migrating so you can spot-correct.

---

## Deliverables

- `docs/asb/analysis-formula-ratification.md` (Phase A — full audit + display format table)
- `docs/asb/reality-feedback-ledger.md` (RFL entries per phase)
- `.lovable/plan.md` (execution note)
- Code in Phases B–F, each gated on your "proceed" between phases

## Exit criteria

- Every pitching, hitting, and throwing standard you have ever stated is mapped to a file with a target/acceptable band.
- Hitting phase taxonomy is single-source-of-truth.
- UHRC is removed.
- Throwing has a real formula registry with replay-safe scoring.
- Every analysis result page shows a Report Card tab with Athlete View / Technical View toggle.
- Every category exposes lineage, confidence, missingness, and a complete correction loop (facts from registry, motivational paragraph from cached AI).
- No silent guessing; every uncertainty surfaced as a chip or a missingness state.
