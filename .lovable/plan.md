# Plan — Four-Document Triage + Dedicated Determinism Investigation

No code changes, no migrations, no edge function changes, no metric work. Four documents only. After you approve, I write them and stop.

## What gets written

### 1. `.lovable/plan.md` — Phase 1 closeout
Append a "Phase 1 Verdict" section: **B. Not accepted**, with one blocking defect (`BLOCKER-1: same fixture produced inconsistent analysis results across runs`). All other feedback items deferred to the triage backlog. Phase 2 authorization explicitly gated on the determinism investigation completing first.

### 2. `.lovable/feedback-triage.md` — structured backlog
Every bullet from your feedback message becomes a tagged row: current behavior (with file:line references already gathered from `src/pages/AnalyzeVideo.tsx`, `supabase/functions/analyze-video/index.ts`, `src/lib/biomech/`), your stated concern, decided methodology (where you already answered), open questions (where you didn't), recommended track. Tags: `copy` / `methodology` / `reliability` / `ux` / `measurement-trust` / `bug` / `governance`. Includes the methodology decisions you already locked in (contact = bat-ball intersection; launch = full foot plant when in sequence, hands-start otherwise; bat speed → hand speed at launch; time-to-contact → ms at known fps; hands-outside-shoulders → per-failure diagnostic).

### 3. `.lovable/phase-1.5-scope.md` — presentation + reliability candidates
Eight items, each with proposed copy or fix approach, ready for per-item sign-off: P2 knee-lift copy fix, wall-drill rewrite, sequencing "subtle pauses" framing, finish-and-balance copy, thumbnail error message, partial-render bug investigation, confidence-% labeling (after I document its current meaning in code), failed-analysis honest surface. No item ships without your explicit per-item approval.

### 4. `.lovable/determinism-investigation.md` — dedicated investigation (your new requirement)

Evidence-only. No fixes. Structure:

**Pipeline stages classified `deterministic` / `non-deterministic` / `unknown`** based on code reading already completed:

| Stage | Classification | Key finding |
|---|---|---|
| Cache fingerprint build | deterministic | Phase 0 verified |
| Frame selection (timestamps) | deterministic | Phase 0 verified |
| Frame extraction (pixels) | **non-deterministic — suspected** | Browser seek precision is codec-dependent; `canvas.toBlob('image/png')` encoder bytes vary by browser |
| Cache lookup | deterministic | Pure fingerprint key |
| AI call (Gemini 2.5 Flash) | **non-deterministic — confirmed risk** | (a) `seed: stableSeed(videoId)` — seed differs across uploads of identical bytes; (b) `google/gemini-2.5-flash` is an unpinned moving alias; (c) multimodal at `temperature=0` is not bit-deterministic |
| Response persistence | deterministic | Pure write |
| Landmark / event / metric stages | n/a — not yet wired | Versions are `0.0.0-stub` |
| Render | deterministic given upstream | — |

**Specific concerns addressed:**
- **Async race conditions:** Suspected cache-miss race — two near-simultaneous uploads both miss the lookup, both call AI with different seeds, second writer wins.
- **Multiple analysis paths:** Confirmed — initial-upload path (`AnalyzeVideo.tsx:335,461`) and retry path (`:529,568`) are physically separate; retry re-extracts frames, re-exposing any browser-seek variance.
- **Partial render:** User-reported, not yet measured; needs Network capture during a "complete with nothing" event.
- **Identical inputs → non-identical outputs:** Cache-hit path is deterministic. Cache-miss path can diverge via AI provider variance and seed-derived-from-videoId.

**Evidence still required (read-only, no implementation):**
1. Compare `video_frame_extractions.sha256_hex` tuples across runs 1, 11, 12.
2. Compare `ai_analysis` payload hashes across all 12 runs.
3. Capture `analyze-video` edge logs and confirm seed values logged.
4. Cross-device frame hash comparison (desktop vs mobile, same fixture).
5. Manual race-condition probe (two tabs, same upload, near-simultaneous).
6. Partial-render network capture.

**Tentative ranking of variance sources:** AI provider > browser encoder > race window > probe variance.

**Explicit non-goals:** no model pin, no encoder swap, no landmark pipeline, no mutex, no seed change, no metric redesign. Each is a separate decision gated on the evidence above.

---

## What does NOT happen

- No edits to `analyze-video/index.ts`.
- No edits to `frameExtraction.ts`, `fingerprint.ts`, or anything under `src/lib/biomech/`.
- No new tables, no migrations, no RLS changes.
- No Phase 2 metric work, no MediaPipe, no copy changes to user-facing surfaces yet.
- The investigation document does **not** prescribe fixes; it only classifies stages and lists the live evidence required to tighten each `unknown` to a definitive classification.

## After you approve

I create the four files, then stop. Next operator action is running the Phase 1 runbook so I can fill in the live-evidence section of the determinism investigation. No metric redesign begins until that section is complete and you authorize.

---

# Phase 1 Verdict — 2026-06-17

## B. Phase 1 NOT accepted

### Blocking defects

1. **BLOCKER-1: Same fixture produced inconsistent analysis results across runs.** Operator reported during the Phase 1 evidence pass that uploading the same source video multiple times produced different downstream analysis output. This violates the Phase 1 determinism contract regardless of whether the frame-extraction layer itself is byte-deterministic, because downstream analysis (currently a multimodal AI call) is the constitutional source of user-visible truth and is observably non-replay-safe. Live evidence required to localize the variance to a specific pipeline stage is enumerated in `.lovable/determinism-investigation.md` (§ "Evidence Still Required").

### Other feedback items

All other operator feedback (copy fixes, methodology questions, untrustworthy metrics, "measured nothing", thumbnail error wording, sequencing narrative, finish-and-balance redefinition, hands-outside-shoulders detection, bat-speed/time-to-contact replacement, partial-render bug, confidence-% labeling) is captured in `.lovable/feedback-triage.md` and routed to either Phase 1.5 (`.lovable/phase-1.5-scope.md`) or Phase 2 (pending authorization).

### Phase 2 gate

**Phase 2 metric redesign is NOT authorized to begin until `.lovable/determinism-investigation.md` reaches a definitive root-cause classification.** New metrics built on a pipeline that returns different outputs for identical inputs will inherit that variance. The investigation is evidence-only at this stage — no fixes, no model pin, no encoder swap, no mutex — and unblocks Phase 2 only after the operator authorizes the corresponding fixes that the investigation surfaces.

### Documents created in support of this verdict

- `.lovable/feedback-triage.md` — structured backlog of every feedback bullet with tag, current behavior, decided methodology, open questions, and recommended track.
- `.lovable/phase-1.5-scope.md` — eight presentation + reliability candidates with per-item proposed approach, awaiting per-item operator sign-off.
- `.lovable/determinism-investigation.md` — dedicated investigation: pipeline stages classified `deterministic` / `non-deterministic` / `unknown`, six live-evidence queries enumerated, fixes explicitly out of scope.
