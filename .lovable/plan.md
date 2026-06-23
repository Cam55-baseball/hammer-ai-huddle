# Phase 44 — Trusted Release Implementation Plan

## Deliverable
Create exactly one file: `.lovable/phase-44-trusted-release-implementation.md`.

No source edits. No new metrics, detectors, architecture, doctrine, or measurement systems. Pure audit-and-decision document building directly on Phase 43 (`.lovable/phase-43-trust-first-measurement-release-audit.md`) and the provenance findings already established (bat_speed / time_to_contact / on_plane_pct / bat_path_score are LLM-derived via `src/lib/reportCard/reportCardContracts.ts`).

## Evidence Sources (read-only sweep before writing)
- `src/lib/reportCard/contracts/bp.contract.ts` (already in context)
- `src/lib/reportCard/contracts/bh.contract.ts`
- `src/lib/reportCard/contracts/throwing.contract.ts`
- `src/lib/reportCard/reportCardContracts.ts` (LLM prompt source for hitting metrics)
- `src/lib/biomech/pipeline/tempoPipeline.ts` + `src/lib/biomech/metrics/*` + `src/lib/biomech/anchors/*` + `src/lib/biomech/detectors/plantDetector.ts`
- `src/lib/biomech/pose/poseRunner.ts` (Phase 42B D-POSE)
- `src/components/report-card/UhrcReportCard.tsx`, `UhrcAthleteSection.tsx`, `BhCategoryPanels.tsx`
- `src/lib/uhrc/buildReport.ts` + `src/lib/uhrc/types.ts` (pillar → contribution wiring)
- Anything under `src/components/report-card/` and coaching pathways consuming `bh.*` / `bp.*` metric keys (grep for the metric keys listed in §2)
- Prior audits: `.lovable/phase-43-...md`, `.lovable/bat-path-vs-on-plane-definitions.md`, `.lovable/time-to-contact-vs-power.md`, `.lovable/confidence-source-trace.md`

## Document Structure (10 required sections)

**§1 Measurement-Backed Metric Inventory** — Enumerate metrics whose values originate from pose landmarks / anchors / detectors / deterministic biomech math. Anchored by `runTempoPipeline` (real anchor → detector → metric → evidence chain) and the pose-derivable angle/time metrics in `bp.contract.ts`. Expected set: `tempo_sec`, `shoulder_tilt_deg`, `head_vertical_movement_pct`, `premature_shoulder_open_deg`, `energy_angle_deg`, `head_at_release_deg`, `lift_thrust_deg`. Each entry cites file:line for the derivation path and notes whether the path is fully wired today vs. wired-but-pose-stub-gated.

**§2 Non-Measurement Metric Inventory** — Every metric whose number is parsed from LLM JSON output (`reportCardContracts.ts` prompts). Explicitly: `bat_speed_contact_mph`, `time_to_contact_ms`, `on_plane_pct`, `bat_path_score_100`, plus any `bp` metrics that still depend on LLM visual estimation when D-POSE is unavailable. Cite source file:line and dependency chain (prompt → tool call → metrics column → tile).

**§3 Release-1 Visibility Matrix** — Table: every athlete-facing metric → {VISIBLE | HIDDEN | SHOWCASE FUTURE}. No "undecided." Default rule: §1 → VISIBLE; §2 physics-velocity/collision → HIDDEN; calibration-blocked but pose-derivable (e.g. `stride_pct_of_height`, `glove_drift_outside_frame_in`) → SHOWCASE FUTURE.

**§4 Report Card Changes** — Concrete list of UI surfaces affected: BH category panels (`BhCategoryPanels.tsx`), UHRC pillar contributions whose `signal_id` resolves to a hidden metric (`buildReport.ts`), tile components, trend charts, biggest-leak/biggest-win summaries, lineage drilldown rows. For each, state the required change: hide tile, suppress contribution (mark missing rather than scoring), recompute pillar denominator, drop trend line, or rewrite explanation copy.

**§5 Coaching-System Impact** — Coaching/recommendation pathways that read hidden metric keys: PIE V2 hitting aggregates, drill recommendations keyed off `bat_path_score_100` / `on_plane_pct`, any video-suggestion surface, HammerDailyPlan remediation anchors. List required updates (remove key from input set, rebalance weighting, fall back to measurement-backed signal).

**§6 Universal Analysis Package** — Concrete Release-1 athlete experience: the visible metric set (§1 ∩ VISIBLE), the surviving explanation/recommendation copy, surviving trend systems, what the report card looks like after §4. This is the canonical Release-1 surface contract.

**§7 Trust Risk Removal** — Athlete-facing outputs being removed: each hidden tile, each derived score/ranking/explanation that consumed a hidden input, each recommendation that can no longer be defended. One row per removed surface with the trust justification.

**§8 Remaining Measurement Gaps** — Inventory only (no implementation): bat tracking (D-OBJECT), object/ball tracking, velocity systems, pixel-to-physical calibration (D-CAL), athlete-height calibration, true-fps verification. Each gap names the metrics it would unlock from §3 SHOWCASE FUTURE.

**§9 Release Readiness Determination** — Evidence-backed yes/no on whether Hammers can ship a trustworthy biomechanics-only product after §4–§7 are executed. Expected answer: yes, conditional on (a) the D-POSE → anchor → metric chain producing real values on Release-1 metrics, (b) hidden metrics fully removed not merely visually suppressed, (c) UHRC pillar math recomputed to ignore hidden contributions.

**§10 Final Release Inventory** — Authoritative Release-1 athlete-facing measurement package: the final ordered metric list, the discipline each belongs to (BP/BH/throwing), and the surface(s) each appears on. This becomes the lock for Release 1.

## Constraints Restated
Single new file. No code edits. No new metrics/detectors/architecture/doctrine. Audit + decision matrix + final inventory only.
