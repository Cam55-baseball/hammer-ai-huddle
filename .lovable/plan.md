# Phase 1 Determinism — Evidence Collection Plan

No code, schema, prompt, infrastructure, or metric changes. Evidence-only. Wait gate, then query, then verdict.

## Gate
Hold until you confirm the Phase 1 Runtime Evidence Runbook upload pass is complete (12 uploads + cross-device audit). Nothing runs before that signal.

## What I will collect (read-only)

For each of the 12 runbook uploads, pull the real row set:

1. `video_analysis_runs` — `cache_fingerprint_hex`, `cache_hit`, `video_sha256_hex`, `fps_true`, `landmark_model_version`, `detector_version`, `metric_engine_version`, `frame_selection_jsonb`, `event_selection_jsonb`, `confidence_summary_jsonb`, `outcome`, `outcome_reason`, timestamps, `requested_by`.
2. `video_frame_extractions` — per-frame `sha256_hex`, `frame_index`, `timestamp_seconds`, browser/device fingerprint if present.
3. `video_landmark_runs`, `video_event_runs`, `video_metric_runs`, `video_coaching_runs` — run ids, version pins, output hashes, durations.
4. Edge logs for `analyze-video` covering the upload window — request ids, model id actually used, seed value, retry events, partial-result emissions, error traces.
5. `videos` rows for the 12 uploads — file size, mime, upload device, duration.

## Comparisons performed (evidence, not theory)

For each repeated upload of the same source file:

- **Bytes identical?** Compare `video_sha256_hex` across runs.
- **Probe identical?** Compare `fps_true`, duration, calibration inputs.
- **Cache key identical?** Compare `cache_fingerprint_hex`.
- **Frame extraction identical?** Compare per-`frame_index` `sha256_hex` across runs and across devices.
- **Event selection identical?** Diff `event_selection_jsonb`.
- **Metric output identical?** Diff `confidence_summary_jsonb` and metric run output hashes.
- **Coaching output identical?** Diff coaching run output hashes; record AI model id + seed actually used per call.
- **Cache behavior correct?** Confirm second upload of identical bytes produced `cache_hit=true` and returned the cached run id, not a new compute.
- **Partial-result race?** Scan edge logs + client console for "analysis complete" emissions followed by later writes to the same run.

## Stage classification matrix (filled from measurements)

13 pipeline stages from `.lovable/determinism-investigation.md`, each labeled with **measured** verdict:

- deterministic — identical inputs produced identical output bytes across every observed run
- non-deterministic — identical inputs produced differing output bytes in ≥1 observed pair, with the differing field named
- unknown — coverage gap, insufficient samples, or evidence missing; explicitly flagged so it is not silently treated as deterministic

## Root-cause ranking

Ordered by **measured downstream blast radius** (how many later stages diverged because of it), not by suspicion. Each entry cites the specific run-id pairs and the field that diverged.

## Deliverables

1. `.lovable/phase-1-evidence-package.md` — raw query outputs, comparison tables, per-upload run-id map, cross-device diffs, edge-log excerpts. Append-only record of what the database actually said.
2. `.lovable/determinism-investigation.md` — finalized: every stage moved from "suspected" to one of {deterministic, non-deterministic, unknown} with the supporting run-id pair cited inline. Open questions either answered or re-tagged "unknown — needs further uploads of type X".
3. Verdict block appended to `.lovable/plan.md`:
   - **A. Determinism sufficiently proven for Phase 1 acceptance** — every stage classified deterministic or unknown-with-acceptable-coverage, zero measured non-deterministic stages on identical inputs; OR
   - **B. Determinism not proven** — ordered list of blocking defects, each with run-id pair, diverging field, and stage. No fix proposals. No redesigns.

## Out of scope (explicitly)

No fixes. No metric redesign. No MediaPipe work. No Phase 1.5 implementation. No prompt edits. No schema edits. No code edits. No infrastructure changes. No new planning documents beyond the three deliverables above.

## Next signal I need from you

Reply when the upload pass is complete (or partially complete with a stop-line) so I can run the queries against real rows.
