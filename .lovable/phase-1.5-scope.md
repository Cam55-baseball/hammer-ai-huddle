# Phase 1.5 Scope — Presentation + Reliability Candidates

**Status:** PROPOSED. Each item requires explicit per-item operator approval before implementation. No item touches MediaPipe, event detection, metric formulas, coaching logic, or constitutional doctrine. Phase 1.5 is bounded to presentation copy and surfaced reliability state.

**Gate:** Phase 1.5 is independent of Phase 2 but does NOT bypass the determinism investigation. Copy fixes can proceed in parallel; reliability fixes that touch the analyze pipeline wait for the investigation to identify root cause.

---

## Item 1 — Thumbnail-failed error message (`copy` + `bug`)

**Current:** `src/pages/AnalyzeVideo.tsx:407-417` surfaces a 5s toast: `"Thumbnail generation failed: <error.message>"`. Thumbnail failure does NOT block analysis — the rest of the pipeline continues.

**Proposed:** Replace with: `"We couldn't generate a preview thumbnail for this video, but your analysis is still running normally."` Remove the raw error message from user-facing copy; keep it in `console.error` for ops. Optionally make the toast 3s instead of 5s.

**Files touched:** `src/pages/AnalyzeVideo.tsx` only.

**Risk:** None. Copy-only change.

---

## Item 2 — Confidence % under 1-2-3-4 circles (`ux` + `copy`)

**Current:** Number line with circles for phases 1–4 renders percentages underneath. **The AI has not yet traced what the % represents in code** — that's a prerequisite step.

**Proposed Phase 1.5 work:**
1. **First** (no UI change): trace the data source. Read `src/components/report-card/` to find the component, identify the field, document in this scope file.
2. **Then** present operator with options: (a) model confidence, (b) athlete-vs-elite score, (c) phase completeness, (d) something else.
3. **Then** rename the label to match the chosen meaning. No formula change.

**Files touched (step 1):** read-only. Steps 2–3 wait for operator decision.

**Risk:** None at step 1. Steps 2–3 are pure relabel.

---

## Item 3 — "Analysis complete with nothing then more appears" (`bug` + `ux`)

**Current:** `AnalyzeVideo.tsx:492-494` calls `setAnalysis(analysisData)` then fires the toast. No realtime subscription visible in this file, but a parent or sibling may subscribe to `videos` / `ai_analysis` table changes.

**Proposed Phase 1.5 work:**
1. Capture a Network panel trace + console log during a repro.
2. Identify whether a second `analyze-video` response arrives, or whether a separate fetch / realtime event repopulates state.
3. Document in `.lovable/determinism-investigation.md` §6 (partial-render probe).
4. Decide fix only after root cause is known.

**Files touched:** investigation only at this stage.

**Risk:** None until fix is scoped.

---

## Item 4 — P2 knee-lift explainer copy fix (`copy`)

**Current:** Explainer says "Early = drifts forward." Operator: this is wrong — drift forward is a P1 fail, being early in P2 is rewarded.

**Proposed:** Locate the P2 knee-lift `ReportCardTileSpec.explainer` and replace the offending sentence. The explainer schema is shown in `src/components/report-card/hammer/TileExplainerSheet.tsx`: `whatWhy`, `howToImprove`, `encouragement`.

**Proposed replacement (operator to sign off on exact wording):**
- `whatWhy`: "Knee lift sets the timing window for everything that follows. Reaching peak lift early is rewarded — it gives the hands time to load without rushing the rest of the move."
- Operator needs to confirm wording before merge.

**Files touched:** wherever the P2 knee-lift contract lives (likely `src/lib/reportCard/contracts/` analogous to `bp.contract.ts`). AI to locate at implementation time.

**Risk:** None. Copy-only.

---

## Item 5 — Hands-outside-shoulders "wall drill" copy rewrite (`copy`)

**Current:** `howToImprove` says "Wall drills with a target outside of shoulders." Operator: nobody understands this.

**Proposed:** Operator owns the replacement text. AI proposes a placeholder for sign-off: "Set up against a wall in your stance. At landing, your hands should be loaded behind your back shoulder — not drifted out toward the pitcher. Have a coach or training partner watch from the catcher's view to confirm."

**Files touched:** the hitting hands-outside-shoulders tile spec.

**Risk:** None. Copy-only.

---

## Item 6 — Sequencing "subtle pauses" framing (`copy`)

**Current:** Sequencing explainer doesn't address what sequencing looks like at game tempo.

**Proposed addition (operator to sign off):** "In game tempo the pauses are subtle and rarely visible to a spectator. The point is not to be rushed and not to fire everything at once. That separation, even when it's quick, is the mark of an elite hitter."

**Files touched:** sequencing tile spec.

**Risk:** None. Additive copy.

---

## Item 7 — Finish-and-balance copy fix (`copy` half of issue #8)

**Current:** Explainer suggests "2-hand finish hold." Operator: wrong — what matters is two hands through contact and extension until the ball is gone, not a held 2-hand finish position.

**Proposed:** Replace "2-hand finish hold" with: "Keep both hands on the bat through contact and stay extended until the ball is completely gone. A held two-hand finish pose afterward isn't required — what matters is staying connected through the hit."

**Files touched:** finish-and-balance tile spec.

**Risk:** None. Copy-only.

**Note:** The deeper methodology question — what's the pose-derivable definition — is Phase 2 (issue #8 methodology half).

---

## Item 8 — Honest failure-state surface (`reliability` surface only)

**Current:** When `analyze-video` returns successfully but with empty `violations` / no metrics, the UI still shows "Analysis complete!" with empty tiles. Operator: "measured absolutely nothing" feels broken.

**Proposed Phase 1.5 surface-only change:** When the response payload has no measurable metrics, render an explicit empty state: "Analysis ran but couldn't measure the required moments — likely camera angle or video quality. Try a side-view recording in good light." Add a "Try again with a different video" CTA. Do NOT attempt to fix the root cause here — that's Phase 2 issue #10 + #12.

**Files touched:** `src/pages/AnalyzeVideo.tsx` render branch + report-card empty-state component.

**Risk:** None on root cause; this only changes what the user sees when analysis returns empty.

---

## Items NOT in Phase 1.5

The following are explicitly **out of scope** for Phase 1.5 and routed to Phase 2 (which requires separate authorization after the determinism investigation closes):

- Issue #7 — back elbow at contact reframing (methodology)
- Issue #8 methodology half — pose-derivable finish-and-balance definition
- Issue #9 — bat path vs on-plane % disambiguation
- Issue #10 — per-failure diagnostic for undetected metrics (requires landmark pipeline)
- Issue #11 — bat speed / time-to-contact replacement (requires pose landmarks)
- Issue #12 root-cause fix — the underlying reason analysis sometimes returns nothing
- Issue #13 — same-video inconsistency root cause and fix (gated on determinism investigation)

---

## Implementation order if approved

Recommended order (each is independent — operator can approve in any order):

1. Items 1, 4, 5, 6, 7 — pure copy, lowest risk, fastest.
2. Item 8 — small UX addition, no pipeline change.
3. Item 2 step 1 — read-only trace of confidence % source.
4. Item 3 — investigation, no UI change.
5. Item 2 steps 2–3 — after operator picks meaning.

**No batch ships without per-item sign-off.** AI will surface a draft of each before merge.
